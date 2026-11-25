/**
 * Statki (Battleship) - rozszerzona wersja
 *
 *  - ręczne rozstawianie floty (klik: postaw / przenieś, R lub PPM: obrót) + losowanie
 *  - poziomy: Łatwy, Normalny (szachownica), Trudny (mapa prawdopodobieństwa, bez oszustw), Cheater
 *  - zasady: Klasyczne (strzał po trafieniu), Bez dodatkowego ruchu, Salwa
 *  - osie A-J / 1-10, współrzędne w logu (np. D8), lista floty z ikonami
 *  - efekty (plusk, wybuch, wstrząs), kadłuby statków, dźwięk zatopienia, wibracje
 *  - sterowanie klawiaturą (strzałki + Enter) i potwierdzanie strzału na telefonie
 *  - statystyki i osiągnięcia zapisywane w store
 */

const BOARD_SIZE = 10;
const SHIPS_CONFIG = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
const COL_LABELS = 'ABCDEFGHIJ';

const coord = (x, y) => `${COL_LABELS[x]}${y + 1}`;

// Elementy DOM
const battleshipContainer = document.getElementById('battleshipContainer');
const btnFullscreen = document.getElementById('btn-fullscreen');
const playerGrid = document.getElementById('player-grid');
const computerGrid = document.getElementById('computer-grid');
const btnRandomize = document.getElementById('btn-randomize');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const logContent = document.getElementById('game-log');
const turnStatus = document.getElementById('turn-status');
const difficultySelect = document.getElementById('difficulty-select');

// Elementy dodawane przez skrypt
let btnRotate = null;
let btnClear = null;
let rulesSelect = null;
let confirmShotEl = null;
let playerTracker = null;
let enemyTracker = null;

// Klucze zapisu
const STATS_KEY = 'endixendi:battleship:stats';
const ACH_KEY = 'endixendi:battleship:ach';
const DIFF_KEY = 'endixendi:battleship:difficulty';
const RULES_KEY = 'endixendi:battleship:rules';
const CONFIRM_KEY = 'endixendi:battleship:confirm';

const DIFFICULTIES = [
    ['easy', 'Łatwy'],
    ['medium', 'Normalny'],
    ['hard', 'Trudny'],
    ['cheater', 'Cheater']
];
const DIFF_NAMES = Object.fromEntries(DIFFICULTIES);

const RULES = [
    ['classic', 'Klasyczne'],
    ['noextra', 'Bez dodatkowego ruchu'],
    ['salvo', 'Salwa']
];

// Stan Gry
const gameState = {
    active: false,
    over: false,
    playerTurn: true,
    playerShips: [],
    computerShips: [],
    playerHits: 0,      // trafienia komputera w naszą flotę
    computerHits: 0,    // nasze trafienia we flotę komputera
    totalSegments: SHIPS_CONFIG.reduce((a, b) => a + b, 0),
    botQueue: [],
    lastHit: null,
    huntDirection: null,
    difficulty: 'easy',
    rules: 'classic',
    shotsLeft: 1
};

// Rozstawianie floty
const placement = { selected: null, horizontal: true, hover: null, preview: [] };

// Statystyki bieżącej partii
let gm = newGm();

let botTimer = null;
let aim = null;                 // pole wybrane do potwierdzenia strzału
const kbd = { x: 0, y: 0 };     // kursor klawiatury na planszy wroga

// Dźwięki
const audio = {
    music: new Audio("assets/sounds/statki/battle-bg.mp3"),
    hit: new Audio("assets/sounds/global/hit.mp3"),
    splash: new Audio("assets/sounds/global/drop.mp3"),
    win: new Audio("assets/sounds/global/success.mp3"),
    lose: new Audio("assets/sounds/global/gameover-sad.mp3"),
    sunk: new Audio("assets/sounds/global/explosion.mp3")
};
const EFFECT_KEYS = ['hit', 'splash', 'win', 'lose', 'sunk'];

// Głośność startowa pochodzi z suwaków w battleship.html (atrybut value)
const musicSlider = document.getElementById('volume-music');
const effectsSlider = document.getElementById('volume-effects');
EFFECT_KEYS.forEach(k => { audio[k].volume = effectsSlider ? parseFloat(effectsSlider.value) : 0.3; });
audio.music.loop = true;
audio.music.volume = musicSlider ? parseFloat(musicSlider.value) : 0.1;

if (musicSlider) {
    musicSlider.addEventListener('input', () => {
        audio.music.volume = musicSlider.value;
    });
}
if (effectsSlider) {
    effectsSlider.addEventListener('input', () => {
        EFFECT_KEYS.forEach(k => { audio[k].volume = effectsSlider.value; });
    });
}

/* --- ZAPIS (bezpieczny, gdy storage.js nie jest załadowany) --- */

function safeGet(key) {
    try { return typeof store !== 'undefined' ? store.get(key) : null; } catch (e) { return null; }
}

function safeSet(key, value) {
    try { if (typeof store !== 'undefined') store.set(key, value); } catch (e) { /* brak zapisu */ }
}

function loadJSON(key, fallback) {
    try {
        let v = safeGet(key);
        if (v === null || v === undefined || v === '') return fallback;
        if (typeof v === 'string') v = JSON.parse(v);
        if (typeof v === 'string') v = JSON.parse(v);
        return (v && typeof v === 'object') ? v : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    safeSet(key, JSON.stringify(value));
}

function loadString(key, fallback) {
    const v = safeGet(key);
    return (v === null || v === undefined || v === '') ? fallback : String(v).replace(/"/g, '');
}

const stats = Object.assign(
    { games: 0, wins: 0, losses: 0, shots: 0, hits: 0, streak: 0, bestStreak: 0, byDiff: {}, bestShots: {} },
    loadJSON(STATS_KEY, {})
);
if (!stats.byDiff || typeof stats.byDiff !== 'object') stats.byDiff = {};
if (!stats.bestShots || typeof stats.bestShots !== 'object') stats.bestShots = {};
const achSaved = loadJSON(ACH_KEY, []);
const unlockedAch = new Set(Array.isArray(achSaved) ? achSaved : []);

const ACHIEVEMENTS = [
    { id: 'firstWin',    icon: '⚓', name: 'Pierwsza wygrana', desc: 'Wygraj swoją pierwszą grę.' },
    { id: 'fast',        icon: '⚡', name: 'Szybka wojna',      desc: 'Wygraj w 45 strzałach lub mniej.' },
    { id: 'sniper',      icon: '🎯', name: 'Snajper',           desc: 'Wygraj z celnością co najmniej 50%.' },
    { id: 'untouchable', icon: '🛡️', name: 'Nietykalny',        desc: 'Wygraj bez straty żadnego statku.' },
    { id: 'hard',        icon: '🧠', name: 'Pogromca Trudnego', desc: 'Wygraj na poziomie Trudnym.' },
    { id: 'cheater',     icon: '😈', name: 'Pogromca Cheatera', desc: 'Wygraj na poziomie Cheater.' },
    { id: 'salvo',       icon: '💥', name: 'Mistrz Salwy',      desc: 'Wygraj grę w trybie Salwa.' },
    { id: 'streak3',     icon: '🔥', name: 'Seria zwycięstw',   desc: 'Wygraj 3 gry z rzędu.',
      goal: 3, hint: 'Najlepsza seria', progress: () => stats.bestStreak },
    { id: 'wins10',      icon: '🎖️', name: 'Admirał',           desc: 'Wygraj łącznie 10 gier.',
      goal: 10, hint: 'Wygrane', progress: () => stats.wins },
    { id: 'hitStreak7',  icon: '🏹', name: 'Pewna ręka',        desc: 'Trafij 7 razy z rzędu w jednej grze.' },
    { id: 'allLevels',   icon: '🗺️', name: 'Zdobywca poziomów', desc: 'Wygraj na wszystkich czterech poziomach trudności.',
      goal: DIFFICULTIES.length, hint: 'Poziomy', progress: () => levelsWon() },
    { id: 'veteran25',   icon: '🌊', name: 'Weteran mórz',      desc: 'Rozegraj 25 gier.',
      goal: 25, hint: 'Rozegrane gry', progress: () => stats.games }
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

function levelsWon() {
    return DIFFICULTIES.filter(([id]) => stats.byDiff[id] && stats.byDiff[id].w > 0).length;
}

/* --- OBSŁUGA PEŁNEGO EKRANU --- */

function isFullscreenActive() {
    return GameFullscreen.isActive(battleshipContainer);
}

function updateFullscreenUI() {
    const active = isFullscreenActive();
    if (btnFullscreen) {
        btnFullscreen.textContent = active ? '✕' : '⛶';
        btnFullscreen.title = active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran';
        btnFullscreen.setAttribute('aria-label', active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran');
    }
    document.body.style.overflow = active ? 'hidden' : '';
}

function toggleFullscreen() {
    GameFullscreen.toggle(battleshipContainer, updateFullscreenUI);
}

/* --- POMOCNICZE --- */

function insertAfter(ref, el) {
    if (ref && ref.parentElement) ref.parentElement.insertBefore(el, ref.nextSibling);
}

function schedule(fn, ms) {
    clearTimeout(botTimer);
    botTimer = setTimeout(fn, ms);
}

function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

function cellAt(grid, x, y) {
    return grid.children[y * BOARD_SIZE + x];
}

// Statystyki bieżącej partii (streak = trafienia z rzędu)
function newGm() {
    return { shots: 0, hits: 0, streak: 0, bestStreak: 0 };
}

function isSetupPhase() {
    return !gameState.active && !gameState.over;
}

/* --- INICJALIZACJA --- */

function initGame() {
    clearTimeout(botTimer);
    createGrid(playerGrid, 'player');
    createGrid(computerGrid, 'computer');
    resetData();
    randomizeShips(gameState.playerShips);
    placement.selected = null;
    placement.horizontal = true;
    refreshSetupUI();
    log("Witaj, Kapitanie. Rozmieść flotę (kliknij statek, aby go przenieść) i rozpocznij bitwę.", "info");
}

function resetData() {
    gameState.playerShips = createEmptyBoard();
    gameState.computerShips = createEmptyBoard();
    gameState.active = false;
    gameState.over = false;
    gameState.playerHits = 0;
    gameState.computerHits = 0;
    gameState.botQueue = [];
    gameState.lastHit = null;
    gameState.huntDirection = null;
    gameState.playerTurn = true;
    gameState.shotsLeft = 1;
    gm = newGm();
    aim = null;

    logContent.classList.remove('mode-cheater');
    difficultySelect.disabled = false;
    if (rulesSelect) rulesSelect.disabled = false;

    btnStart.style.display = 'inline-block';
    btnRestart.style.display = 'none';
    btnRandomize.disabled = false;
    computerGrid.classList.add('locked');
    battleshipContainer.classList.remove('is-playing');
    turnStatus.textContent = "Rozstawianie Floty";
    turnStatus.style.color = "";

    document.querySelectorAll('.cell').forEach(c => c.className = 'cell');
    logContent.innerHTML = '';
}

function createEmptyBoard() {
    return Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
}

function createGrid(container, owner) {
    container.innerHTML = '';
    container.setAttribute('role', 'grid');
    container.setAttribute('aria-label', owner === 'player' ? 'Twoja plansza' : 'Plansza wroga');

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.title = coord(x, y);
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', coord(x, y));

            // Osie planszy (litery nad pierwszym rzędem, cyfry przy pierwszej kolumnie)
            if (y === 0) {
                const s = document.createElement('span');
                s.className = 'axis axis-x';
                s.textContent = COL_LABELS[x];
                cell.appendChild(s);
            }
            if (x === 0) {
                const s = document.createElement('span');
                s.className = 'axis axis-y';
                s.textContent = String(y + 1);
                cell.appendChild(s);
            }
            container.appendChild(cell);
        }
    }
}

/* --- ANALIZA PLANSZY (wspólna dla bota, listy floty i rysowania) --- */

// Zwraca wszystkie pola statku, do którego należy pole (x, y). Statki nie stykają się, więc
// wystarczy przejść po sąsiadach w 4 kierunkach (1 = statek, 3 = trafiony segment).
function shipCells(board, x, y) {
    const out = [];
    const seen = new Set();
    const stack = [{ x, y }];

    while (stack.length) {
        const c = stack.pop();
        const key = c.y * BOARD_SIZE + c.x;
        if (seen.has(key)) continue;
        seen.add(key);

        const v = board[c.y][c.x];
        if (v !== 1 && v !== 3) continue;
        out.push(c);

        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = c.x + dx;
            const ny = c.y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) stack.push({ x: nx, y: ny });
        });
    }
    return out;
}

// sunk: klucze pól zatopionych statków, active: trafione pola niezatopionych statków,
// remaining: długości statków, które jeszcze pływają, sunkSizes: długości zatopionych
function analyzeBoard(board) {
    const seen = new Set();
    const sunk = new Set();
    const active = [];
    const remaining = [];
    const sunkSizes = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const v = board[y][x];
            if ((v !== 1 && v !== 3) || seen.has(y * BOARD_SIZE + x)) continue;

            const cells = shipCells(board, x, y);
            cells.forEach(c => seen.add(c.y * BOARD_SIZE + c.x));

            if (cells.every(c => board[c.y][c.x] === 3)) {
                cells.forEach(c => sunk.add(c.y * BOARD_SIZE + c.x));
                sunkSizes.push(cells.length);
            } else {
                remaining.push(cells.length);
                cells.forEach(c => { if (board[c.y][c.x] === 3) active.push(c); });
            }
        }
    }
    return { sunk, active, remaining, sunkSizes };
}

function countAliveShips(board) {
    return analyzeBoard(board).remaining.length;
}

/* --- LOGIKA ROZMIESZCZANIA --- */

function randomizeShips(board) {
    for (let attempt = 0; attempt < 500; attempt++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            board[y].fill(0);
        }

        let allPlaced = true;
        for (const size of SHIPS_CONFIG) {
            let placed = false;
            for (let tries = 0; tries < 200 && !placed; tries++) {
                const horizontal = Math.random() < 0.5;
                const x = Math.floor(Math.random() * BOARD_SIZE);
                const y = Math.floor(Math.random() * BOARD_SIZE);

                if (canPlace(board, x, y, size, horizontal)) {
                    place(board, x, y, size, horizontal);
                    placed = true;
                }
            }
            if (!placed) { allPlaced = false; break; }
        }

        if (allPlaced) return;
    }
}

function canPlace(board, x, y, size, horizontal) {
    if (x < 0 || y < 0) return false;
    if (horizontal && x + size > BOARD_SIZE) return false;
    if (!horizontal && y + size > BOARD_SIZE) return false;

    const startX = Math.max(0, x - 1);
    const endX = Math.min(BOARD_SIZE - 1, horizontal ? x + size : x + 1);
    const startY = Math.max(0, y - 1);
    const endY = Math.min(BOARD_SIZE - 1, horizontal ? y + 1 : y + size);

    for (let i = startY; i <= endY; i++) {
        for (let j = startX; j <= endX; j++) {
            if (board[i][j] !== 0) return false;
        }
    }
    return true;
}

function place(board, x, y, size, horizontal) {
    for (let i = 0; i < size; i++) {
        if (horizontal) {
            board[y][x + i] = 1;
        } else {
            board[y + i][x] = 1;
        }
    }
}

// Długości statków, które gracz jeszcze musi postawić (malejąco)
function unplacedSizes() {
    const a = analyzeBoard(gameState.playerShips);
    const counts = {};
    a.remaining.concat(a.sunkSizes).forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    const out = [];
    SHIPS_CONFIG.forEach(s => {
        if (counts[s] > 0) counts[s]--;
        else out.push(s);
    });
    return out;
}

function ensureSelection() {
    const un = unplacedSizes();
    if (!un.length) placement.selected = null;
    else if (!un.includes(placement.selected)) placement.selected = un[0];
}

// Pozycja i poprawność statku, który zostałby postawiony po kliknięciu w pole (hx, hy)
function previewCells(hx, hy) {
    const size = placement.selected;
    if (!size) return null;

    let x = hx, y = hy;
    if (placement.horizontal) x = Math.min(hx, BOARD_SIZE - size);
    else y = Math.min(hy, BOARD_SIZE - size);

    const cells = [];
    for (let i = 0; i < size; i++) {
        cells.push({ x: x + (placement.horizontal ? i : 0), y: y + (placement.horizontal ? 0 : i) });
    }
    return { x, y, size, cells, valid: canPlace(gameState.playerShips, x, y, size, placement.horizontal) };
}

function clearPreview() {
    placement.preview.forEach(i => {
        const el = playerGrid.children[i];
        if (el) {
            el.classList.remove('preview-ok');
            el.classList.remove('preview-bad');
        }
    });
    placement.preview = [];
}

function showPreview() {
    clearPreview();
    if (!isSetupPhase() || !placement.hover) return;
    const p = previewCells(placement.hover.x, placement.hover.y);
    if (!p) return;
    p.cells.forEach(c => {
        const i = c.y * BOARD_SIZE + c.x;
        const el = playerGrid.children[i];
        if (el) {
            el.classList.add(p.valid ? 'preview-ok' : 'preview-bad');
            placement.preview.push(i);
        }
    });
}

function refreshSetupUI() {
    ensureSelection();
    const setup = isSetupPhase();
    const remaining = unplacedSizes();

    renderGrid(playerGrid, gameState.playerShips, true);
    playerGrid.classList.toggle('placing', setup);

    if (setup) {
        turnStatus.textContent = remaining.length
            ? `Rozstawianie: statek ${placement.selected}-masztowy (R - obrót)`
            : 'Flota gotowa - naciśnij Start';
    }

    btnStart.disabled = remaining.length > 0;
    if (btnRotate) btnRotate.style.display = setup ? 'inline-block' : 'none';
    if (btnClear) btnClear.style.display = setup ? 'inline-block' : 'none';

    updateFleetInfo();
    showPreview();
}

function liftShip(x, y) {
    const board = gameState.playerShips;
    const cells = shipCells(board, x, y);
    if (!cells.length) return;

    cells.forEach(c => { board[c.y][c.x] = 0; });
    if (cells.length > 1) placement.horizontal = cells[0].y === cells[1].y;
    placement.selected = cells.length;
    refreshSetupUI();
}

function rotatePlacement() {
    if (!isSetupPhase()) return;
    placement.horizontal = !placement.horizontal;
    showPreview();
}

function onPlayerCellClick(e) {
    if (!isSetupPhase()) return;
    const cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell || !playerGrid.contains(cell)) return;

    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    if (Number.isNaN(x) || Number.isNaN(y)) return;

    // Kliknięcie w postawiony statek = podniesienie go do ponownego ustawienia
    if (gameState.playerShips[y][x] === 1) {
        liftShip(x, y);
        return;
    }

    const p = previewCells(x, y);
    if (!p) {
        log("Wszystkie statki są rozstawione. Kliknij statek, aby go przenieść.", "info");
        return;
    }
    if (!p.valid) {
        log("Tu nie można postawić statku - statki nie mogą się stykać.", "info");
        shakeGrid(playerGrid);
        return;
    }

    place(gameState.playerShips, p.x, p.y, p.size, placement.horizontal);
    placement.hover = { x, y };
    refreshSetupUI();
}

function onPlayerCellOver(e) {
    if (!isSetupPhase()) return;
    const cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell) return;
    placement.hover = { x: parseInt(cell.dataset.x, 10), y: parseInt(cell.dataset.y, 10) };
    showPreview();
}

/* --- TURY I ZASADY --- */

function updateStatus(extra) {
    if (!gameState.active) return;
    if (gameState.playerTurn) {
        turnStatus.textContent = gameState.rules === 'salvo'
            ? `TWÓJ RUCH - STRZAŁY: ${gameState.shotsLeft}`
            : (extra || "TWÓJ RUCH");
        turnStatus.style.color = "var(--accent)";
    } else {
        turnStatus.textContent = gameState.rules === 'salvo'
            ? `RUCH KOMPUTERA - STRZAŁY: ${gameState.shotsLeft}`
            : "RUCH KOMPUTERA";
        turnStatus.style.color = "var(--danger)";
    }
}

function startTurn(who) {
    gameState.playerTurn = (who === 'player');

    if (gameState.rules === 'salvo') {
        const board = who === 'player' ? gameState.playerShips : gameState.computerShips;
        gameState.shotsLeft = Math.max(1, countAliveShips(board));
        log(who === 'player'
            ? `Salwa: masz ${gameState.shotsLeft} strzałów.`
            : `Salwa wroga: ${gameState.shotsLeft} strzałów.`, who === 'player' ? 'player' : 'enemy');
    } else {
        gameState.shotsLeft = 1;
    }

    updateStatus();
    if (who === 'bot') schedule(botTurn, 800);
}

// Zużywa jeden strzał. Zwraca true, jeśli strzelający ma jeszcze ruch.
function continuesTurn(isHit) {
    gameState.shotsLeft--;
    if (gameState.rules === 'classic') return isHit;
    if (gameState.rules === 'noextra') return false;
    return gameState.shotsLeft > 0; // salwa
}

/* --- STRZAŁY GRACZA --- */

function onEnemyCellClick(e) {
    if (!gameState.active || !gameState.playerTurn) return;

    const cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell || !computerGrid.contains(cell)) return;

    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (gameState.computerShips[y][x] >= 2) return;

    // Na telefonie: pierwszy dotyk celuje, drugi strzela
    if (confirmShotEl && confirmShotEl.checked) {
        if (!aim || aim.x !== x || aim.y !== y) {
            setAim(x, y);
            return;
        }
    }
    fireAtEnemy(x, y);
}

function setAim(x, y) {
    clearAim();
    aim = { x, y };
    const el = cellAt(computerGrid, x, y);
    if (el) el.classList.add('aim');
}

function clearAim() {
    if (aim) {
        const el = cellAt(computerGrid, aim.x, aim.y);
        if (el) el.classList.remove('aim');
    }
    aim = null;
}

function fireAtEnemy(x, y) {
    if (!gameState.active || !gameState.playerTurn) return;
    if (gameState.computerShips[y][x] >= 2) return;
    clearAim();

    const cell = cellAt(computerGrid, x, y);
    const isHit = (gameState.computerShips[y][x] === 1);
    gameState.computerShips[y][x] = isHit ? 3 : 2;
    gm.shots++;

    updateVisuals(cell, isHit);

    if (isHit) {
        gm.hits++;
        gm.streak++;
        gm.bestStreak = Math.max(gm.bestStreak, gm.streak);
        if (gm.bestStreak >= 7) unlockAch('hitStreak7');
        gameState.computerHits++;
        const sunk = resolveSunk('computer', x, y);
        if (gameState.rules === 'classic') {
            log(`Trafienie ${coord(x, y)}! Masz dodatkowy ruch!`, "player");
        } else {
            log(`Trafienie ${coord(x, y)}!`, "player");
        }
        if (sunk) log("Zatopiony! Wokół statku nie ma już innych jednostek.", "player");
        playAudio('hit');
    } else {
        gm.streak = 0;
        log(`Pudło ${coord(x, y)}.`, "info");
        playAudio('splash');
    }

    updateFleetInfo();
    if (checkWin()) return;

    if (continuesTurn(isHit)) {
        updateStatus(isHit ? "TRAFIENIE! STRZELAJ DALEJ" : undefined);
    } else {
        startTurn('bot');
    }
}

/* --- AI (BOT) --- */

function unknownCells(board) {
    const out = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] < 2) out.push({ x, y });
        }
    }
    return out;
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function botChooseTarget() {
    const board = gameState.playerShips;
    const diff = gameState.difficulty;

    // Cheater: gdy nie ma trwającego polowania, często "widzi" Twój statek
    if (diff === 'cheater' && analyzeBoard(board).active.length === 0 && Math.random() < 0.7) {
        const ships = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] === 1) ships.push({ x, y });
            }
        }
        if (ships.length) {
            log("!!! SYSTEMY ZAKŁÓCONE: Wróg namierzył Twój sygnał !!!", "enemy");
            return pickRandom(ships);
        }
    }

    // Trudny i Cheater: mapa prawdopodobieństwa
    if (diff === 'hard' || diff === 'cheater') {
        return densityTarget();
    }

    // Łatwy i Normalny: dobijanie trafionych statków + wyszukiwanie
    while (gameState.botQueue.length > 0 &&
           board[gameState.botQueue[0].y][gameState.botQueue[0].x] >= 2) {
        gameState.botQueue.shift();
    }
    // Łatwy bot czasem "zapomina" dobić trafiony statek i strzela losowo
    const forgetful = diff === 'easy' && Math.random() < 0.35;
    if (gameState.botQueue.length > 0 && !forgetful) {
        return gameState.botQueue.shift();
    }
    if (gameState.botQueue.length === 0) {
        gameState.lastHit = null;
        gameState.huntDirection = null;
    }

    const unknown = unknownCells(board);
    if (diff === 'medium') {
        // Szachownica: każdy statek (poza jednomasztowcem) zahacza o pole tego koloru
        const parity = unknown.filter(c => (c.x + c.y) % 2 === 0 && isAreaClearForBot(c.x, c.y));
        if (parity.length) return pickRandom(parity);
    }
    return pickRandom(unknown);
}

// Dla każdego pola zlicza, w ilu ustawieniach pozostałych statków mogłoby się znaleźć.
// Gdy są trafione, niezatopione statki, liczą się tylko ustawienia je obejmujące.
function densityTarget() {
    const board = gameState.playerShips;
    const { sunk, active, remaining } = analyzeBoard(board);
    const targetMode = active.length > 0;
    const score = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);

    // Pola po przekątnej od trafienia nie mogą należeć do żadnego statku (statki się nie stykają)
    const diagBlocked = new Array(BOARD_SIZE * BOARD_SIZE).fill(false);
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            diagBlocked[y * BOARD_SIZE + x] = !isAreaClearForBot(x, y);
        }
    }

    remaining.forEach(size => {
        [true, false].forEach(horizontal => {
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    if (horizontal && x + size > BOARD_SIZE) continue;
                    if (!horizontal && y + size > BOARD_SIZE) continue;

                    let ok = true;
                    let hitsCovered = 0;
                    const cells = [];
                    for (let i = 0; i < size; i++) {
                        const cx = x + (horizontal ? i : 0);
                        const cy = y + (horizontal ? 0 : i);
                        const k = cy * BOARD_SIZE + cx;
                        const v = board[cy][cx];
                        if (v === 2 || sunk.has(k) || diagBlocked[k]) { ok = false; break; }
                        if (v === 3) hitsCovered++;
                        cells.push(k);
                    }
                    if (!ok) continue;
                    if (targetMode && hitsCovered === 0) continue;

                    const w = targetMode ? Math.pow(4, hitsCovered) : 1;
                    cells.forEach(k => {
                        if (board[Math.floor(k / BOARD_SIZE)][k % BOARD_SIZE] !== 3) score[k] += w;
                    });
                }
            }
        });
    });

    let best = 0;
    let picks = [];
    for (let k = 0; k < score.length; k++) {
        const v = board[Math.floor(k / BOARD_SIZE)][k % BOARD_SIZE];
        if (v >= 2) continue;
        if (score[k] > best) { best = score[k]; picks = [k]; }
        else if (score[k] === best && best > 0) picks.push(k);
    }

    if (!picks.length) return pickRandom(unknownCells(board));
    const k = pickRandom(picks);
    return { x: k % BOARD_SIZE, y: Math.floor(k / BOARD_SIZE) };
}

function botTurn() {
    if (!gameState.active || gameState.playerTurn) return;

    const target = botChooseTarget();
    if (!target) return;

    const x = target.x;
    const y = target.y;
    const board = gameState.playerShips;
    const isHit = (board[y][x] === 1);
    board[y][x] = isHit ? 3 : 2;

    updateVisuals(cellAt(playerGrid, x, y), isHit);

    if (isHit) {
        gameState.playerHits++;
        log(`Wróg trafił ${coord(x, y)}!`, "enemy");
        playAudio('hit');

        if (resolveSunk('player', x, y)) {
            log("Wróg zatopił jeden z Twoich statków!", "enemy");
            gameState.botQueue = [];
            gameState.lastHit = null;
            gameState.huntDirection = null;
        } else if (gameState.difficulty === 'easy' || gameState.difficulty === 'medium') {
            addSmartNeighbors(x, y);
            gameState.lastHit = { x, y };
        }
    } else {
        log(`Wróg spudłował (${coord(x, y)}).`, "info");
        playAudio('splash');
    }

    updateFleetInfo();
    if (checkWin()) return;

    if (continuesTurn(isHit)) {
        updateStatus();
        schedule(botTurn, gameState.rules === 'salvo' ? 700 : 1000);
    } else {
        startTurn('player');
    }
}

function addSmartNeighbors(x, y) {
    const directions = [
        { x: 0, y: -1, type: 'v' }, { x: 0, y: 1, type: 'v' },
        { x: -1, y: 0, type: 'h' }, { x: 1, y: 0, type: 'h' }
    ];

    if (gameState.lastHit) {
        if (gameState.lastHit.x === x) {
            gameState.huntDirection = 'v';
        } else if (gameState.lastHit.y === y) {
            gameState.huntDirection = 'h';
        }
    }

    if (gameState.huntDirection) {
        gameState.botQueue = gameState.botQueue.filter(q => {
            if (gameState.huntDirection === 'v') return q.x === x;
            if (gameState.huntDirection === 'h') return q.y === y;
            return true;
        });
    }

    directions.forEach(d => {
        if (gameState.huntDirection && d.type !== gameState.huntDirection) return;
        const nx = x + d.x, ny = y + d.y;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (gameState.playerShips[ny][nx] < 2 && isAreaClearForBot(nx, ny)) {
                if (!gameState.botQueue.some(q => q.x === nx && q.y === ny)) {
                    gameState.botQueue.unshift({ x: nx, y: ny });
                }
            }
        }
    });
}

function isAreaClearForBot(x, y) {
    const diagonals = [
        { x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 },
        { x: x - 1, y: y + 1 }, { x: x + 1, y: y + 1 }
    ];

    for (let d of diagonals) {
        if (d.x >= 0 && d.x < BOARD_SIZE && d.y >= 0 && d.y < BOARD_SIZE) {
            if (gameState.playerShips[d.y][d.x] === 3) return false;
        }
    }
    return true;
}

/* --- ZATOPIENIA I LISTA FLOTY --- */

// Jeśli trafienie zatopiło statek: oznacza go i wszystkie pola wokół jako pudła. Zwraca true/false.
function resolveSunk(owner, x, y) {
    const board = owner === 'computer' ? gameState.computerShips : gameState.playerShips;
    const grid = owner === 'computer' ? computerGrid : playerGrid;
    const cells = shipCells(board, x, y);

    if (!cells.length || !cells.every(c => board[c.y][c.x] === 3)) return false;

    cells.forEach(c => {
        const el = grid.children[c.y * BOARD_SIZE + c.x];
        if (el) {
            el.classList.remove('hit');
            el.classList.add('sunk');
            fxCell(el, 'sunk');
        }
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = c.x + dx;
                const ny = c.y + dy;
                if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
                if (board[ny][nx] === 0) {
                    board[ny][nx] = 2;
                    const neighbor = grid.children[ny * BOARD_SIZE + nx];
                    if (neighbor) neighbor.classList.add('miss');
                }
            }
        }
    });

    shakeGrid(grid);
    vibrate(owner === 'player' ? [80, 40, 80] : 50);
    setTimeout(() => playAudio('sunk'), 150);
    return true;
}

function renderFleetTracker(el, board, setupMode) {
    if (!el) return;
    el.innerHTML = '';
    const a = analyzeBoard(board);
    const used = {};

    let placedCount = {};
    if (setupMode) {
        a.remaining.concat(a.sunkSizes).forEach(s => { placedCount[s] = (placedCount[s] || 0) + 1; });
    }
    const sunkCount = {};
    a.sunkSizes.forEach(s => { sunkCount[s] = (sunkCount[s] || 0) + 1; });

    let selectedMarked = false;

    SHIPS_CONFIG.forEach(size => {
        used[size] = (used[size] || 0) + 1;
        const idx = used[size];

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'fleet-chip';
        chip.setAttribute('aria-label', `Statek ${size}-masztowy`);

        if (setupMode) {
            const isPlaced = idx <= (placedCount[size] || 0);
            if (isPlaced) {
                chip.classList.add('placed');
            } else {
                chip.classList.add('selectable');
                if (size === placement.selected && !selectedMarked) {
                    chip.classList.add('selected');
                    selectedMarked = true;
                }
                chip.addEventListener('click', () => {
                    placement.selected = size;
                    refreshSetupUI();
                });
            }
        } else if (idx <= (sunkCount[size] || 0)) {
            chip.classList.add('sunk');
        }

        for (let i = 0; i < size; i++) {
            const seg = document.createElement('span');
            seg.className = 'seg';
            chip.appendChild(seg);
        }
        el.appendChild(chip);
    });
}

function updateFleetInfo() {
    const playerInfo = document.getElementById('player-ships-info');
    const enemyInfo = document.getElementById('enemy-ships-info');
    const total = SHIPS_CONFIG.length;

    if (playerInfo) {
        playerInfo.textContent = `Twoja flota: ${countAliveShips(gameState.playerShips)}/${total}`;
    }
    if (enemyInfo) {
        const placed = gameState.computerShips.some(row => row.some(v => v === 1 || v === 3));
        enemyInfo.textContent = placed
            ? `Flota wroga: ${countAliveShips(gameState.computerShips)}/${total}`
            : 'Wróg ukryty';
    }

    renderFleetTracker(playerTracker, gameState.playerShips, isSetupPhase());
    renderFleetTracker(enemyTracker, gameState.computerShips, false);
}

/* --- RYSOWANIE I EFEKTY --- */

function fxCell(cell, type) {
    if (!cell) return;
    const span = document.createElement('span');
    span.className = `fx fx-${type}`;
    cell.appendChild(span);
    setTimeout(() => span.remove(), 800);
}

function shakeGrid(grid) {
    grid.classList.add('shake');
    setTimeout(() => grid.classList.remove('shake'), 450);
}

function updateVisuals(cell, isHit) {
    if (isHit) {
        cell.classList.add('hit');
        fxCell(cell, 'hit');
        vibrate(25);
    } else {
        cell.classList.add('miss');
        fxCell(cell, 'miss');
    }
}

// Rysuje planszę wg danych. Statki dostają klasy n-l/n-r/n-t/n-b (sąsiad po danej stronie),
// dzięki którym CSS zaokrągla tylko końce kadłuba.
function renderGrid(container, boardData, showShips) {
    const { sunk } = analyzeBoard(boardData);

    const visible = (x, y) => {
        if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return false;
        const v = boardData[y][x];
        return v === 3 || (v === 1 && showShips);
    };

    Array.from(container.children).forEach((cell, i) => {
        const x = i % BOARD_SIZE;
        const y = Math.floor(i / BOARD_SIZE);
        const val = boardData[y][x];

        cell.className = 'cell';
        if (val === 1 && showShips) cell.classList.add('ship');
        if (val === 2) cell.classList.add('miss');
        if (val === 3) cell.classList.add(sunk.has(y * BOARD_SIZE + x) ? 'sunk' : 'hit');

        if (visible(x, y)) {
            if (visible(x - 1, y)) cell.classList.add('n-l');
            if (visible(x + 1, y)) cell.classList.add('n-r');
            if (visible(x, y - 1)) cell.classList.add('n-t');
            if (visible(x, y + 1)) cell.classList.add('n-b');
        }
    });
}

/* --- KONIEC GRY I STATYSTYKI --- */

function checkWin() {
    if (gameState.computerHits === gameState.totalSegments) {
        endGame(true);
        return true;
    }
    if (gameState.playerHits === gameState.totalSegments) {
        endGame(false);
        return true;
    }
    return false;
}

function unlockAch(id) {
    if (unlockedAch.has(id) || !ACH_BY_ID[id]) return;
    unlockedAch.add(id);
    saveJSON(ACH_KEY, Array.from(unlockedAch));
    log(`🏆 Osiągnięcie: ${ACH_BY_ID[id].name}`, "victory");
    renderAchievements();
}

// Osiągnięcia z postępem odblokowują się od razu, jeśli statystyki już je spełniają
// (np. wygrane sprzed dodania danego osiągnięcia)
function syncAchievements() {
    let changed = false;
    ACHIEVEMENTS.forEach(a => {
        if (a.progress && !unlockedAch.has(a.id) && a.progress() >= a.goal) {
            unlockedAch.add(a.id);
            changed = true;
        }
    });
    if (changed) saveJSON(ACH_KEY, Array.from(unlockedAch));
}

function recordGame(playerWon) {
    const d = gameState.difficulty;
    stats.games++;
    if (stats.games >= 25) unlockAch('veteran25');
    stats.shots += gm.shots;
    stats.hits += gm.hits;
    stats.byDiff[d] = stats.byDiff[d] || { w: 0, l: 0 };

    if (playerWon) {
        stats.wins++;
        stats.streak++;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        stats.byDiff[d].w++;

        const best = stats.bestShots[d];
        if (!best || gm.shots < best) stats.bestShots[d] = gm.shots;

        unlockAch('firstWin');
        if (gm.shots <= 45) unlockAch('fast');
        if (gm.shots > 0 && gm.hits / gm.shots >= 0.5) unlockAch('sniper');
        if (countAliveShips(gameState.playerShips) === SHIPS_CONFIG.length) unlockAch('untouchable');
        if (d === 'hard') unlockAch('hard');
        if (d === 'cheater') unlockAch('cheater');
        if (stats.streak >= 3) unlockAch('streak3');
        if (stats.wins >= 10) unlockAch('wins10');
        if (levelsWon() >= DIFFICULTIES.length) unlockAch('allLevels');
        if (gameState.rules === 'salvo') unlockAch('salvo');
    } else {
        stats.losses++;
        stats.streak = 0;
        stats.byDiff[d].l++;
    }

    saveJSON(STATS_KEY, stats);
    renderAchievements();
}

function endGame(playerWon) {
    gameState.active = false;
    gameState.over = true;
    clearTimeout(botTimer);
    clearAim();

    turnStatus.textContent = playerWon ? "ZWYCIĘSTWO!" : "PORAŻKA";
    turnStatus.style.color = playerWon ? "var(--accent-2)" : "var(--danger)";

    log(playerWon ? "GRATULACJE! Wroga flota zniszczona." : "MAYDAY! Nasza flota poszła na dno.", "victory");

    const acc = gm.shots ? Math.round((gm.hits / gm.shots) * 100) : 0;
    log(`Strzały: ${gm.shots} • Celność: ${acc}% • Twoja flota: ${countAliveShips(gameState.playerShips)}/${SHIPS_CONFIG.length}`, "info");

    audio.music.pause();
    if (playerWon) playAudio('win');
    else playAudio('lose');

    btnStart.style.display = 'none';
    btnRestart.style.display = 'inline-block';
    playerGrid.classList.remove('placing');

    renderGrid(computerGrid, gameState.computerShips, true);
    updateFleetInfo();
    recordGame(playerWon);
}

function log(msg, type) {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `> ${msg}`;
    logContent.prepend(div);
}

function playAudio(type) {
    try {
        if (audio[type]) {
            audio[type].currentTime = 0;
            audio[type].play().catch(() => {});
        }
    } catch (e) {
        console.log("Audio error", e);
    }
}

/* --- SEKCJA OSIĄGNIĘĆ (ten sam układ i klasy co w Dino) --- */

// Sekcja jest dodawana skryptem: przed "Źródłami dźwięków", a gdy jej nie ma - zaraz pod grą
function buildAchievementsSection() {
    if (document.getElementById('achievementsList')) {
        // sekcja jest już w HTML-u
        syncAchievements();
        renderAchievements();
        return;
    }

    const section = document.createElement('section');
    section.id = 'battleship-achievements';
    section.className = 'card mt-22';

    const h = document.createElement('h3');
    h.textContent = 'Osiągnięcia';
    section.appendChild(h);

    ['achievementsProgress', 'achievementsStats', 'achievementsLevels'].forEach(id => {
        const p = document.createElement('p');
        p.className = 'muted';
        p.id = id;
        section.appendChild(p);
    });

    const ul = document.createElement('ul');
    ul.id = 'achievementsList';
    ul.className = 'achievements-list';
    section.appendChild(ul);

    const actions = document.createElement('div');
    actions.className = 'achievements-actions';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.id = 'resetProgressBtn';
    resetBtn.className = 'ghost';
    resetBtn.textContent = 'Wyzeruj rekord i osiągnięcia';
    actions.appendChild(resetBtn);
    section.appendChild(actions);

    const credits = document.getElementById('audio-credits');
    if (credits && credits.parentElement) {
        credits.parentElement.insertBefore(section, credits);
    } else {
        const gameSection = (battleshipContainer.closest && battleshipContainer.closest('section')) || battleshipContainer;
        insertAfter(gameSection, section);
    }

    syncAchievements();
    renderAchievements();
}

// Zerowanie statystyk i osiągnięć (ta sama opcja i komunikat co w pozostałych grach)
function resetProgress() {
    if (!window.confirm('Na pewno wyzerować rekord, statystyki i osiągnięcia w Statkach?')) return;

    const removeKey = k => { try { store.remove(k); } catch (e) { /* brak zapisu */ } };

    Object.assign(stats, { games: 0, wins: 0, losses: 0, shots: 0, hits: 0, streak: 0, bestStreak: 0, byDiff: {}, bestShots: {} });
    removeKey(STATS_KEY);
    unlockedAch.clear();
    removeKey(ACH_KEY);
    renderAchievements();
}

function renderAchievements() {
    const list = document.getElementById('achievementsList');
    if (!list) return;

    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const done = unlockedAch.has(a.id);
        const li = document.createElement('li');
        li.className = 'achievement' + (done ? ' unlocked' : '');

        const icon = document.createElement('span');
        icon.className = 'achievement-icon';
        icon.textContent = done ? a.icon : '🔒';

        const body = document.createElement('span');
        body.className = 'achievement-body';
        const name = document.createElement('strong');
        name.textContent = a.name;
        const desc = document.createElement('small');
        desc.textContent = a.desc;
        body.appendChild(name);
        body.appendChild(desc);

        // Pasek postępu (tylko osiągnięcia liczone w czasie)
        if (!done && a.goal && a.progress) {
            const cur = Math.min(a.goal, a.progress());
            const pct = Math.round((cur / a.goal) * 100);
            const bar = document.createElement('span');
            bar.className = 'achievement-bar';
            const fill = document.createElement('span');
            fill.className = 'achievement-bar-fill';
            fill.style.width = pct + '%';
            bar.appendChild(fill);
            const hint = document.createElement('small');
            hint.textContent = `${a.hint}: ${cur} / ${a.goal}`;
            body.appendChild(bar);
            body.appendChild(hint);
        }

        li.appendChild(icon);
        li.appendChild(body);
        list.appendChild(li);
    });

    const progress = document.getElementById('achievementsProgress');
    if (progress) progress.textContent = `Odblokowano: ${unlockedAch.size} / ${ACHIEVEMENTS.length}`;

    const summary = document.getElementById('achievementsStats');
    if (summary) {
        const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
        summary.textContent =
            `Rozegrane gry: ${stats.games} • Wygrane: ${stats.wins} • Porażki: ${stats.losses} • ` +
            `Celność: ${acc}% • Najlepsza seria: ${stats.bestStreak}`;
    }

    // Wyniki na poszczególnych poziomach (pokazywane dopiero po pierwszej rozegranej grze)
    const levels = document.getElementById('achievementsLevels');
    if (levels) {
        const parts = [];
        DIFFICULTIES.forEach(([id, label]) => {
            const d = stats.byDiff[id];
            if (!d) return;
            const best = stats.bestShots[id];
            parts.push(`${label}: ${d.w}W / ${d.l}P${best ? ` (najmniej strzałów: ${best})` : ''}`);
        });
        levels.textContent = parts.join(' • ');
        levels.style.display = parts.length ? '' : 'none';
    }
}

/* --- DODATKOWY INTERFEJS (wstrzykiwany skryptem) --- */

function makeTracker(grid, side) {
    const el = document.createElement('div');
    el.className = 'fleet-tracker ' + side;
    grid.parentElement.insertBefore(el, grid);
    return el;
}

// Elementy z HTML-a; gdy ich brakuje (starsza wersja strony), skrypt tworzy je sam
function getOrCreate(id, create) {
    let el = document.getElementById(id);
    if (!el) el = create();
    return el;
}

function fillSelect(select, items) {
    if (select.options && select.options.length === items.length) return; // opcje są już w HTML
    select.innerHTML = '';
    items.forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function injectUI() {
    // Przyciski obrotu i czyszczenia (obok "Losuj")
    btnRotate = getOrCreate('btn-rotate', () => {
        const b = document.createElement('button');
        b.id = 'btn-rotate';
        b.type = 'button';
        b.className = btnRandomize.className;
        b.textContent = 'Obróć (R)';
        insertAfter(btnRandomize, b);
        return b;
    });
    btnClear = getOrCreate('btn-clear', () => {
        const b = document.createElement('button');
        b.id = 'btn-clear';
        b.type = 'button';
        b.className = btnRandomize.className;
        b.textContent = 'Wyczyść';
        insertAfter(btnRotate, b);
        return b;
    });

    // Poziomy trudności
    const prevDiff = loadString(DIFF_KEY, difficultySelect.value || 'easy');
    fillSelect(difficultySelect, DIFFICULTIES);
    difficultySelect.value = DIFF_NAMES[prevDiff] ? prevDiff : 'easy';
    difficultySelect.addEventListener('change', () => safeSet(DIFF_KEY, difficultySelect.value));

    // Wybór zasad
    rulesSelect = getOrCreate('rules-select', () => {
        const lbl = document.createElement('label');
        lbl.textContent = 'Zasady:';
        lbl.htmlFor = 'rules-select';
        lbl.className = 'bs-label';
        insertAfter(difficultySelect, lbl);

        const sel = document.createElement('select');
        sel.id = 'rules-select';
        sel.className = difficultySelect.className;
        insertAfter(lbl, sel);
        return sel;
    });
    fillSelect(rulesSelect, RULES);
    const prevRules = loadString(RULES_KEY, 'classic');
    rulesSelect.value = RULES.some(r => r[0] === prevRules) ? prevRules : 'classic';
    rulesSelect.addEventListener('change', () => safeSet(RULES_KEY, rulesSelect.value));

    // Potwierdzanie strzału (domyślnie włączone na ekranach dotykowych)
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    confirmShotEl = getOrCreate('confirm-shot', () => {
        const label = document.createElement('label');
        label.className = 'bs-check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'confirm-shot';
        label.appendChild(input);
        const text = document.createElement('span');
        text.textContent = ' Potwierdź strzał';
        label.appendChild(text);
        insertAfter(rulesSelect, label);
        return input;
    });
    const savedConfirm = safeGet(CONFIRM_KEY);
    confirmShotEl.checked = savedConfirm === null || savedConfirm === undefined
        ? coarse
        : String(savedConfirm) === '1';
    confirmShotEl.addEventListener('change', () => {
        safeSet(CONFIRM_KEY, confirmShotEl.checked ? '1' : '0');
        clearAim();
    });

    // Listy floty nad planszami
    playerTracker = makeTracker(playerGrid, 'player-fleet');
    enemyTracker = makeTracker(computerGrid, 'enemy-fleet');

    // Dostępność
    turnStatus.setAttribute('aria-live', 'polite');
    computerGrid.setAttribute('tabindex', '0');

    buildAchievementsSection();
}

/* --- LISTENERY --- */

if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        toggleFullscreen();
        btnFullscreen.blur();
    });
}

document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        clearAim();
        if (battleshipContainer && battleshipContainer.classList.contains('is-fullscreen')) {
            battleshipContainer.classList.remove('is-fullscreen');
            updateFullscreenUI();
        }
    }

    const t = e.target;
    if (t && t.closest && t.closest('input, select, textarea')) return;

    if (e.code === 'KeyR' && isSetupPhase()) {
        rotatePlacement();
    }
});

// Rozstawianie: klik = postaw/przenieś, PPM = obrót
playerGrid.addEventListener('click', onPlayerCellClick);
playerGrid.addEventListener('mouseover', onPlayerCellOver);
playerGrid.addEventListener('mouseleave', () => {
    placement.hover = null;
    clearPreview();
});
playerGrid.addEventListener('contextmenu', (e) => {
    if (!isSetupPhase()) return;
    e.preventDefault();
    rotatePlacement();
});

// Strzelanie
computerGrid.addEventListener('click', onEnemyCellClick);

// Sterowanie klawiaturą na planszy wroga
// Kursor klawiatury jest widoczny tylko wtedy, gdy gracz faktycznie steruje klawiaturą.
// Mysz i dotyk go ukrywają, a samo kliknięcie planszy go nie pokazuje.
let kbdActive = false;

function showKbd() {
    document.querySelectorAll('#computer-grid .kbd').forEach(c => c.classList.remove('kbd'));
    kbdActive = true;
    const el = cellAt(computerGrid, kbd.x, kbd.y);
    if (el) el.classList.add('kbd');
}

function hideKbd() {
    kbdActive = false;
    document.querySelectorAll('#computer-grid .kbd').forEach(c => c.classList.remove('kbd'));
}

// Fokus od klawisza Tab pokazuje kursor, fokus od kliknięcia myszą lub dotyku - nie
computerGrid.addEventListener('focus', () => {
    let fromKeyboard = false;
    try { fromKeyboard = computerGrid.matches(':focus-visible'); } catch (e) { /* starsza przeglądarka */ }
    if (fromKeyboard) showKbd();
});
computerGrid.addEventListener('blur', hideKbd);

// Mysz / dotyk: schowaj kursor, a klawiatura zacznie od klikniętego pola
['mousedown', 'touchstart'].forEach(type => {
    computerGrid.addEventListener(type, (e) => {
        hideKbd();
        const cell = e.target.closest ? e.target.closest('.cell') : null;
        if (cell) {
            kbd.x = parseInt(cell.dataset.x, 10) || 0;
            kbd.y = parseInt(cell.dataset.y, 10) || 0;
        }
    }, { passive: true });
});

computerGrid.addEventListener('keydown', (e) => {
    let dx = 0, dy = 0;
    if (e.code === 'ArrowLeft') dx = -1;
    else if (e.code === 'ArrowRight') dx = 1;
    else if (e.code === 'ArrowUp') dy = -1;
    else if (e.code === 'ArrowDown') dy = 1;

    if (dx || dy) {
        e.preventDefault();
        // Pierwsze naciśnięcie tylko pokazuje kursor, kolejne go przesuwają
        if (kbdActive) {
            kbd.x = Math.max(0, Math.min(BOARD_SIZE - 1, kbd.x + dx));
            kbd.y = Math.max(0, Math.min(BOARD_SIZE - 1, kbd.y + dy));
        }
        showKbd();
    } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        // Nie strzelamy w pole, którego gracz nie widzi
        if (!kbdActive) {
            showKbd();
            return;
        }
        fireAtEnemy(kbd.x, kbd.y);
    }
});

btnRandomize.addEventListener('click', () => {
    if (!isSetupPhase()) return;
    randomizeShips(gameState.playerShips);
    refreshSetupUI();
    log("Przegrupowano flotę.", "info");
});

window.addEventListener('load', () => {
    injectUI();

    const resetProgressBtn = document.getElementById('resetProgressBtn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', resetProgress);
    }

    btnRotate.addEventListener('click', rotatePlacement);
    btnClear.addEventListener('click', () => {
        if (!isSetupPhase()) return;
        gameState.playerShips.forEach(row => row.fill(0));
        placement.selected = null;
        refreshSetupUI();
        log("Plansza wyczyszczona. Rozstaw statki ręcznie.", "info");
    });

    btnStart.addEventListener('click', () => {
        if (!isSetupPhase()) return;

        if (unplacedSizes().length > 0) {
            log("Rozstaw wszystkie statki albo użyj Losuj.", "info");
            return;
        }

        gameState.active = true;
        battleshipContainer.classList.add('is-playing');
        gameState.difficulty = difficultySelect.value;
        gameState.rules = rulesSelect.value;
        gm = newGm();

        if (gameState.difficulty === 'cheater') {
            logContent.classList.add('mode-cheater');
        } else {
            logContent.classList.remove('mode-cheater');
        }

        randomizeShips(gameState.computerShips);
        computerGrid.classList.remove('locked');
        difficultySelect.disabled = true;
        rulesSelect.disabled = true;
        btnRandomize.disabled = true;
        btnStart.style.display = 'none';
        playerGrid.classList.remove('placing');
        clearPreview();
        if (btnRotate) btnRotate.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none';
        updateFleetInfo();

        audio.music.play().catch(e => console.log("Muzyka wymaga interakcji", e));

        log(`Systemy bojowe aktywne (${DIFF_NAMES[gameState.difficulty]}, ${RULES.find(r => r[0] === gameState.rules)[1]}). Wybierz cel.`, "player");
        startTurn('player');
    });

    btnRestart.addEventListener('click', () => {
        audio.music.pause();
        audio.music.currentTime = 0;
        initGame();
    });

    initGame();
});