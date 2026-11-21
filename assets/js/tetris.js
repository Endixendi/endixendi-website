/**
 * Gra Tetris
 */

// Konfiguracja Canvas
const board = document.getElementById('tetrisCanvas');
const ncv = document.getElementById('nextCanvas');
const hcv = document.getElementById('holdCanvas');
const ctx = board ? board.getContext('2d') : null;
const nctx = ncv ? ncv.getContext('2d') : null;
const hctx = hcv ? hcv.getContext('2d') : null;

// Elementy UI
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const tetrisMenu = document.getElementById('tetris-menu');
const menuTitle = document.getElementById('menu-title');
const menuInstruction = document.getElementById('menu-instruction');

// Ustawienia wielkości fizycznej kanwy głównej
if (board) {
    board.width = 300;
    board.height = 600;
}

// Ustawienia gry
const COLS = 10, ROWS = 20, TILE = 30;
const ARENA = createMatrix(COLS, ROWS);

// Kolory klocków
const COLORS = {
    'I': '#20c4ff', 'J': '#4e6cff', 'L': '#ff9f1c',
    'O': '#ffe600', 'S': '#3bd16f', 'T': '#bf7bff', 'Z': '#ff4d6d',
    '#': 'rgba(255, 255, 255, 0.15)'
};

// Kolor zablokowanych elementów na planszy
const LOCKED_COLOR = '#4a4a4a';

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
sounds.music.volume = 0.15;

sounds.line.volume = 0.3;
sounds.levelup.volume = 0.3;
sounds.drop.volume = 0.3;
sounds.rotate.volume = 0.3;
sounds.gameover.volume = 0.3;

// Stan gry
let dropCounter = 0, dropInterval = 1000, lastTime = 0;
let score = 0, lines = 0, level = 1;
let queue = [];
let held = null, canHold = true;
let paused = false, running = false, gameOver = false;
let animationFrameId = null;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    type: null
};

// --- RYSOWANIE ---

function draw() {
    if (!ctx || !board) return;
    ctx.fillStyle = '#0f1113';
    ctx.fillRect(0, 0, board.width, board.height);

    drawMatrix(ARENA, { x: 0, y: 0 }, false, '');

    if (player.matrix) {
        const gpos = ghostPosition();
        drawMatrix(player.matrix, gpos, true, player.type);
        drawMatrix(player.matrix, player.pos, false, player.type);
    }
}

function drawMatrix(matrix, offset, isGhost = false, type = '') {
    if (!ctx) return;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (isGhost) {
                    ctx.fillStyle = COLORS['#'];
                } else if (type === '') {
                    ctx.fillStyle = LOCKED_COLOR;
                } else {
                    ctx.fillStyle = COLORS[type];
                }
                ctx.fillRect((x + offset.x) * TILE, (y + offset.y) * TILE, TILE - 1, TILE - 1);
            }
        });
    });
}

function drawMini(ctx2d, type) {
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, ctx2d.canvas.width, ctx2d.canvas.height);
    if (!type) return;
    const m = PIECES[type];
    const scale = 22;
    const ox = (ctx2d.canvas.width - m[0].length * scale) / 2;
    const oy = (ctx2d.canvas.height - m.length * scale) / 2;
    m.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx2d.fillStyle = COLORS[type];
                ctx2d.fillRect(ox + x * scale, oy + y * scale, scale - 1, scale - 1);
            }
        });
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

function playerRotate(dir) {
    if (!player.matrix) return;
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(ARENA, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    sounds.rotate.currentTime = 0;
    sounds.rotate.play().catch(() => {});
}

function playerDrop() {
    player.pos.y++;
    if (collide(ARENA, player)) {
        player.pos.y--;
        merge(ARENA, player);

        sounds.drop.currentTime = 0;
        sounds.drop.play().catch(() => {});

        playerReset();
        arenaSweep();
        updateStats();
    }
    dropCounter = 0;
}

function hardDrop() {
    if (gameOver || paused || !running || !player.matrix) return;
    while (!collide(ARENA, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(ARENA, player);

    sounds.drop.currentTime = 0;
    sounds.drop.play().catch(() => {});

    playerReset();
    arenaSweep();
    updateStats();
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = ARENA.length - 1; y >= 0; --y) {
        for (let x = 0; x < ARENA[y].length; ++x) {
            if (ARENA[y][x] === 0) continue outer;
        }
        const row = ARENA.splice(y, 1)[0].fill(0);
        ARENA.unshift(row);
        ++y;
        rowCount++;
    }
    if (rowCount > 0) {
        score += [0, 100, 300, 500, 800][rowCount] * level;
        lines += rowCount;
        sounds.line.currentTime = 0;
        sounds.line.play().catch(() => {});
        if (lines >= level * 10) {
            level++;
            dropInterval = Math.max(120, 1000 - (level - 1) * 80);
            sounds.levelup.currentTime = 0;
            sounds.levelup.play().catch(() => {});
        }
    }
}

function ghostPosition() {
    const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
    while (!collide(ARENA, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost.pos;
}

function holdPiece() {
    if (!canHold || paused || !running || !player.type) return;
    const currentType = player.type;
    if (!held) {
        held = currentType;
        playerReset();
    } else {
        const temp = player.type;
        player.type = held;
        held = temp;
        player.matrix = pieceMatrix(player.type);
        player.pos.y = 0;
        player.pos.x = Math.floor(COLS / 2) - Math.ceil(player.matrix[0].length / 2);
    }
    canHold = false;
    drawMini(hctx, held);
}

function nextFromQueue() {
    if (queue.length < 2) {
        queue = queue.concat(shuffle(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
    }
    const next = queue.shift();
    drawMini(nctx, queue[0]);
    return next;
}

function playerReset() {
    player.type = nextFromQueue();
    player.matrix = pieceMatrix(player.type);
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.ceil(player.matrix[0].length / 2);
    canHold = true;

    if (collide(ARENA, player)) {
        gameEnd();
    }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function updateStats() {
    if (scoreEl) scoreEl.textContent = score;
    if (linesEl) linesEl.textContent = lines;
    if (levelEl) levelEl.textContent = level;
}

function update(time = 0) {
    if (!running || paused || gameOver) return;
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    if (dropCounter > dropInterval) playerDrop();
    draw();
    if (running && !paused && !gameOver) {
        animationFrameId = requestAnimationFrame(update);
    }
}

// --- LOGIKA MENU I PRZYCISKÓW ---

function gameStart() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    ARENA.forEach(r => r.fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropCounter = 0;
    queue = shuffle(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    held = null;
    canHold = true;
    paused = false;
    gameOver = false;

    drawMini(hctx, null);
    playerReset();
    updateStats();
    running = true;

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

function gameEnd() {
    running = false;
    gameOver = true;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (menuTitle) menuTitle.textContent = 'Koniec gry';
    if (menuInstruction) menuInstruction.textContent = '↵ lub Enter – zagraj ponownie';
    if (tetrisMenu) {
        tetrisMenu.classList.remove('hidden');
        tetrisMenu.classList.add('game-over-border');
    }

    sounds.gameover.currentTime = 0;
    sounds.gameover.play().catch(() => {});
    sounds.music.pause();
    sounds.music.currentTime = 0;
}

function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;

    if (menuTitle) menuTitle.textContent = paused ? 'Pauza' : 'Tetris';
    if (menuInstruction) menuInstruction.textContent = paused ? 'P – wznów' : '↵ lub Enter – rozpocznij';

    if (tetrisMenu) {
        tetrisMenu.classList.toggle('hidden', !paused);
        tetrisMenu.classList.remove('game-over-border');
    }

    if (!paused) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(update);
    } else {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

window.addEventListener('keydown', e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === 'Enter') {
        if (!running || gameOver) gameStart();
    }

    if (!running || paused || gameOver) {
        if (e.code === 'KeyP') togglePause();
        return;
    }

    switch (e.code) {
        case 'ArrowLeft':
            player.pos.x--;
            if (collide(ARENA, player)) player.pos.x++;
            break;
        case 'ArrowRight':
            player.pos.x++;
            if (collide(ARENA, player)) player.pos.x--;
            break;
        case 'ArrowDown':
            playerDrop();
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
        case 'KeyP':
            togglePause();
            break;
    }
});

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
                player.pos.x--;
                if (collide(ARENA, player)) player.pos.x++;
                break;
            case "right":
                player.pos.x++;
                if (collide(ARENA, player)) player.pos.x--;
                break;
            case "up":
                playerRotate(1);
                break;
            case "down":
                playerDrop();
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

const musicVolumeSlider = document.getElementById('volume-music');
if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', () => {
        sounds.music.volume = musicVolumeSlider.value;
    });
}

const effectsVolumeSlider = document.getElementById('volume-effects');
if (effectsVolumeSlider) {
    effectsVolumeSlider.addEventListener('input', () => {
        sounds.line.volume = effectsVolumeSlider.value;
        sounds.levelup.volume = effectsVolumeSlider.value;
        sounds.drop.volume = effectsVolumeSlider.value;
        sounds.rotate.volume = effectsVolumeSlider.value;
        sounds.gameover.volume = effectsVolumeSlider.value;
    });
}

window.addEventListener('load', () => {
    if (menuTitle) menuTitle.textContent = 'Tetris';
    if (menuInstruction) menuInstruction.textContent = 'Kliknij ↵ lub Dotknij';

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
    updateStats();
    draw();
});