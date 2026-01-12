/**
 * Statki (Battleship)
 */

const BOARD_SIZE = 10;
const SHIPS_CONFIG = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]; 

// Elementy DOM
const playerGrid = document.getElementById('player-grid');
const computerGrid = document.getElementById('computer-grid');
const btnRandomize = document.getElementById('btn-randomize');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const logContent = document.getElementById('game-log');
const turnStatus = document.getElementById('turn-status');

// Stan Gry
let gameState = {
    active: false,
    playerTurn: true,
    playerShips: [],    
    computerShips: [],
    playerHits: 0,
    computerHits: 0,
    totalSegments: SHIPS_CONFIG.reduce((a, b) => a + b, 0),
    botQueue: [],
    lastHit: null,      // Zapamiętuje ostatnie trafienie {x, y}
    huntDirection: null // Zapamiętuje kierunek linii statku (np. 'v' dla pionu, 'h' dla poziomu)
};

// Dźwięki 
const audio = {
    music: new Audio("assets/sounds/statki/battle-bg.webm"),
    hit: new Audio("assets/sounds/global/hit.webm"),
    splash: new Audio("assets/sounds/global/drop.webm"), 
    win: new Audio("assets/sounds/global/success.webm"),
    lose: new Audio("assets/sounds/global/gameover-sad.webm")
};

// Głośność
Object.values(audio).forEach(s => s.volume = 0.3);
audio.music.loop = true;
audio.music.volume = 0.1;

/* --- OBSŁUGA GŁOŚNOŚCI --- */

const musicSlider = document.getElementById('volume-music');
if (musicSlider) {
    musicSlider.addEventListener('input', () => {
        audio.music.volume = musicSlider.value;
    });
}

const effectsSlider = document.getElementById('volume-effects');
if (effectsSlider) {
    effectsSlider.addEventListener('input', () => {
        const vol = effectsSlider.value;
        audio.hit.volume = vol;
        audio.splash.volume = vol;
        audio.win.volume = vol;
        audio.lose.volume = vol;
    });
}

/* --- INICJALIZACJA --- */

function initGame() {
    createGrid(playerGrid, 'player');
    createGrid(computerGrid, 'computer');
    resetData();
    randomizeShips(gameState.playerShips);
    renderGrid(playerGrid, gameState.playerShips, true);
    log("Witaj, Kapitanie. Rozmieść flotę i rozpocznij bitwę.", "info");
}

function resetData() {
    gameState.playerShips = createEmptyBoard();
    gameState.computerShips = createEmptyBoard();
    gameState.active = false;
    gameState.playerHits = 0;
    gameState.computerHits = 0;
    gameState.botQueue = [];
    gameState.lastHit = null;
    gameState.huntDirection = null;
    gameState.playerTurn = true;

    btnStart.style.display = 'inline-block';
    btnRestart.style.display = 'none';
    btnRandomize.disabled = false;
    computerGrid.classList.add('locked');
    turnStatus.textContent = "Rozstawianie Floty";
    
    document.querySelectorAll('.cell').forEach(c => c.className = 'cell');
    logContent.innerHTML = '';
}

function createEmptyBoard() {
    return Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
}

function createGrid(container, owner) {
    container.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            if (owner === 'computer') {
                cell.addEventListener('click', handlePlayerShot);
            }
            container.appendChild(cell);
        }
    }
}

/* --- LOGIKA ROZMIESZCZANIA --- */

function randomizeShips(board) {
    for(let y=0; y<BOARD_SIZE; y++) board[y].fill(0);

    SHIPS_CONFIG.forEach(size => {
        let placed = false;
        while(!placed) {
            const horizontal = Math.random() < 0.5;
            const x = Math.floor(Math.random() * BOARD_SIZE);
            const y = Math.floor(Math.random() * BOARD_SIZE);
            
            if(canPlace(board, x, y, size, horizontal)) {
                place(board, x, y, size, horizontal);
                placed = true;
            }
        }
    });
}

function canPlace(board, x, y, size, horizontal) {
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
        if (horizontal) board[y][x + i] = 1;
        else board[y + i][x] = 1;
    }
}

/* --- ROZGRYWKA --- */

function handlePlayerShot(e) {
    if (!gameState.active || !gameState.playerTurn) return;

    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);

    if (gameState.computerShips[y][x] >= 2) return;

    const isHit = (gameState.computerShips[y][x] === 1);
    gameState.computerShips[y][x] = isHit ? 3 : 2;

    updateVisuals(e.target, isHit);

    if (isHit) {
        gameState.computerHits++;
        log(`Trafienie [${x},${y}]! Masz dodatkowy ruch!`, "player");
        turnStatus.textContent = "TRAFIENIE! STRZELAJ DALEJ";
        playAudio('hit');
        checkWin();
    } else {
        log(`Pudło [${x},${y}].`, "info");
        playAudio('splash');
        endTurn();
    }
}

function endTurn() {
    gameState.playerTurn = !gameState.playerTurn;
    
    if (gameState.playerTurn) {
        turnStatus.textContent = "TWÓJ RUCH";
        turnStatus.style.color = "var(--accent)";
    } else {
        turnStatus.textContent = "RUCH KOMPUTERA";
        turnStatus.style.color = "#ff4d6d";
        setTimeout(botTurn, 800);
    }
}

/* --- AI (BOT) --- */

function botTurn() {
    if (!gameState.active) return;

    let target;
    
    if (gameState.botQueue.length > 0) {
        target = gameState.botQueue.shift();
        if (gameState.playerShips[target.y][target.x] >= 2) { 
            botTurn(); 
            return; 
        }
    } else {
        gameState.lastHit = null;
        gameState.huntDirection = null;
        do {
            target = {
                x: Math.floor(Math.random() * BOARD_SIZE),
                y: Math.floor(Math.random() * BOARD_SIZE)
            };
        } while (gameState.playerShips[target.y][target.x] >= 2);
    }

    const x = target.x;
    const y = target.y;
    const isHit = (gameState.playerShips[y][x] === 1);
    gameState.playerShips[y][x] = isHit ? 3 : 2;

    const cellIndex = y * 10 + x;
    const cell = playerGrid.children[cellIndex];
    updateVisuals(cell, isHit);

    if (isHit) {
        gameState.playerHits++;
        log(`Wróg trafił [${x},${y}]!`, "enemy");
        playAudio('hit');
        
        addSmartNeighbors(x, y);
        gameState.lastHit = {x, y};
        checkWin();
        if (gameState.active) setTimeout(botTurn, 1000); 
    } else {
        log("Wróg spudłował.", "info");
        playAudio('splash');
        endTurn();
    }
}

function addSmartNeighbors(x, y) {
    const directions = [
        {x: 0, y: -1, type: 'v'}, {x: 0, y: 1, type: 'v'},
        {x: -1, y: 0, type: 'h'}, {x: 1, y: 0, type: 'h'}
    ];

    if (gameState.lastHit) {
        if (gameState.lastHit.x === x) gameState.huntDirection = 'v';
        else if (gameState.lastHit.y === y) gameState.huntDirection = 'h';
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
                    gameState.botQueue.unshift({x: nx, y: ny});
                }
            }
        }
    });
}

function isAreaClearForBot(x, y) {
    const diagonals = [
        {x: x-1, y: y-1}, {x: x+1, y: y-1},
        {x: x-1, y: y+1}, {x: x+1, y: y+1}
    ];

    for (let d of diagonals) {
        if (d.x >= 0 && d.x < BOARD_SIZE && d.y >= 0 && d.y < BOARD_SIZE) {
            if (gameState.playerShips[d.y][d.x] === 3) return false; 
        }
    }
    return true;
}

/* --- UTILS --- */

function updateVisuals(cell, isHit) {
    if (isHit) cell.classList.add('hit');
    else cell.classList.add('miss');
}

function renderGrid(container, boardData, showShips) {
    Array.from(container.children).forEach((cell, i) => {
        const x = i % 10;
        const y = Math.floor(i / 10);
        const val = boardData[y][x];
        
        cell.className = 'cell';
        if (val === 1 && showShips) cell.classList.add('ship');
        if (val === 2) cell.classList.add('miss');
        if (val === 3) cell.classList.add('hit');
    });
}

function checkWin() {
    if (gameState.computerHits === gameState.totalSegments) {
        endGame(true);
    } else if (gameState.playerHits === gameState.totalSegments) {
        endGame(false);
    }
}

function endGame(playerWon) {
    gameState.active = false;
    turnStatus.textContent = playerWon ? "ZWYCIĘSTWO!" : "PORAŻKA";
    turnStatus.style.color = playerWon ? "var(--accent-2)" : "#ff4d6d";
    
    log(playerWon ? "GRATULACJE! Wroga flota zniszczona." : "MAYDAY! Nasza flota poszła na dno.", "victory");
    
    if(playerWon) playAudio('win');
    else playAudio('lose');

    btnStart.style.display = 'none';
    btnRestart.style.display = 'inline-block';
    
    renderGrid(computerGrid, gameState.computerShips, true);
}

function log(msg, type) {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    logContent.prepend(div);
}

function playAudio(type) {
    try {
        if(audio[type]) {
            audio[type].currentTime = 0;
            audio[type].play();
        }
    } catch(e) { console.log("Audio error", e); }
}

/* --- LISTENERY --- */

btnRandomize.addEventListener('click', () => {
    randomizeShips(gameState.playerShips);
    renderGrid(playerGrid, gameState.playerShips, true);
    log("Przegrupowano flotę.", "info");
});

btnStart.addEventListener('click', () => {
    gameState.active = true;
    randomizeShips(gameState.computerShips);
    computerGrid.classList.remove('locked');
    btnRandomize.disabled = true;
    btnStart.style.display = 'none';
    
    // Start muzyki
    audio.music.play().catch(e => console.log("Muzyka wymaga interakcji", e));
    
    // Log wyświetli się teraz tylko RAZ
    log("Systemy bojowe aktywne. Wybierz cel na radarze wroga.", "player");
    turnStatus.textContent = "TWÓJ RUCH";
    turnStatus.style.color = "var(--accent)";
});

btnRestart.addEventListener('click', () => {
    audio.music.pause();
    audio.music.currentTime = 0;
    initGame();
});

window.addEventListener('load', initGame);