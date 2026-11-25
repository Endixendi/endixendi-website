/**
 * Gra Tetris - rozszerzona wersja
 *
 *  - obroty SRS (prawdziwe wall kicki), lock delay, własne DAS/ARR dla klawiatury
 *  - T-spiny, combo, back-to-back, punkty za soft drop i hard drop
 *  - tryby: Maraton, Sprint 40 linii, Ultra 2 min, Zen, Wyzwanie (rosnące śmieci)
 *  - animacja czyszczenia linii, cząsteczki, wstrząsy, napisy (TETRIS!, COMBO...)
 *  - skórki klocków odblokowywane łączną liczbą linii, kolorowe zablokowane klocki
 *  - tło zmieniające się z poziomem, podgląd 3 następnych klocków
 *  - osiągnięcia i statystyki, gesty dotykowe na planszy, wibracje
 */

// Konfiguracja Canvas
const board = document.getElementById('tetrisCanvas');
const ncv = document.getElementById('nextCanvas');
const hcv = document.getElementById('holdCanvas');
const ctx = board ? board.getContext('2d') : null;
const nctx = ncv ? ncv.getContext('2d') : null;
const hctx = hcv ? hcv.getContext('2d') : null;

// Elementy UI
const tetrisContainer = document.getElementById('tetrisContainer');
const fullscreenBtn = document.getElementById('tetrisFullscreenBtn');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const highScoreEl = document.getElementById('highScore');
const tetrisMenu = document.getElementById('tetris-menu');
const menuTitle = document.getElementById('menu-title');
const menuInstruction = document.getElementById('menu-instruction');
const menuExtra = document.getElementById('menu-extra');
const modeSelect = document.getElementById('modeSelect');
const skinSelect = document.getElementById('skinSelect');

// Klucze zapisu
const HIGHSCORE_KEY = 'endixendi:tetris:highscore'; // rekord Maratonu (zgodny ze starą wersją)
const BEST_KEY_PREFIX = 'endixendi:tetris:best:';
const STATS_KEY = 'endixendi:tetris:stats';
const ACH_KEY = 'endixendi:tetris:ach';
const SKIN_KEY = 'endixendi:tetris:skin';
const MODE_KEY = 'endixendi:tetris:mode';

// Rozdzielczość fizyczna kanwy (większa niż rozmiar CSS 300x600, żeby obraz był ostry
// także w trybie pełnoekranowym i na ekranach HiDPI)
const DPR = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
if (board) {
    board.width = 300 * DPR;
    board.height = 600 * DPR;
}

// Ustawienia gry
const COLS = 10, ROWS = 20, TILE = 30;
const ARENA = createMatrix(COLS, ROWS);

const LOCK_DELAY = 500;       // ms - czas na przesunięcie klocka po dotknięciu podłoża
const MAX_LOCK_RESETS = 15;   // ile razy ruch może odnowić lock delay
const DAS = 160;              // ms - opóźnienie przed automatycznym ruchem na boki
const ARR = 45;               // ms - odstęp automatycznych ruchów
const SOFT_INTERVAL = 50;     // ms - odstęp opuszczania przy przytrzymanym ↓
const SPRINT_LINES = 40;
const ULTRA_MS = 120000;
const MAX_PARTICLES = 250;

// Kolory klocków
const COLORS = {
    'I': '#20c4ff', 'J': '#4e6cff', 'L': '#ff9f1c',
    'O': '#ffe600', 'S': '#3bd16f', 'T': '#bf7bff', 'Z': '#ff4d6d',
    'G': '#6b7280' // śmieci z trybu Wyzwanie
};

const PIECES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

// Dźwięki
const sounds = {
    music: new Audio("assets/sounds/tetris/tetris-bg.mp3"),
    line: new Audio("assets/sounds/global/line-clear.mp3"),
    levelup: new Audio("assets/sounds/global/success.mp3"),
    drop: new Audio("assets/sounds/global/drop.mp3"),
    rotate: new Audio("assets/sounds/global/rotate.mp3"),
    gameover: new Audio("assets/sounds/global/gameover-retro.mp3")
};

// Konfiguracja audio
sounds.music.loop = true;
const musicSliderInit = document.getElementById('volume-music');
sounds.music.volume = musicSliderInit ? parseFloat(musicSliderInit.value) : 0.3;

// Głośność efektów startowa pochodzi z suwaka w tetris.html (atrybut value)
const effectsSliderInit = document.getElementById('volume-effects');
const effectsStartVol = effectsSliderInit ? parseFloat(effectsSliderInit.value) : 0.3;
['line', 'levelup', 'drop', 'rotate', 'gameover'].forEach(k => { sounds[k].volume = effectsStartVol; });

function playSound(snd) {
    snd.currentTime = 0;
    snd.play().catch(() => {});
}

function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

// --- ZAPIS ---

function loadJSON(key, fallback) {
    try {
        let v = store.get(key);
        if (v === null || v === undefined || v === '') return fallback;
        if (typeof v === 'string') v = JSON.parse(v);
        if (typeof v === 'string') v = JSON.parse(v);
        return (v && typeof v === 'object') ? v : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    try { store.set(key, JSON.stringify(value)); } catch (e) { /* brak zapisu - gra działa dalej */ }
}

const stats = Object.assign(
    { games: 0, lines: 0, tetrises: 0, tspins: 0, bestCombo: 0, playSeconds: 0 },
    loadJSON(STATS_KEY, {})
);
const achSaved = loadJSON(ACH_KEY, []);
const unlockedAch = new Set(Array.isArray(achSaved) ? achSaved : []);

// --- TRYBY GRY ---

const MODES = {
    marathon:  { name: 'Maraton',          desc: 'Klasyczna gra bez końca. Czyść linie, aż plansza się zapełni.' },
    sprint:    { name: 'Sprint 40 linii',  desc: 'Wyczyść 40 linii jak najszybciej.' },
    ultra:     { name: 'Ultra 2 min',      desc: 'Zdobądź jak najwięcej punktów w 2 minuty.' },
    zen:       { name: 'Zen',              desc: 'Bez poziomów i bez przegranej. Pełna plansza jest czyszczona.' },
    challenge: { name: 'Wyzwanie',         desc: 'Od dołu dochodzą losowe linie ze śmieciami. Czyść szybciej!' }
};

let selectedMode = String(store.get(MODE_KEY) || 'marathon').replace(/"/g, '');
if (!MODES[selectedMode]) selectedMode = 'marathon';
let mode = selectedMode; // tryb aktualnie rozgrywanej partii

function bestKey(m) {
    return m === 'marathon' ? HIGHSCORE_KEY : BEST_KEY_PREFIX + m;
}

function getBest(m) {
    return parseInt(store.get(bestKey(m)), 10) || 0;
}

function formatTime(ms, hundredths = false) {
    const total = Math.max(0, Math.floor(ms));
    const m = Math.floor(total / 60000);
    const s = Math.floor(total / 1000) % 60;
    let out = `${m}:${String(s).padStart(2, '0')}`;
    if (hundredths) out += `.${String(Math.floor((total % 1000) / 10)).padStart(2, '0')}`;
    return out;
}

function refreshBestDisplay(m) {
    if (!highScoreEl) return;
    const label = highScoreEl.parentElement && highScoreEl.parentElement.querySelector('.label');
    const best = getBest(m);

    if (m === 'sprint') {
        if (label) label.textContent = 'Najlepszy czas';
        highScoreEl.textContent = best ? formatTime(best, true) : '-';
    } else if (m === 'zen') {
        if (label) label.textContent = 'Rekord';
        highScoreEl.textContent = '-';
    } else {
        if (label) label.textContent = 'Rekord';
        highScoreEl.textContent = best;
    }
}

// --- SKÓRKI ---

const SKINS = [
    { id: 'neon',  name: 'Neon',         unlock: 0 },
    { id: 'glass', name: 'Szkło',        unlock: 300 },
    { id: 'retro', name: 'Retro 8-bit',  unlock: 1000 },
    { id: 'metal', name: 'Metaliczny',   unlock: 3000 }
]; // unlock = łączna liczba wyczyszczonych linii

let currentSkin = String(store.get(SKIN_KEY) || 'neon').replace(/"/g, '');
const tileCache = {};

function refreshSkinOptions() {
    if (!skinSelect) return;
    const cur = SKINS.find(s => s.id === currentSkin);
    if (!cur || stats.lines < cur.unlock) currentSkin = 'neon';

    skinSelect.innerHTML = '';
    SKINS.forEach(s => {
        const opt = document.createElement('option');
        const locked = stats.lines < s.unlock;
        opt.value = s.id;
        opt.disabled = locked;
        opt.textContent = locked ? `🔒 ${s.name} (${s.unlock.toLocaleString('pl-PL')} linii)` : s.name;
        skinSelect.appendChild(opt);
    });
    skinSelect.value = currentSkin;
}

// --- KOLORY / SPRITE'Y KLOCKÓW ---

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = c => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function withAlpha(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbStr(c) {
    return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

function pathRound(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else g.rect(x, y, w, h);
}

function buildTile(color, skin) {
    const S = Math.round(TILE * DPR);
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d');

    const pad = Math.max(1, Math.round(S * 0.04));
    const x = pad, y = pad, w = S - pad * 2;

    if (skin === 'glass') {
        pathRound(g, x, y, w, w, S * 0.14);
        g.fillStyle = withAlpha(color, 0.55);
        g.fill();
        const gr = g.createLinearGradient(0, y, 0, y + w);
        gr.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        gr.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        gr.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        g.fillStyle = gr;
        g.fill();
        g.lineWidth = Math.max(1, S * 0.04);
        g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        g.stroke();
    } else if (skin === 'retro') {
        const b = Math.max(2, S * 0.09);
        g.fillStyle = shade(color, -0.55);
        g.fillRect(x, y, w, w);
        g.fillStyle = color;
        g.fillRect(x + b, y + b, w - b * 2, w - b * 2);
        g.fillStyle = shade(color, 0.6);
        g.fillRect(x + b, y + b, w - b * 2, b);
        g.fillRect(x + b, y + b, b, w - b * 2);
        g.fillStyle = shade(color, -0.3);
        g.fillRect(x + b, y + w - b * 2, w - b * 2, b);
        g.fillRect(x + w - b * 2, y + b, b, w - b * 2);
    } else if (skin === 'metal') {
        const gr = g.createLinearGradient(x, y, x + w, y + w);
        gr.addColorStop(0, shade(color, 0.65));
        gr.addColorStop(0.45, color);
        gr.addColorStop(1, shade(color, -0.55));
        pathRound(g, x, y, w, w, S * 0.1);
        g.fillStyle = gr;
        g.fill();
        g.lineWidth = Math.max(1, S * 0.05);
        g.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        g.stroke();
        g.fillStyle = 'rgba(255, 255, 255, 0.35)';
        g.fillRect(x + S * 0.1, y + S * 0.1, w - S * 0.2, Math.max(1, S * 0.06));
    } else {
        // neon
        const inset = S * 0.09;
        pathRound(g, x + inset, y + inset, w - inset * 2, w - inset * 2, S * 0.12);
        g.fillStyle = withAlpha(color, 0.2);
        g.fill();
        g.shadowColor = color;
        g.shadowBlur = S * 0.14;
        g.lineWidth = Math.max(2, S * 0.06);
        g.strokeStyle = color;
        g.stroke();
        g.stroke();
    }
    return c;
}

function getTile(type) {
    const key = currentSkin + '|' + type;
    if (!tileCache[key]) tileCache[key] = buildTile(COLORS[type] || '#888888', currentSkin);
    return tileCache[key];
}

function setSkin(id) {
    currentSkin = id;
    Object.keys(tileCache).forEach(k => delete tileCache[k]);
}

// --- STAN GRY ---

let dropCounter = 0, dropInterval = 1000, lastTime = 0;
let score = 0, lines = 0, level = 1;
let queue = [];
let held = null, canHold = true;
let paused = false, running = false, gameOver = false;
let animationFrameId = null;
let elapsed = 0;

let combo = -1;
let backToBack = false;
let lastWasRotation = false;
let lockTimer = 0, lockResets = 0, lowestY = 0;
let garbageTimer = 0;
let sprintFinishedAt = null;
let clearing = null;
let runFinalized = true;
let run = createRun();

let particles = [];
let floaters = [];
let shakeMag = 0;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    type: null,
    rot: 0
};

const inputs = { left: false, right: false, down: false, moveDir: 0, moveTimer: 0, softTimer: 0 };

function createRun() {
    return { newAch: [], newSkins: [], newRecord: false, tetrises: 0, tspins: 0, bestCombo: 0 };
}

function resetInputs() {
    inputs.left = inputs.right = inputs.down = false;
    inputs.moveDir = 0;
    inputs.moveTimer = 0;
    inputs.softTimer = 0;
}

// --- TŁO ZALEŻNE OD POZIOMU ---

const LEVEL_THEMES = [
    { top: [15, 17, 19], bottom: [15, 17, 19] },
    { top: [14, 18, 40], bottom: [28, 14, 50] },
    { top: [8, 32, 36],  bottom: [10, 54, 50] },
    { top: [42, 14, 24], bottom: [66, 18, 32] },
    { top: [0, 0, 10],   bottom: [32, 8, 62] }
];

function themeForLevel(l) {
    return LEVEL_THEMES[Math.min(LEVEL_THEMES.length - 1, Math.floor((l - 1) / 3))];
}

const bgCur = { top: LEVEL_THEMES[0].top.slice(), bottom: LEVEL_THEMES[0].bottom.slice() };

// --- OSIĄGNIĘCIA ---

// Format taki sam jak w Dino i Statkach: ikona, nazwa, opis oraz (opcjonalnie) cel z postępem.
// Identyfikatory zostały bez zmian, więc dotychczas zdobyte osiągnięcia zostają zapisane.
const ACHIEVEMENTS = [
    { id: 'tetris1',      icon: '🧱', name: 'Pierwszy Tetris',   desc: 'Wyczyść 4 linie naraz.' },
    { id: 'tspin',        icon: '🌀', name: 'Mistrz T-spinów',   desc: 'Wykonaj T-spin.' },
    { id: 'b2b',          icon: '🔗', name: 'Back-to-Back',      desc: 'Wykonaj dwa trudne czyszczenia z rzędu (Tetris lub T-spin).' },
    { id: 'combo5',       icon: '🔥', name: 'Combo x5',          desc: 'Czyść linie 5 razy z rzędu.' },
    { id: 'level10',      icon: '🚀', name: 'Poziom 10',         desc: 'Osiągnij 10. poziom w jednej grze.' },
    { id: 'sprint150',    icon: '⏱️', name: 'Sprinter',          desc: 'Ukończ Sprint 40 linii w czasie poniżej 2:30.' },
    { id: 'lines500',     icon: '📏', name: 'Budowniczy',        desc: 'Wyczyść łącznie 500 linii.',
      goal: 500, hint: 'Linie łącznie', progress: () => stats.lines },
    { id: 'challenge180', icon: '🧗', name: 'Twardziel',         desc: 'Przetrwaj 3 minuty w trybie Wyzwanie.' }
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

function unlockAch(id) {
    const a = ACH_BY_ID[id];
    if (!a || unlockedAch.has(id)) return;
    unlockedAch.add(id);
    saveJSON(ACH_KEY, Array.from(unlockedAch));
    run.newAch.push(a.name);
    addFloater(`🏆 ${a.name}`, '#ffd000');
    renderAchievements();
}

// Osiągnięcia z celem odblokowują się od razu, jeśli zapisane statystyki już je spełniają
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

// Zerowanie rekordów, statystyk i osiągnięć (ta sama opcja i komunikat co w pozostałych grach)
function resetProgress() {
    if (running && !gameOver && !paused) togglePause();
    if (!window.confirm('Na pewno wyzerować rekord, statystyki i osiągnięcia w Tetrisie?')) return;

    const removeKey = k => { try { store.remove(k); } catch (e) { /* brak zapisu */ } };

    Object.keys(MODES).forEach(m => removeKey(bestKey(m)));
    Object.assign(stats, { games: 0, lines: 0, tetrises: 0, tspins: 0, bestCombo: 0, playSeconds: 0 });
    removeKey(STATS_KEY);
    unlockedAch.clear();
    removeKey(ACH_KEY);

    // Skórki odblokowuje liczba linii, więc po wyzerowaniu wraca Neon
    refreshSkinOptions();
    setSkin(currentSkin);
    store.set(SKIN_KEY, currentSkin);

    refreshBestDisplay(running ? mode : selectedMode);
    renderAchievements();
    draw();
    drawQueue();
    drawHoldBox();
}

function formatPlayTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Lista osiągnięć widoczna na stronie (sekcja #tetris-achievements)
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

        // Pasek postępu (tylko osiągnięcia liczone łącznie)
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
            hint.textContent = `${a.hint}: ${cur.toLocaleString('pl-PL')} / ${a.goal.toLocaleString('pl-PL')}`;
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
        summary.textContent =
            `Rozegrane gry: ${stats.games} • Linie: ${stats.lines.toLocaleString('pl-PL')} • ` +
            `Tetrisy: ${stats.tetrises} • T-spiny: ${stats.tspins} • ` +
            `Najlepsze combo: x${stats.bestCombo} • Czas gry: ${formatPlayTime(stats.playSeconds)}`;
    }
}

// --- PEŁNY EKRAN ---

function isFullscreenActive() {
    return GameFullscreen.isActive(tetrisContainer);
}

function updateFullscreenUI() {
    const active = isFullscreenActive();
    if (fullscreenBtn) {
        fullscreenBtn.textContent = active ? '✕' : '⛶';
        fullscreenBtn.title = active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran';
        fullscreenBtn.setAttribute('aria-label', active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran');
    }
    document.body.style.overflow = active ? 'hidden' : '';
    draw();
    drawQueue();
}

function toggleFullscreen() {
    GameFullscreen.toggle(tetrisContainer, updateFullscreenUI);
}

// --- CZĄSTECZKI I NAPISY ---

function burstAt(px, py, count, color, speed = 160) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.8);
        particles.push({
            x: px, y: py,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
            life: 0.45 + Math.random() * 0.35, max: 0.8,
            size: 2 + Math.random() * 3, color
        });
    }
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
}

function addFloater(text, color = '#ffffff') {
    floaters.push({ text, color, t: 0, dur: 1.6 });
    if (floaters.length > 5) floaters.shift();
}

function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.vy += 700 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
        floaters[i].t += dt;
        if (floaters[i].t >= floaters[i].dur) floaters.splice(i, 1);
    }
    shakeMag = Math.max(0, shakeMag - 30 * dt);

    const target = themeForLevel(level);
    const k = Math.min(1, dt * 1.5);
    for (let i = 0; i < 3; i++) {
        bgCur.top[i] += (target.top[i] - bgCur.top[i]) * k;
        bgCur.bottom[i] += (target.bottom[i] - bgCur.bottom[i]) * k;
    }
}

// --- RYSOWANIE ---

function draw() {
    if (!ctx || !board) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (shakeMag > 0) {
        ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    }

    // Tło
    const gr = ctx.createLinearGradient(0, 0, 0, 600);
    gr.addColorStop(0, rgbStr(bgCur.top));
    gr.addColorStop(1, rgbStr(bgCur.bottom));
    ctx.fillStyle = gr;
    ctx.fillRect(-10, -10, 320, 620);

    // Siatka
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
        ctx.moveTo(x * TILE + 0.5, 0);
        ctx.lineTo(x * TILE + 0.5, ROWS * TILE);
    }
    for (let y = 1; y < ROWS; y++) {
        ctx.moveTo(0, y * TILE + 0.5);
        ctx.lineTo(COLS * TILE, y * TILE + 0.5);
    }
    ctx.stroke();

    // Zablokowane klocki
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const v = ARENA[y][x];
            if (v) ctx.drawImage(getTile(v), x * TILE, y * TILE, TILE, TILE);
        }
    }

    // Błysk czyszczonych linii
    if (clearing) {
        const p = clearing.t / clearing.dur;
        const alpha = Math.abs(Math.sin(p * Math.PI * 3)) * 0.85;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        clearing.rows.forEach(y => ctx.fillRect(0, y * TILE, COLS * TILE, TILE));
    }

    // Duch i aktywny klocek
    if (player.matrix) {
        const gpos = ghostPosition();
        const col = COLORS[player.type];
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (!value) return;
                const px = (x + gpos.x) * TILE, py = (y + gpos.y) * TILE;
                ctx.fillStyle = withAlpha(col, 0.1);
                ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
                ctx.strokeStyle = withAlpha(col, 0.55);
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
            });
        });

        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.drawImage(getTile(player.type), (x + player.pos.x) * TILE, (y + player.pos.y) * TILE, TILE, TILE);
                }
            });
        });
    }

    // Cząsteczki
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Napisy
    floaters.forEach((f, i) => {
        const fadeIn = Math.min(1, f.t / 0.15);
        const fadeOut = Math.min(1, (f.dur - f.t) / 0.5);
        ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        const y = 140 + i * 28 - Math.min(1, f.t) * 10;
        ctx.strokeText(f.text, 150, y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 150, y);
    });
    ctx.globalAlpha = 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function bounds(m) {
    let minX = 99, maxX = -1, minY = 99, maxY = -1;
    m.forEach((row, y) => row.forEach((v, x) => {
        if (v) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    }));
    return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function drawPieceCentered(c2d, type, cx, cy, scale) {
    const m = PIECES[type];
    const b = bounds(m);
    const ox = cx - (b.w * scale) / 2;
    const oy = cy - (b.h * scale) / 2;
    const tile = getTile(type);
    m.forEach((row, y) => row.forEach((v, x) => {
        if (v) c2d.drawImage(tile, ox + (x - b.minX) * scale, oy + (y - b.minY) * scale, scale, scale);
    }));
}

function drawHoldBox() {
    if (!hctx) return;
    hctx.clearRect(0, 0, hctx.canvas.width, hctx.canvas.height);
    if (!held) return;
    hctx.globalAlpha = canHold ? 1 : 0.35;
    drawPieceCentered(hctx, held, hctx.canvas.width / 2, hctx.canvas.height / 2, 22);
    hctx.globalAlpha = 1;
}

// Podgląd 3 następnych klocków (na małych ekranach tylko najbliższy)
function drawQueue() {
    if (!nctx) return;
    const W = nctx.canvas.width, H = nctx.canvas.height;
    nctx.clearRect(0, 0, W, H);
    if (queue.length === 0) return;

    const compact = ncv && ncv.clientWidth && ncv.clientWidth < 70;
    if (compact) {
        drawPieceCentered(nctx, queue[0], W / 2, H / 2, 22);
        return;
    }

    const scales = [16, 11, 11];
    const gap = 8;
    let total = gap * 2;
    scales.forEach((s, i) => { total += bounds(PIECES[queue[i]]).h * s; });
    let y = (H - total) / 2;
    scales.forEach((s, i) => {
        const type = queue[i];
        const h = bounds(PIECES[type]).h * s;
        drawPieceCentered(nctx, type, W / 2, y + h / 2, s);
        y += h + gap;
    });
}

// --- MECHANIKA ---

function createMatrix(w, h) {
    const m = [];
    while (h--) m.push(new Array(w).fill(0));
    return m;
}

function pieceMatrix(type) {
    return PIECES[type].map(row => [...row]);
}

function collide(arena, p) {
    if (!p.matrix) return false;
    const [m, o] = [p.matrix, p.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, p) {
    if (!p.matrix) return;
    p.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0 && arena[y + p.pos.y]) {
                arena[y + p.pos.y][x + p.pos.x] = p.type;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

// Tablice wall kicków SRS (konwencja z wiki: y rośnie w górę, przy użyciu odwracamy y)
const KICKS_JLSTZ = {
    '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
const KICKS_I = {
    '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

function isGrounded() {
    if (!player.matrix) return false;
    player.pos.y++;
    const c = collide(ARENA, player);
    player.pos.y--;
    return c;
}

// Po udanym ruchu/obrocie: odnów lock delay (ograniczoną liczbę razy)
function afterAdjust() {
    if (isGrounded()) {
        if (lockResets < MAX_LOCK_RESETS) {
            lockTimer = 0;
            lockResets++;
        }
    } else {
        lockTimer = 0;
    }
}

function movePiece(dir) {
    if (!player.matrix || clearing || !running || paused) return false;
    player.pos.x += dir;
    if (collide(ARENA, player)) {
        player.pos.x -= dir;
        return false;
    }
    lastWasRotation = false;
    afterAdjust();
    return true;
}

function playerRotate(dir) {
    if (!player.matrix || clearing || !running || paused) return;
    const from = player.rot;
    const to = (from + dir + 4) % 4;
    rotate(player.matrix, dir);

    let success = false;
    if (player.type === 'O') {
        success = true;
    } else {
        const table = player.type === 'I' ? KICKS_I : KICKS_JLSTZ;
        const kicks = table[`${from}${to}`] || [[0, 0]];
        const ox = player.pos.x, oy = player.pos.y;
        for (let i = 0; i < kicks.length; i++) {
            player.pos.x = ox + kicks[i][0];
            player.pos.y = oy - kicks[i][1];
            if (!collide(ARENA, player)) {
                success = true;
                break;
            }
        }
        if (!success) {
            player.pos.x = ox;
            player.pos.y = oy;
        }
    }

    if (!success) {
        rotate(player.matrix, -dir);
        return;
    }

    player.rot = to;
    lastWasRotation = true;
    if (player.pos.y > lowestY) { lowestY = player.pos.y; lockResets = 0; }
    afterAdjust();
    playSound(sounds.rotate);
}

// Opuszczenie o 1 pole z klawisza/przycisku (+1 pkt). Przy styku z podłożem klocek się blokuje.
function softDropStep() {
    if (!player.matrix || clearing || !running || paused) return;
    player.pos.y++;
    if (collide(ARENA, player)) {
        player.pos.y--;
        lockPiece();
        return;
    }
    score += 1;
    lastWasRotation = false;
    dropCounter = 0;
    if (player.pos.y > lowestY) { lowestY = player.pos.y; lockResets = 0; }
    scoreEl && (scoreEl.textContent = score);
}

// Grawitacja (bez punktów, bez natychmiastowego blokowania)
function gravityStep() {
    player.pos.y++;
    if (collide(ARENA, player)) {
        player.pos.y--;
    } else {
        lastWasRotation = false;
        if (player.pos.y > lowestY) { lowestY = player.pos.y; lockResets = 0; }
    }
}

function hardDrop() {
    if (gameOver || paused || !running || !player.matrix || clearing) return;
    let dist = 0;
    while (!collide(ARENA, player)) {
        player.pos.y++;
        dist++;
    }
    player.pos.y--;
    dist--;

    if (dist > 0) {
        score += dist * 2;
        lastWasRotation = false;
    }

    // Iskry przy lądowaniu
    const col = COLORS[player.type];
    player.matrix.forEach((row, y) => row.forEach((v, x) => {
        if (v) burstAt((x + player.pos.x + 0.5) * TILE, (y + player.pos.y + 1) * TILE, 1, col, 90);
    }));
    shakeMag = Math.max(shakeMag, 3);

    lockPiece();
}

function ghostPosition() {
    const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
    while (!collide(ARENA, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost.pos;
}

function detectTSpin() {
    if (player.type !== 'T' || !lastWasRotation) return false;
    const corners = [[0, 0], [2, 0], [0, 2], [2, 2]];
    let n = 0;
    corners.forEach(([dx, dy]) => {
        const x = player.pos.x + dx, y = player.pos.y + dy;
        if (y < 0) return;
        if (x < 0 || x >= COLS || y >= ROWS || ARENA[y][x] !== 0) n++;
    });
    return n >= 3;
}

function findFullRows() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
        if (ARENA[y].every(v => v !== 0)) rows.push(y);
    }
    return rows;
}

function lockPiece() {
    if (!player.matrix) return;
    const tspin = detectTSpin();

    merge(ARENA, player);
    playSound(sounds.drop);
    player.matrix = null;

    const rows = findFullRows();
    if (rows.length > 0) {
        startClear(rows, tspin);
    } else {
        combo = -1;
        if (tspin) {
            score += 400 * level;
            stats.tspins++;
            run.tspins++;
            addFloater('T-SPIN', '#bf7bff');
            unlockAch('tspin');
        }
        afterLock();
    }
}

function afterLock() {
    playerReset();
    updateStats();
}

function startClear(rows, tspin) {
    scoreClear(rows.length, tspin);

    rows.forEach(y => {
        for (let x = 0; x < COLS; x++) {
            const col = COLORS[ARENA[y][x]] || '#ffffff';
            burstAt((x + 0.5) * TILE, (y + 0.5) * TILE, 2, col, 200);
        }
    });

    clearing = { rows, t: 0, dur: 0.32 };
    shakeMag = Math.max(shakeMag, 3 + rows.length * 2);
    playSound(sounds.line);
    vibrate(rows.length === 4 ? 60 : rows.length * 15);
    updateStats();
}

function finishClear() {
    const rows = clearing.rows;
    clearing = null;

    for (let i = rows.length - 1; i >= 0; i--) ARENA.splice(rows[i], 1);
    while (ARENA.length < ROWS) ARENA.unshift(new Array(COLS).fill(0));

    if (mode === 'sprint' && lines >= SPRINT_LINES) {
        gameEnd('sprintDone');
        return;
    }
    afterLock();
}

function scoreClear(count, tspin) {
    const names = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'];
    let pts = tspin ? [400, 800, 1200, 1600][count] : [0, 100, 300, 500, 800][count];
    pts *= level;

    const difficult = count === 4 || (tspin && count > 0);

    if (tspin) {
        addFloater(`T-SPIN ${names[count]}`, '#bf7bff');
        stats.tspins++;
        run.tspins++;
        unlockAch('tspin');
    } else if (count >= 2) {
        addFloater(names[count], count === 4 ? '#20c4ff' : '#ffffff');
    }

    if (count === 4) {
        stats.tetrises++;
        run.tetrises++;
        unlockAch('tetris1');
    }

    if (difficult && backToBack) {
        pts = Math.floor(pts * 1.5);
        addFloater('BACK-TO-BACK', '#ffd000');
        unlockAch('b2b');
    }
    backToBack = difficult;

    combo++;
    if (combo > 0) {
        pts += 50 * combo * level;
        if (combo >= 2) addFloater(`COMBO x${combo}`, '#ff9f1c');
        stats.bestCombo = Math.max(stats.bestCombo, combo);
        run.bestCombo = Math.max(run.bestCombo, combo);
        if (combo >= 4) unlockAch('combo5');
    }

    score += pts;
    lines += count;

    if (mode === 'sprint' && lines >= SPRINT_LINES && sprintFinishedAt === null) {
        sprintFinishedAt = elapsed;
    }

    if (mode !== 'zen') {
        while (lines >= level * 10) {
            level++;
            dropInterval = Math.max(120, 1000 - (level - 1) * 80);
            playSound(sounds.levelup);
            addFloater(`POZIOM ${level}`, '#3bd16f');
            if (level >= 10) unlockAch('level10');
        }
    }
}

function holdPiece() {
    if (!canHold || paused || !running || !player.type || clearing || !player.matrix) return;
    const cur = player.type;

    if (!held) {
        held = cur;
        playerReset();
    } else {
        const prev = held;
        const m = pieceMatrix(prev);
        const test = {
            matrix: m,
            pos: { x: Math.floor(COLS / 2) - Math.ceil(m[0].length / 2), y: 0 }
        };
        if (collide(ARENA, test)) return; // brak miejsca na zamianę

        held = cur;
        player.type = prev;
        player.matrix = m;
        player.pos.x = test.pos.x;
        player.pos.y = test.pos.y;
        player.rot = 0;
        lastWasRotation = false;
        lockTimer = 0;
        lockResets = 0;
        lowestY = 0;
        dropCounter = 0;
    }

    canHold = false;
    drawHoldBox();
}

function ensureQueue() {
    while (queue.length < 7) {
        queue = queue.concat(shuffle(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
    }
}

function nextFromQueue() {
    ensureQueue();
    const next = queue.shift();
    ensureQueue();
    drawQueue();
    return next;
}

function playerReset() {
    player.type = nextFromQueue();
    player.matrix = pieceMatrix(player.type);
    player.rot = 0;
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.ceil(player.matrix[0].length / 2);
    canHold = true;
    lastWasRotation = false;
    lockTimer = 0;
    lockResets = 0;
    lowestY = 0;
    dropCounter = 0;
    inputs.softTimer = -150; // przytrzymane ↓ nie "wpada" od razu w kolejny klocek
    drawHoldBox();

    if (collide(ARENA, player)) {
        if (mode === 'zen') {
            // Zen: pełna plansza jest po prostu czyszczona
            ARENA.forEach(r => r.fill(0));
            burstAt(150, 300, 40, '#ffffff', 300);
            addFloater('PLANSZA WYCZYSZCZONA', '#3bd16f');
        } else {
            gameEnd('topout');
        }
    }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Tryb Wyzwanie: nowa linia ze śmieciami (jedna dziura) od dołu
function addGarbageRow() {
    if (ARENA[0].some(v => v !== 0)) {
        gameEnd('topout');
        return;
    }
    ARENA.shift();
    const row = new Array(COLS).fill('G');
    row[Math.floor(Math.random() * COLS)] = 0;
    ARENA.push(row);

    while (player.matrix && collide(ARENA, player)) {
        player.pos.y--;
        if (player.pos.y < 0) {
            gameEnd('topout');
            return;
        }
    }
    shakeMag = Math.max(shakeMag, 4);
    playSound(sounds.drop);
}

function updateStats() {
    if (scoreEl) scoreEl.textContent = score;
    if (linesEl) linesEl.textContent = mode === 'sprint' ? `${lines}/${SPRINT_LINES}` : lines;
    if (levelEl) levelEl.textContent = mode === 'zen' ? '∞' : level;
}

let lastTimeText = '';
function updateTime() {
    if (!timeEl) return;
    let text;
    if (mode === 'ultra') text = formatTime(Math.ceil((ULTRA_MS - elapsed) / 1000) * 1000);
    else if (mode === 'sprint') text = formatTime(elapsed, true);
    else text = formatTime(elapsed);
    if (text !== lastTimeText) {
        lastTimeText = text;
        timeEl.textContent = text;
    }
}

// --- WEJŚCIE (DAS / ARR) ---

function stepInputs(delta) {
    if (inputs.moveDir !== 0) {
        inputs.moveTimer += delta;
        while (inputs.moveTimer >= ARR) {
            movePiece(inputs.moveDir);
            inputs.moveTimer -= ARR;
            if (!player.matrix || clearing) return;
        }
    }
    if (inputs.down) {
        inputs.softTimer += delta;
        while (inputs.softTimer >= SOFT_INTERVAL) {
            softDropStep();
            inputs.softTimer -= SOFT_INTERVAL;
            if (!player.matrix || clearing) return;
        }
    }
}

// --- PĘTLA GRY ---

function update(time = 0) {
    if (!running || paused || gameOver) return;
    let delta = time - lastTime;
    lastTime = time;
    if (delta > 100) delta = 100;
    if (delta < 0) delta = 0;
    const dt = delta / 1000;

    elapsed += delta;
    updateEffects(dt);

    if (mode === 'challenge' && elapsed >= 180000) unlockAch('challenge180');

    if (mode === 'ultra' && elapsed >= ULTRA_MS) {
        elapsed = ULTRA_MS;
        updateTime();
        gameEnd('ultraDone');
        return;
    }

    if (clearing) {
        clearing.t += dt;
        if (clearing.t >= clearing.dur) finishClear();
    } else if (player.matrix) {
        stepInputs(delta);

        if (!clearing && player.matrix) {
            dropCounter += delta;
            if (dropCounter >= dropInterval) {
                dropCounter = 0;
                gravityStep();
            }

            if (isGrounded()) {
                lockTimer += delta;
                if (lockTimer >= LOCK_DELAY) lockPiece();
            } else {
                lockTimer = 0;
            }
        }

        if (mode === 'challenge' && running && !clearing && player.matrix) {
            garbageTimer += dt;
            const interval = Math.max(5, 12 - (level - 1) * 0.5);
            if (garbageTimer >= interval) {
                garbageTimer = 0;
                addGarbageRow();
            }
        }
    }

    updateTime();
    if (running && !gameOver) draw();
    if (running && !paused && !gameOver) {
        animationFrameId = requestAnimationFrame(update);
    }
}

// --- LOGIKA MENU I PRZYCISKÓW ---

function updateMenuTexts() {
    if (!tetrisMenu || running) return;
    const name = MODES[selectedMode].name;
    if (gameOver) {
        if (menuInstruction) menuInstruction.textContent = `↵ lub Enter – zagraj ponownie (${name})`;
    } else {
        if (menuTitle) menuTitle.textContent = 'Tetris';
        if (menuInstruction) menuInstruction.textContent = `${name} • Kliknij ↵ lub dotknij`;
        if (menuExtra) menuExtra.textContent = MODES[selectedMode].desc;
    }
}

function gameStart() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    mode = selectedMode;
    ARENA.forEach(r => r.fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = mode === 'zen' ? 800 : 1000;
    dropCounter = 0;
    elapsed = 0;
    combo = -1;
    backToBack = false;
    garbageTimer = 0;
    sprintFinishedAt = null;
    clearing = null;
    particles = [];
    floaters = [];
    shakeMag = 0;
    run = createRun();
    runFinalized = false;
    lastTimeText = '';

    bgCur.top = LEVEL_THEMES[0].top.slice();
    bgCur.bottom = LEVEL_THEMES[0].bottom.slice();

    queue = shuffle(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    held = null;
    canHold = true;
    paused = false;
    gameOver = false;
    resetInputs();

    drawHoldBox();
    refreshBestDisplay(mode);
    running = true;
    playerReset();
    updateStats();
    updateTime();

    if (tetrisMenu) {
        tetrisMenu.classList.add('hidden');
        tetrisMenu.classList.remove('game-over-border');
    }

    lastTime = performance.now();
    try {
        sounds.music.play().catch(() => {});
    } catch (e) {}
    animationFrameId = requestAnimationFrame(update);
}

// Zapis statystyk i rekordu (raz na partię)
function finalizeRun(reason) {
    if (runFinalized) return;
    runFinalized = true;

    const prevLines = stats.lines;
    stats.games += 1;
    stats.lines += lines;
    stats.playSeconds += Math.round(elapsed / 1000);
    run.newSkins = SKINS.filter(s => s.unlock > prevLines && s.unlock <= stats.lines);

    if (stats.lines >= 500) unlockAch('lines500');

    // Rekord
    if (mode === 'sprint') {
        if (reason === 'sprintDone' && sprintFinishedAt !== null) {
            const best = getBest('sprint');
            if (!best || sprintFinishedAt < best) {
                store.set(bestKey('sprint'), Math.round(sprintFinishedAt));
                run.newRecord = true;
            }
            if (sprintFinishedAt < 150000) unlockAch('sprint150');
        }
    } else if (mode !== 'zen') {
        if (score > getBest(mode)) {
            store.set(bestKey(mode), score);
            run.newRecord = true;
        }
    }

    saveJSON(STATS_KEY, stats);
    refreshSkinOptions();
    refreshBestDisplay(mode);
    renderAchievements();
}

function gameEnd(reason = 'topout') {
    if (gameOver) return;
    running = false;
    gameOver = true;
    clearing = null;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    resetInputs();
    finalizeRun(reason);

    const modeName = MODES[mode].name;
    const titles = { topout: 'Koniec gry', sprintDone: 'Sprint ukończony!', ultraDone: 'Czas minął!' };

    if (menuTitle) menuTitle.textContent = titles[reason] || 'Koniec gry';
    if (menuInstruction) menuInstruction.textContent = `↵ lub Enter – zagraj ponownie (${MODES[selectedMode].name})`;

    if (menuExtra) {
        const parts = [`${modeName}`];
        if (mode === 'sprint' && reason === 'sprintDone') parts.push(`Czas: ${formatTime(sprintFinishedAt, true)}`);
        else parts.push(`Czas: ${formatTime(elapsed)}`);
        parts.push(`Wynik: ${score.toLocaleString('pl-PL')}`, `Linie: ${lines}`);
        let text = parts.join(' • ');
        if (run.newRecord) text += '\n🏆 Nowy rekord!';
        if (run.tetrises || run.tspins) text += `\nTetrisy: ${run.tetrises} • T-spiny: ${run.tspins}`;
        if (run.bestCombo >= 2) text += ` • Najlepsze combo: x${run.bestCombo}`;
        if (run.newAch.length) text += `\nOsiągnięcia: ${run.newAch.join(', ')}`;
        if (run.newSkins.length) text += `\n🔓 Nowa skórka: ${run.newSkins.map(s => s.name).join(', ')}`;
        text += `\nŁącznie: ${stats.games} gier • ${stats.lines} linii`;
        menuExtra.textContent = text;
    }

    if (tetrisMenu) {
        tetrisMenu.classList.remove('hidden');
        if (reason === 'topout') tetrisMenu.classList.add('game-over-border');
        else tetrisMenu.classList.remove('game-over-border');
    }

    playSound(reason === 'sprintDone' ? sounds.levelup : sounds.gameover);
    vibrate(120);
    sounds.music.pause();
    sounds.music.currentTime = 0;
    draw();
}

function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    resetInputs();

    if (menuTitle) menuTitle.textContent = paused ? 'Pauza' : 'Tetris';
    if (menuInstruction) menuInstruction.textContent = paused ? 'P – wznów • R – od nowa' : '↵ lub Enter – rozpocznij';
    if (menuExtra && paused) menuExtra.textContent = `${MODES[mode].name}`;

    if (tetrisMenu) {
        tetrisMenu.classList.toggle('hidden', !paused);
        tetrisMenu.classList.remove('game-over-border');
    }

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (!paused) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(update);
    }
}

function restartFromPause() {
    if (!paused) return;
    finalizeRun('quit');
    gameStart();
}

// --- ZDARZENIA ---

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen();
        fullscreenBtn.blur();
    });
}

document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

window.addEventListener('resize', () => {
    draw();
    drawQueue();
});

window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && tetrisContainer && tetrisContainer.classList.contains('is-fullscreen')) {
        tetrisContainer.classList.remove('is-fullscreen');
        updateFullscreenUI();
    }

    // Nie przechwytuj klawiszy w polach formularza (suwaki głośności używają strzałek)
    if (e.target.closest && e.target.closest('input, select, textarea')) return;

    if (running && !gameOver && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === 'Enter') {
        if (!running || gameOver) gameStart();
        return;
    }

    if (e.code === 'KeyP') {
        if (!e.repeat) togglePause();
        return;
    }

    if (e.code === 'KeyR') {
        if (!e.repeat) restartFromPause();
        return;
    }

    if (!running || paused || gameOver || clearing) return;

    // Powtarzanie klawiszy realizujemy sami (DAS/ARR), więc ignorujemy auto-repeat przeglądarki
    if (e.repeat) return;

    switch (e.code) {
        case 'ArrowLeft':
            inputs.left = true;
            inputs.moveDir = -1;
            inputs.moveTimer = -DAS;
            movePiece(-1);
            break;
        case 'ArrowRight':
            inputs.right = true;
            inputs.moveDir = 1;
            inputs.moveTimer = -DAS;
            movePiece(1);
            break;
        case 'ArrowDown':
            inputs.down = true;
            inputs.softTimer = -90;
            softDropStep();
            break;
        case 'ArrowUp':
        case 'KeyX':
            playerRotate(1);
            break;
        case 'KeyZ':
            playerRotate(-1);
            break;
        case 'Space':
            hardDrop();
            break;
        case 'KeyC':
            holdPiece();
            break;
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') {
        inputs.left = false;
        if (inputs.moveDir === -1) {
            inputs.moveDir = inputs.right ? 1 : 0;
            inputs.moveTimer = -DAS;
        }
    } else if (e.code === 'ArrowRight') {
        inputs.right = false;
        if (inputs.moveDir === 1) {
            inputs.moveDir = inputs.left ? -1 : 0;
            inputs.moveTimer = -DAS;
        }
    } else if (e.code === 'ArrowDown') {
        inputs.down = false;
    }
});

window.addEventListener('blur', resetInputs);

document.querySelectorAll(".tetris-mobile-controls button").forEach(btn => {
    btn.addEventListener("click", () => {
        const action = btn.id.replace('btn-', '');

        if (!running || gameOver) {
            if (action === "drop" || action === "start") {
                gameStart();
            }
            return;
        }

        if (paused) {
            if (action === "drop" || action === "start") {
                togglePause();
            }
            return;
        }

        switch (action) {
            case "left":
                movePiece(-1);
                break;
            case "right":
                movePiece(1);
                break;
            case "up":
                playerRotate(1);
                break;
            case "down":
                softDropStep();
                break;
            case "drop":
                hardDrop();
                break;
            case "hold":
            case "swap":
                holdPiece();
                break;
            case "start":
                togglePause();
                break;
        }
        draw();
    });
});

// Auto-powtarzanie przy przytrzymaniu strzałek na ekranie dotykowym
(function () {
    const box = document.querySelector('.tetris-mobile-controls');
    if (!box) return;
    const repeatIds = ['btn-left', 'btn-right', 'btn-down'];
    let delayTimer = null;
    let repeatTimer = null;

    const stop = () => {
        clearTimeout(delayTimer);
        clearInterval(repeatTimer);
        delayTimer = repeatTimer = null;
    };

    // Prawdziwy klik myszą/dotykiem jest zastąpiony serią kliknięć z pointerdown
    box.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && repeatIds.includes(btn.id) && e.isTrusted && e.detail > 0) e.stopPropagation();
    }, true);

    box.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !repeatIds.includes(btn.id)) return;
        e.preventDefault();
        stop();
        btn.click();
        delayTimer = setTimeout(() => {
            repeatTimer = setInterval(() => btn.click(), 90);
        }, 250);
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => box.addEventListener(type, stop));
    window.addEventListener('blur', stop);
})();

// Gesty na planszy: tap = obrót, przeciągnięcie w bok/w dół = ruch,
// szybkie machnięcie w dół = hard drop, w górę = hold
(function () {
    if (!board) return;
    let g = null;

    board.addEventListener('touchstart', (e) => {
        if (!running || paused || gameOver || clearing || e.touches.length !== 1) return;
        e.preventDefault();
        const t = e.touches[0];
        g = { x: t.clientX, y: t.clientY, lastX: t.clientX, lastY: t.clientY, t0: performance.now(), moved: false };
    }, { passive: false });

    board.addEventListener('touchmove', (e) => {
        if (!g) return;
        e.preventDefault();
        const t = e.touches[0];
        const rect = board.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;

        while (t.clientX - g.lastX >= cellW) { movePiece(1); g.lastX += cellW; g.moved = true; }
        while (g.lastX - t.clientX >= cellW) { movePiece(-1); g.lastX -= cellW; g.moved = true; }
        while (t.clientY - g.lastY >= cellH) {
            softDropStep();
            g.lastY += cellH;
            g.moved = true;
            if (!player.matrix || clearing || !running) break;
        }
    }, { passive: false });

    const end = (e) => {
        if (!g) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        const rect = board.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;
        const dx = t.clientX - g.x, dy = t.clientY - g.y;
        const dt = performance.now() - g.t0;

        if (!g.moved && Math.hypot(dx, dy) < 12 && dt < 300) {
            playerRotate(1);
        } else if (dy > cellH * 3 && dt < 250 && Math.abs(dx) < cellW * 2) {
            hardDrop();
        } else if (dy < -cellH * 3 && dt < 300 && Math.abs(dx) < cellW * 2) {
            holdPiece();
        }
        g = null;
    };
    board.addEventListener('touchend', end, { passive: false });
    board.addEventListener('touchcancel', () => { g = null; });
})();

// Automatyczna pauza po przełączeniu karty
document.addEventListener('visibilitychange', () => {
    if (document.hidden && running && !paused && !gameOver) togglePause();
});

const musicVolumeSlider = document.getElementById('volume-music');
if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', () => {
        sounds.music.volume = musicVolumeSlider.value;
    });
}

const effectsVolumeSlider = document.getElementById('volume-effects');
if (effectsVolumeSlider) {
    effectsVolumeSlider.addEventListener('input', () => {
        ['line', 'levelup', 'drop', 'rotate', 'gameover'].forEach(k => {
            sounds[k].volume = effectsVolumeSlider.value;
        });
    });
}

window.addEventListener('load', () => {
    // Lista trybów
    if (modeSelect) {
        modeSelect.innerHTML = '';
        Object.keys(MODES).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = MODES[id].name;
            modeSelect.appendChild(opt);
        });
        modeSelect.value = selectedMode;

        modeSelect.addEventListener('change', () => {
            selectedMode = modeSelect.value;
            store.set(MODE_KEY, selectedMode);
            modeSelect.blur(); // klawisze gry nie mogą zmieniać wyboru
            if (!running) {
                refreshBestDisplay(selectedMode);
                updateMenuTexts();
            }
        });
    }

    // Osiągnięcia na stronie
    syncAchievements();
    renderAchievements();

    const resetProgressBtn = document.getElementById('resetProgressBtn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', resetProgress);
    }

    // Lista skórek
    refreshSkinOptions();
    if (skinSelect) {
        skinSelect.addEventListener('change', () => {
            setSkin(skinSelect.value);
            store.set(SKIN_KEY, currentSkin);
            skinSelect.blur();
            draw();
            drawQueue();
            drawHoldBox();
        });
    }

    if (menuTitle) menuTitle.textContent = 'Tetris';
    if (tetrisMenu) {
        tetrisMenu.classList.remove('hidden');
        tetrisMenu.classList.remove('game-over-border');

        tetrisMenu.addEventListener('click', () => {
            if (!running || gameOver) {
                gameStart();
            } else if (paused) {
                togglePause();
            }
        });
    }

    updateMenuTexts();
    refreshBestDisplay(selectedMode);
    updateStats();
    updateTime();
    draw();
});