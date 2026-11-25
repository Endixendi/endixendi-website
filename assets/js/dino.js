/**
 * Gra Dino - Cyber-Arcade
 *
 * Funkcje:
 *  - tarcza ładowana kryształami, drony, UFO (z oryginału)
 *  - pauza (P / przycisk / automatycznie po ukryciu karty)
 *  - zmienna wysokość skoku (przytrzymaj = wyżej), bufor skoku, szybkie opadanie
 *  - nowe przeszkody: grupy kaktusów, szybkie drony z ostrzeżeniem
 *  - power-upy: magnes, spowolnienie czasu, punkty x2
 *  - biomy zmieniające się wraz z wynikiem
 *  - cząsteczki, wstrząsy ekranu, ślad, squash & stretch, wolne tempo przy śmierci
 *  - skórki Dino odblokowywane rekordem, osiągnięcia i statystyki w localStorage
 *  - wibracje na telefonie, tapnięcie w planszę = skok
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementy UI
const dinoContainer = document.getElementById('dinoContainer');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const pauseBtn = document.getElementById('pauseBtn');
const pauseMenu = document.getElementById('pauseMenu');
const resumeBtn = document.getElementById('resumeBtn');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const gameOverMenu = document.getElementById('gameOverMenu');
const finalScoreEl = document.getElementById('finalScore');
const finalHighScoreEl = document.getElementById('finalHighScore');
const runStatsEl = document.getElementById('runStats');
const totalStatsEl = document.getElementById('totalStats');
const restartBtn = document.getElementById('restartBtn');
const volumeControl = document.getElementById('volume-music');
const volumeControl1 = document.getElementById('volume-effects');
const skinSelect = document.getElementById('skinSelect');
const jumpBtn = document.getElementById('jumpBtn');
const crouchBtn = document.getElementById('crouchBtn');

// Dźwięki
const bgMusic = new Audio("assets/sounds/dino/dino-bg.mp3");
const jumpSound = new Audio("assets/sounds/global/jump.mp3");
const gameOverSound = new Audio("assets/sounds/global/gameover-sad.mp3");
const milestoneSound = new Audio("assets/sounds/global/point.mp3");
const point1000Sound = new Audio("assets/sounds/global/line-clear.mp3");
const explosionSound = new Audio("assets/sounds/global/explosion.mp3");

const effectSounds = [jumpSound, gameOverSound, milestoneSound, point1000Sound, explosionSound];

bgMusic.loop = true;

// Głośność startowa zgodna z suwakami w HTML
bgMusic.volume = volumeControl ? parseFloat(volumeControl.value) : 0.3;
effectSounds.forEach(snd => {
    snd.volume = volumeControl1 ? parseFloat(volumeControl1.value) : 0.3;
});

function playSound(snd) {
    snd.currentTime = 0;
    snd.play().catch(() => {});
}

function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

// --- STAŁE ---

// WIRTUALNA ROZDZIELCZOŚĆ (Stałe proporcje gry)
const V_WIDTH = 800;
const V_HEIGHT = 350;
const GROUND_MARGIN = 15;

const JUMP_BUFFER_TIME = 0.12;   // s - skok wciśnięty tuż przed lądowaniem i tak się wykona
const POWER_DURATION = 7;        // s - czas działania power-upów
const MAX_GAME_SPEED = 820;
const MAX_PARTICLES = 350;
const START_SPEED = 350;

let scale = 1;

// --- ZAPIS (localStorage przez store) ---

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

// --- STAN GRY ---

let player = null;
let obstacles = [];
let clouds = [];
let stars = [];
let items = [];
let particles = [];
let toasts = [];
let warnings = [];
let activeUfo = null;

let score = 0;
let gameOver = false;
let paused = false;
let dying = false;
let deathTimer = 0;
let gameSpeed = START_SPEED;
let lastTime = 0;
let rafId = null;

let spawnTimer = 0;
let nextSpawn = 1.5;
let itemSpawnTimer = 0;
let nextItemAt = 5;
let powerSpawnTimer = 0;
let nextPowerAt = 12;
let scoreTimer = 0;
let nextSpeedMilestone = 1000;
let nextUfoScore = 5000;
let groundOffset = 0;
let shakeMag = 0;
let jumpBuffer = 0;

let highScore = parseInt(store.get("highScore"), 10) || 0;
highScoreEl.textContent = highScore;

// System tarczy (ładowanej kryształami)
let shieldEnergy = 0;

// Power-upy (pozostały czas w sekundach)
const power = { magnet: 0, slow: 0, double: 0 };

// Statystyki jednego biegu
function createRun() {
    return { crystals: 0, shieldBreaks: 0, time: 0, noCrouchTime: 0, distance: 0, powerKinds: [], newAch: [] };
}
let run = createRun();

// Statystyki globalne i osiągnięcia
const stats = Object.assign({ games: 0, crystals: 0, distance: 0, bestTime: 0 }, loadJSON('dinoStats', {}));
const achSaved = loadJSON('dinoAch', []);
const unlockedAch = new Set(Array.isArray(achSaved) ? achSaved : []);

// Monitorowanie wciśniętych klawiszy
const keys = {
    ArrowUp: false,
    Space: false,
    ArrowDown: false,
    KeyS: false,
    KeyW: false,
    JumpBtn: false
};

// --- SKÓRKI ---

const SKINS = [
    { id: 'classic', name: 'Klasyczny',   unlock: 0 },
    { id: 'gold',    name: 'Złoty',       unlock: 25000,   color: '#ffcc00' },
    { id: 'pink',    name: 'Neon różowy', unlock: 50000,   color: '#ff2fa0' },
    { id: 'emerald', name: 'Szmaragdowy', unlock: 100000,  color: '#00e676' },
    { id: 'rainbow', name: 'Tęczowy',     unlock: 250000,  effect: 'rainbow' },
    { id: 'ghost',   name: 'Widmo',       unlock: 500000,  color: '#9fd8ff', effect: 'ghost' },
    { id: 'diamond', name: 'Diament',     unlock: 1000000, effect: 'diamond' }
];

let currentSkin = String(store.get('dinoSkin') || 'classic').replace(/"/g, '');

function refreshSkinOptions() {
    if (!skinSelect) return;
    const cur = SKINS.find(s => s.id === currentSkin);
    if (!cur || highScore < cur.unlock) currentSkin = 'classic';

    skinSelect.innerHTML = '';
    SKINS.forEach(s => {
        const opt = document.createElement('option');
        const locked = highScore < s.unlock;
        opt.value = s.id;
        opt.disabled = locked;
        opt.textContent = locked ? `🔒 ${s.name} (rekord ${s.unlock.toLocaleString('pl-PL')})` : s.name;
        skinSelect.appendChild(opt);
    });
    skinSelect.value = currentSkin;
}

function getSkin() {
    return SKINS.find(sk => sk.id === currentSkin) || SKINS[0];
}

function getSkinColor() {
    const skin = getSkin();
    const t = performance.now();
    if (skin.effect === 'rainbow') return `hsl(${Math.floor(t / 8) % 360}, 100%, 60%)`;
    if (skin.effect === 'diamond') return `hsl(190, 100%, ${Math.round(75 + Math.sin(t / 180) * 15)}%)`;
    return skin.color || getAccentColor('#00aaff');
}

// --- BIOMY ---

const BIOMES = [
    { from: 0,    name: 'Neonowe Miasto',   top: [15, 17, 21], bottom: [22, 28, 42], ground: [255, 255, 255], stars: 0.5 },
    { from: 2500, name: 'Pustynia',         top: [40, 22, 14], bottom: [100, 54, 26], ground: [255, 190, 120], stars: 0.35 },
    { from: 5000, name: 'Kryształowy Las',  top: [8, 28, 24],  bottom: [14, 68, 54],  ground: [120, 255, 210], stars: 0.5 },
    { from: 8000, name: 'Kosmos',           top: [0, 0, 6],    bottom: [20, 4, 44],   ground: [200, 160, 255], stars: 1 }
];
const BIOME_BLEND = 500; // ile punktów trwa płynne przejście

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function rgb(c, a) {
    const base = `${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}`;
    return a === undefined ? `rgb(${base})` : `rgba(${base}, ${a})`;
}

function getBiomeState(sc) {
    let idx = 0;
    for (let i = BIOMES.length - 1; i >= 0; i--) {
        if (sc >= BIOMES[i].from) { idx = i; break; }
    }
    const cur = BIOMES[idx];
    if (idx === 0) {
        return { idx, name: cur.name, top: cur.top, bottom: cur.bottom, ground: cur.ground, stars: cur.stars };
    }
    const prev = BIOMES[idx - 1];
    const t = Math.min(1, (sc - cur.from) / BIOME_BLEND);
    const e = t * t * (3 - 2 * t);
    return {
        idx,
        name: cur.name,
        top: lerpColor(prev.top, cur.top, e),
        bottom: lerpColor(prev.bottom, cur.bottom, e),
        ground: lerpColor(prev.ground, cur.ground, e),
        stars: lerp(prev.stars, cur.stars, e)
    };
}

let currentBiome = getBiomeState(0);
let currentBiomeIdx = 0;

// --- OSIĄGNIĘCIA ---

const ACHIEVEMENTS = [
    { id: 'score1000',  icon: '🔥', name: 'Rozgrzewka',     desc: 'Zdobądź 1000 punktów w jednej grze.',               goal: 1000,  test: () => score >= 1000 },
    { id: 'score5000',  icon: '🏃', name: 'Maratończyk',    desc: 'Zdobądź 5000 punktów w jednej grze.',               goal: 5000,  test: () => score >= 5000 },
    { id: 'score10000', icon: '👑', name: 'Legenda',        desc: 'Zdobądź 10 000 punktów w jednej grze.',             goal: 10000, test: () => score >= 10000 },
    { id: 'crystals10', icon: '💎', name: 'Kolekcjoner',    desc: 'Zbierz 10 kryształów w jednej grze.',                test: () => run.crystals >= 10 },
    { id: 'shield3',    icon: '🛡️', name: 'Niezniszczalny', desc: 'Przetrwaj 3 uderzenia dzięki tarczy w jednej grze.', test: () => run.shieldBreaks >= 3 },
    { id: 'noCrouch60', icon: '🦖', name: 'Bez kucania',    desc: 'Biegnij 60 sekund z rzędu bez kucania.',             test: () => run.noCrouchTime >= 60 },
    { id: 'powers3',    icon: '⚡', name: 'Władca mocy',    desc: 'Zbierz wszystkie 3 rodzaje power-upów w jednej grze.', test: () => run.powerKinds.length >= 3 },
    { id: 'time180',    icon: '⏱️', name: 'Wytrwały',       desc: 'Przetrwaj 3 minuty w jednej grze.',                  test: () => run.time >= 180 }
];

function checkAchievements() {
    let unlockedNow = false;
    ACHIEVEMENTS.forEach(a => {
        if (!unlockedAch.has(a.id) && a.test()) {
            unlockedAch.add(a.id);
            run.newAch.push(a.name);
            saveJSON('dinoAch', Array.from(unlockedAch));
            showToast(`🏆 Osiągnięcie: ${a.name}`, '#ffd000');
            unlockedNow = true;
        }
    });
    if (unlockedNow) renderAchievements();
}

// Osiągnięcia za wynik odblokowują się od razu, jeśli rekord już je spełnia (np. rekord sprzed ich dodania)
function syncAchievementsWithHighScore() {
    let changed = false;
    ACHIEVEMENTS.forEach(a => {
        if (a.goal && highScore >= a.goal && !unlockedAch.has(a.id)) {
            unlockedAch.add(a.id);
            changed = true;
        }
    });
    if (changed) saveJSON('dinoAch', Array.from(unlockedAch));
}

// Lista osiągnięć widoczna na stronie (sekcja #dino-achievements)
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

        // Pasek postępu na podstawie rekordu (tylko osiągnięcia za wynik)
        if (!done && a.goal) {
            const pct = Math.min(100, Math.round((highScore / a.goal) * 100));
            const bar = document.createElement('span');
            bar.className = 'achievement-bar';
            const fill = document.createElement('span');
            fill.className = 'achievement-bar-fill';
            fill.style.width = pct + '%';
            bar.appendChild(fill);
            const hint = document.createElement('small');
            hint.textContent = `Rekord: ${highScore.toLocaleString('pl-PL')} / ${a.goal.toLocaleString('pl-PL')}`;
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
            `Rozegrane gry: ${stats.games} • Kryształy: ${stats.crystals} • ` +
            `Dystans: ${Math.round(stats.distance)} m • Najdłuższy bieg: ${stats.bestTime} s`;
    }
}

// Zerowanie rekordu, statystyk i osiągnięć (ta sama opcja i komunikat co w pozostałych grach)
function resetProgress() {
    if (player && !gameOver && !dying && !paused) setPaused(true);
    if (!window.confirm('Na pewno wyzerować rekord, statystyki i osiągnięcia w Dino?')) return;

    const removeKey = k => { try { store.remove(k); } catch (e) { /* brak zapisu */ } };

    highScore = 0;
    removeKey('highScore');
    highScoreEl.textContent = 0;
    if (finalHighScoreEl) finalHighScoreEl.textContent = 0;

    Object.assign(stats, { games: 0, crystals: 0, distance: 0, bestTime: 0 });
    removeKey('dinoStats');

    unlockedAch.clear();
    removeKey('dinoAch');

    // Skórki odblokowuje rekord, więc po wyzerowaniu wraca Klasyczny
    refreshSkinOptions();
    store.set('dinoSkin', currentSkin);
    redrawIdle();
    renderAchievements();
}

function showToast(text, color = '#ffffff') {
    toasts.push({ text, color, t: 0, dur: 3 });
    if (toasts.length > 3) toasts.shift();
}

// --- EKRAN / SKALOWANIE ---

function isFullscreenActive() {
    return GameFullscreen.isActive(dinoContainer);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    const styles = getComputedStyle(container);
    const padX = parseFloat(styles.paddingLeft || 0) + parseFloat(styles.paddingRight || 0);
    const padY = parseFloat(styles.paddingTop || 0) + parseFloat(styles.paddingBottom || 0);

    const innerW = Math.max(100, container.clientWidth - padX);
    const innerH = Math.max(50, container.clientHeight - padY);

    const aspect = V_WIDTH / V_HEIGHT;
    let targetWidth = innerW;
    let targetHeight = targetWidth / aspect;

    if (targetHeight > innerH) {
        targetHeight = innerH;
        targetWidth = targetHeight * aspect;
    }

    // Ostry obraz na ekranach HiDPI (rozmiar CSS ustala stylesheet, tu tylko rozdzielczość płótna)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = (targetWidth * dpr) / V_WIDTH;
    canvas.width = Math.floor(targetWidth * dpr);
    canvas.height = Math.floor(targetHeight * dpr);
}

// Po zmianie rozmiaru płótno się czyści - odrysuj ostatnią klatkę (pauza / game over)
function redrawIdle() {
    if (player) {
        if (!rafId) render();
    } else {
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function updateFullscreenState() {
    const active = isFullscreenActive();
    if (fullscreenBtn) {
        fullscreenBtn.textContent = active ? '✕' : '⛶';
        fullscreenBtn.title = active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran';
    }
    document.body.style.overflow = active ? 'hidden' : '';

    setTimeout(() => {
        resizeCanvas();
        redrawIdle();
    }, 50);
}

function toggleFullscreen() {
    GameFullscreen.toggle(dinoContainer, updateFullscreenState);
}

// Kolor akcentu jest buforowany, odświeża się tylko po zmianie motywu (klasy body)
let accentCache = null;
new MutationObserver(() => { accentCache = null; })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });

function getAccentColor(fallback) {
    if (!accentCache) {
        accentCache = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    }
    return accentCache || fallback;
}

// --- CZĄSTECZKI ---

class Particle {
    constructor(x, y, vx, vy, life, size, color, gravity = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.gravity = gravity;
    }

    update(dt) {
        this.life -= dt;
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

function burst(x, y, count, color, opts = {}) {
    const { speed = 180, gravity = 400, life = 0.5, size = 3, half = false } = opts;
    for (let i = 0; i < count; i++) {
        const angle = half ? -Math.random() * Math.PI : Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        particles.push(new Particle(
            x, y,
            Math.cos(angle) * s, Math.sin(angle) * s,
            life * (0.6 + Math.random() * 0.6),
            size * (0.6 + Math.random() * 0.8),
            color,
            gravity
        ));
    }
    if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
    }
}

// --- KLASY I OBIEKTY ---

class Dino {
    constructor() {
        this.normalHeight = 44;
        this.crouchHeight = 22;
        this.width = 44;
        this.height = this.normalHeight;

        this.x = 60;
        this.groundY = V_HEIGHT - this.normalHeight - GROUND_MARGIN;
        this.y = this.groundY;

        this.vy = 0;
        this.gravity = 1600;
        this.jumpForce = -520;
        this.isJumping = false;
        this.isCrouching = false;

        this.hasShield = false;
        this.squash = 0;
        this.trailTimer = 0;
    }

    // Zwraca true, jeśli skok się wykonał
    jump() {
        if (this.isJumping) return false;

        if (this.isCrouching) {
            this.isCrouching = false;
            this.height = this.normalHeight;
        }
        this.y = V_HEIGHT - this.height - GROUND_MARGIN;
        this.vy = this.jumpForce;
        this.isJumping = true;

        playSound(jumpSound);
        burst(this.x + this.width / 2, V_HEIGHT - GROUND_MARGIN, 5,
            'rgba(255, 255, 255, 0.5)', { speed: 90, gravity: 250, life: 0.3, size: 3, half: true });
        return true;
    }

    land(impact) {
        this.squash = Math.min(0.35, impact / 1800);
        burst(this.x + this.width / 2, V_HEIGHT - GROUND_MARGIN, impact > 700 ? 12 : 6,
            'rgba(255, 255, 255, 0.55)', { speed: 110, gravity: 250, life: 0.35, size: 3, half: true });
        if (impact > 800) shakeMag = Math.max(shakeMag, 4);
    }

    update(dt) {
        const down = keys.ArrowDown || keys.KeyS;
        const jumpHeld = keys.Space || keys.ArrowUp || keys.KeyW || keys.JumpBtn;

        if (down && !this.isJumping) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.height = this.crouchHeight;
                this.y = V_HEIGHT - this.crouchHeight - GROUND_MARGIN;
            }
        } else if (this.isCrouching) {
            this.isCrouching = false;
            this.height = this.normalHeight;
            this.y = V_HEIGHT - this.normalHeight - GROUND_MARGIN;
        }

        if (!this.isCrouching) {
            let g = this.gravity;
            if (this.isJumping) {
                if (down) g *= 2.6;                          // szybkie opadanie
                else if (this.vy < 0 && !jumpHeld) g *= 1.8; // puszczony klawisz = krótki skok
            }

            this.vy += g * dt;
            this.y += this.vy * dt;

            const ground = V_HEIGHT - this.height - GROUND_MARGIN;
            if (this.y >= ground) {
                const wasInAir = this.isJumping;
                const impact = Math.abs(this.vy);
                this.y = ground;
                this.vy = 0;
                this.isJumping = false;

                if (wasInAir) {
                    this.land(impact);
                    if (jumpBuffer > 0) {
                        jumpBuffer = 0;
                        this.jump();
                    }
                }
            }
        }

        this.squash = Math.max(0, this.squash - dt * 3);

        // Ślad przy dużej prędkości lub tęczowej skórce
        this.trailTimer += dt;
        if (this.trailTimer >= 0.03) {
            this.trailTimer = 0;
            const skin = getSkin();
            if (skin.effect === 'diamond' && Math.random() < 0.6) {
                particles.push(new Particle(
                    this.x + Math.random() * this.width, this.y + Math.random() * this.height,
                    -20 + Math.random() * 40, -30 - Math.random() * 30, 0.5, 2, '#ffffff', 0
                ));
            }
            if (gameSpeed >= 520 || skin.effect === 'rainbow' || skin.effect === 'diamond') {
                particles.push(new Particle(
                    this.x + 2, this.y + Math.random() * this.height,
                    -gameSpeed * 0.25, 0, 0.35, 4, getSkinColor(), 0
                ));
            }
        }
    }

    draw() {
        ctx.save();
        const cx = this.x + this.width / 2;

        if (this.hasShield) {
            const pulse = 1 + Math.sin(performance.now() / 120) * 0.04;
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff64';
            ctx.beginPath();
            ctx.arc(cx, this.y + this.height / 2, this.width * 0.9 * pulse, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Squash & stretch (zakotwiczone przy stopach)
        let sx = 1, sy = 1;
        if (this.isJumping) {
            const st = Math.min(Math.abs(this.vy) / 1500, 0.2);
            sx = 1 - st * 0.6;
            sy = 1 + st;
        }
        if (this.squash > 0) {
            sx = 1 + this.squash * 0.5;
            sy = 1 - this.squash * 0.5;
        }

        const color = getSkinColor();
        if (getSkin().effect === 'ghost') {
            ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 200) * 0.15;
        }
        ctx.translate(cx, this.y + this.height);
        ctx.scale(sx, sy);

        ctx.fillStyle = color;
        ctx.shadowBlur = this.isCrouching ? 0 : 5;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height, this.width, this.height, this.isCrouching ? 4 : 8);
        ctx.fill();

        // Oko
        ctx.shadowBlur = 0;
        const eyeTop = -this.height + (this.isCrouching ? 4 : 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.width / 2 - 17, eyeTop, 10, 10);
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(this.width / 2 - 12, eyeTop + 3, 5, 5);

        ctx.restore();
    }
}

class Obstacle {
    // typy: 'ground', 'group', 'drone', 'fastDrone'
    constructor(type) {
        this.type = type;
        this.speedMul = 1;
        this.x = V_WIDTH;

        if (type === 'ground') {
            this.width = 18 + Math.random() * 16;
            this.height = 35 + Math.random() * 25;
            this.y = V_HEIGHT - this.height - GROUND_MARGIN;
            this.color = "#ff4d6d";
        } else if (type === 'group') {
            const n = Math.random() < 0.6 ? 2 : 3;
            this.parts = [];
            let px = 0;
            for (let i = 0; i < n; i++) {
                const w = 14 + Math.random() * 8;
                const h = 30 + Math.random() * 28;
                this.parts.push({ x: px, w, h });
                px += w + 6;
            }
            this.width = px - 6;
            this.height = Math.max(...this.parts.map(p => p.h));
            this.y = V_HEIGHT - this.height - GROUND_MARGIN;
            this.color = "#ff4d6d";
        } else {
            this.width = 30;
            this.height = 20;
            this.y = V_HEIGHT - 68;
            this.color = type === 'fastDrone' ? "#ffe600" : "#00f5ff";
            this.speedMul = type === 'fastDrone' ? 1.35 : 1;
            this.hoverTime = Math.random() * 10;
        }
    }

    isDrone() {
        return this.type === 'drone' || this.type === 'fastDrone';
    }

    update(dt) {
        this.x -= gameSpeed * this.speedMul * dt;
        if (this.isDrone()) {
            this.hoverTime += dt * 5;
            this.y += Math.sin(this.hoverTime) * 24 * dt; // niezależne od liczby klatek
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        if (this.type === 'ground') {
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        } else if (this.type === 'group') {
            this.parts.forEach(p => {
                ctx.roundRect(this.x + p.x, V_HEIGHT - GROUND_MARGIN - p.h, p.w, p.h, 4);
            });
        } else {
            ctx.roundRect(this.x, this.y, this.width, this.height, 4);
            ctx.fillRect(this.x - 4, this.y + 6, this.width + 8, 4);
        }
        ctx.fill();
        ctx.restore();
    }
}

const PICKUP_TYPES = {
    crystal: { color: '#bd00ff' },
    magnet:  { color: '#00d4ff', label: 'M',  name: 'MAGNES' },
    slow:    { color: '#ffd000', label: 'S',  name: 'SPOWOLNIENIE' },
    double:  { color: '#ff8c00', label: 'x2', name: 'PUNKTY x2' }
};

class PickupItem {
    constructor(kind = 'crystal') {
        this.kind = kind;
        const big = kind !== 'crystal';
        this.width = big ? 24 : 16;
        this.height = big ? 24 : 16;
        this.x = V_WIDTH + 20;
        this.y = V_HEIGHT - 40 - Math.random() * 80;
        this.bounceTime = Math.random() * 5;
    }

    update(dt) {
        this.x -= gameSpeed * dt;
        this.bounceTime += dt * 4;
    }

    draw() {
        ctx.save();
        const info = PICKUP_TYPES[this.kind];
        const hoverOffset = Math.sin(this.bounceTime) * 3;

        ctx.shadowBlur = 10;
        ctx.fillStyle = info.color;
        ctx.shadowColor = info.color;

        if (this.kind === 'crystal') {
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + hoverOffset);
            ctx.lineTo(this.x + this.width, this.y + this.height / 2 + hoverOffset);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height + hoverOffset);
            ctx.lineTo(this.x, this.y + this.height / 2 + hoverOffset);
            ctx.closePath();
            ctx.fill();
        } else {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2 + hoverOffset;
            ctx.lineWidth = 3;
            ctx.strokeStyle = info.color;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.label, cx, cy + 1);
        }

        ctx.restore();
    }
}

class Cloud {
    constructor(startX = null) {
        this.x = startX !== null ? startX : V_WIDTH + Math.random() * 150;
        this.y = 30 + Math.random() * 65;
        this.speed = 25 + Math.random() * 15;

        this.circles = [];
        const baseRadius = 12 + Math.random() * 8;
        const numCircles = 3 + Math.floor(Math.random() * 2);

        let currentOffset = 0;
        for (let i = 0; i < numCircles; i++) {
            this.circles.push({
                offsetX: currentOffset,
                offsetY: (Math.random() - 0.5) * (baseRadius * 0.4),
                radius: baseRadius * (0.7 + Math.random() * 0.5)
            });
            currentOffset += baseRadius * (0.5 + Math.random() * 0.4);
        }
        this.width = currentOffset + baseRadius;
        this.pulseTime = Math.random() * 100;
        this.pulseSpeed = 1 + Math.random() * 1.5;
    }

    update(dt) {
        this.x -= this.speed * dt;
        this.pulseTime += dt * this.pulseSpeed;

        if (this.x + this.width < -50) {
            this.x = V_WIDTH + Math.random() * 150;
            this.y = 30 + Math.random() * 65;
        }
    }

    draw() {
        ctx.save();
        const scalePulse = 1 + Math.sin(this.pulseTime) * 0.05;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';

        this.circles.forEach(circle => {
            ctx.beginPath();
            ctx.arc(this.x + circle.offsetX, this.y + circle.offsetY, circle.radius * scalePulse, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

class Star {
    constructor(startX = null) {
        this.x = startX !== null ? startX : V_WIDTH + Math.random() * 50;
        this.y = Math.random() * (V_HEIGHT - 60);
        this.size = 1 + Math.random() * 1.5;
        this.alpha = 0.3 + Math.random() * 0.7;
        this.blinkSpeed = 1 + Math.random() * 2;
        this.speed = (Math.random() * 0.3 + 0.1) * 60;
        this.spawnThreshold = Math.random() * 6000;
    }

    update(dt) {
        this.x -= this.speed * dt;
        if (this.x < 0) {
            this.x = V_WIDTH + this.size;
            this.y = Math.random() * (V_HEIGHT - 60);
        }

        this.alpha += this.blinkSpeed * dt;
        if (this.alpha > 1 || this.alpha < 0.2) {
            this.blinkSpeed = -this.blinkSpeed;
        }
    }

    draw() {
        if (score >= this.spawnThreshold) {
            const a = Math.max(0, Math.min(1, this.alpha)) * currentBiome.stars;
            ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

class UFO {
    constructor() {
        this.x = V_WIDTH + 60;
        this.y = 35 + Math.random() * 30;
        this.width = 45;
        this.speed = 180;
        this.lightTimer = 0;
    }

    update(dt) {
        this.x -= this.speed * dt;
        this.lightTimer += dt * 8;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffcc';

        ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, 9, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#8e9aaf';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 4, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        const lightToggle = Math.floor(this.lightTimer) % 2 === 0;
        ctx.shadowBlur = 5;

        ctx.fillStyle = lightToggle ? '#ff0055' : '#ffe600';
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y + 5, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 12, this.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = lightToggle ? '#ffe600' : '#ff0055';
        ctx.beginPath();
        ctx.arc(this.x, this.y + 7, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- HUD ---

function drawShieldBar() {
    ctx.save();
    const barWidth = 100;
    const barHeight = 10;
    const x = V_WIDTH - barWidth - 20;
    const y = 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 3);
    ctx.fill();

    if (shieldEnergy > 0) {
        ctx.fillStyle = player && player.hasShield ? '#00ff64' : '#bd00ff';
        ctx.shadowBlur = player && player.hasShield ? 8 : 4;
        ctx.shadowColor = ctx.fillStyle;

        ctx.beginPath();
        ctx.roundRect(x, y, (shieldEnergy / 100) * barWidth, barHeight, 3);
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(player && player.hasShield ? 'TARCZA AKTYWNA' : `ENERGIA: ${shieldEnergy}%`, x + barWidth, y - 5);
    ctx.restore();
}

function drawPowerBars() {
    const defs = ['magnet', 'slow', 'double'];
    const x = V_WIDTH - 120;
    let y = 52;

    defs.forEach(k => {
        if (power[k] <= 0) return;
        const info = PICKUP_TYPES[k];

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(x, y, 100, 7, 3);
        ctx.fill();

        ctx.fillStyle = info.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = info.color;
        ctx.beginPath();
        ctx.roundRect(x, y, 100 * (power[k] / POWER_DURATION), 7, 3);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${info.name} ${Math.ceil(power[k])}s`, x + 100, y - 3);
        ctx.restore();

        y += 22;
    });
}

function drawToasts() {
    toasts.forEach((t, i) => {
        const fadeIn = Math.min(1, t.t / 0.25);
        const fadeOut = Math.min(1, (t.dur - t.t) / 0.5);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const w = ctx.measureText(t.text).width + 28;
        const y = 70 + i * 28;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect(V_WIDTH / 2 - w / 2, y - 12, w, 24, 12);
        ctx.fill();

        ctx.fillStyle = t.color;
        ctx.fillText(t.text, V_WIDTH / 2, y + 1);
        ctx.restore();
    });
}

function drawWarnings() {
    warnings.forEach(w => {
        if (Math.floor(w.t * 10) % 2 !== 0) return;
        ctx.save();
        ctx.strokeStyle = w.color;
        ctx.fillStyle = w.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = w.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(V_WIDTH - 22, w.y + 10, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', V_WIDTH - 22, w.y + 11);
        ctx.restore();
    });
}

// --- SILNIK ROZGRYWKI ---

function initGame() {
    resizeCanvas();
    player = new Dino();
    obstacles = [];
    items = [];
    particles = [];
    toasts = [];
    warnings = [];
    activeUfo = null;
    run = createRun();

    score = 0;
    shieldEnergy = 0;
    gameOver = false;
    paused = false;
    dying = false;
    deathTimer = 0;
    gameSpeed = START_SPEED;

    spawnTimer = 0;
    nextSpawn = 1.5;
    itemSpawnTimer = 0;
    nextItemAt = 4 + Math.random() * 2;
    powerSpawnTimer = 0;
    nextPowerAt = 10 + Math.random() * 6;
    scoreTimer = 0;
    nextSpeedMilestone = 1000;
    nextUfoScore = 5000;
    groundOffset = 0;
    shakeMag = 0;
    jumpBuffer = 0;
    power.magnet = power.slow = power.double = 0;

    currentBiome = getBiomeState(0);
    currentBiomeIdx = 0;

    scoreEl.textContent = score;
    if (pauseMenu) pauseMenu.classList.add('hidden');
    if (pauseBtn) pauseBtn.textContent = '⏸';

    clouds = [
        new Cloud(V_WIDTH / 3),
        new Cloud(V_WIDTH / 1.5),
        new Cloud(V_WIDTH)
    ];

    stars = [];
    for (let i = 0; i < 50; i++) {
        let initialStar = new Star();
        initialStar.x = Math.random() * V_WIDTH;
        stars.push(initialStar);
    }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Nieco łagodniejsze hitboxy - kolizja "na styk" nie zabija
function playerBox(p) {
    return { x: p.x + 5, y: p.y + 4, width: p.width - 10, height: p.height - 6 };
}
function obstacleBox(o) {
    return { x: o.x + 2, y: o.y + 2, width: o.width - 4, height: o.height - 3 };
}

function pickObstacleType() {
    const r = Math.random();
    if (score >= 3000 && r < 0.12) return 'fastDrone';
    if (score >= 300 && r < 0.30) return 'drone';
    if (score >= 800 && r < 0.55) return 'group';
    return 'ground';
}

function spawnObstacle() {
    const type = pickObstacleType();
    if (type === 'drone' || type === 'fastDrone') {
        // Ostrzeżenie przed dronem, potem właściwe pojawienie się
        warnings.push({
            type,
            t: 0,
            delay: 0.7,
            y: V_HEIGHT - 68,
            color: type === 'fastDrone' ? '#ffe600' : '#00f5ff'
        });
    } else {
        obstacles.push(new Obstacle(type));
    }
}

function computeSpawnInterval() {
    return Math.max(0.9, 2.2 - (gameSpeed / 400)) * (1 + Math.random() * 0.5);
}

function randomPowerKind() {
    const kinds = ['magnet', 'slow', 'double'];
    return kinds[Math.floor(Math.random() * kinds.length)];
}

function startDying() {
    dying = true;
    deathTimer = 0;
    shakeMag = 14;
    burst(player.x + player.width / 2, player.y + player.height / 2, 40, getSkinColor(),
        { speed: 300, gravity: 500, life: 0.9, size: 5 });
    playSound(explosionSound);
    bgMusic.pause();
    vibrate(80);
}

function update(realDt) {
    // Czas gry: wolniejszy przy śmierci i po zebraniu "spowolnienia"
    let dt = realDt;
    if (dying) dt *= 0.25;
    else if (power.slow > 0) dt *= 0.6;

    if (!dying) {
        Object.keys(power).forEach(k => { power[k] = Math.max(0, power[k] - realDt); });
        run.time += realDt;
        if (player.isCrouching) run.noCrouchTime = 0;
        else run.noCrouchTime += realDt;
        run.distance += (gameSpeed * dt) / 50;
    }

    jumpBuffer = Math.max(0, jumpBuffer - realDt);
    shakeMag = Math.max(0, shakeMag - 45 * realDt);
    groundOffset += gameSpeed * dt;

    // Biom
    currentBiome = getBiomeState(score);
    if (currentBiome.idx !== currentBiomeIdx) {
        currentBiomeIdx = currentBiome.idx;
        showToast(`🌍 ${currentBiome.name}`, '#ffffff');
    }

    // Tło
    stars.forEach(star => star.update(dt));
    if (activeUfo) {
        activeUfo.update(dt);
        if (activeUfo.x < -60) activeUfo = null;
    }
    clouds.forEach(cloud => cloud.update(dt));

    if (!dying) player.update(dt);

    // Kryształy (ładują tarczę)
    if (!dying && !player.hasShield) {
        itemSpawnTimer += dt;
        if (itemSpawnTimer > nextItemAt) {
            items.push(new PickupItem('crystal'));
            itemSpawnTimer = 0;
            nextItemAt = 4 + Math.random() * 2;
        }
    }

    // Power-upy
    if (!dying) {
        powerSpawnTimer += dt;
        if (powerSpawnTimer > nextPowerAt) {
            items.push(new PickupItem(randomPowerKind()));
            powerSpawnTimer = 0;
            nextPowerAt = 10 + Math.random() * 6;
        }
    }

    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.update(dt);

        // Magnes przyciąga pickupy
        if (!dying && power.magnet > 0) {
            const dx = (player.x + player.width / 2) - (it.x + it.width / 2);
            const dy = (player.y + player.height / 2) - (it.y + it.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist < 200 && dist > 1) {
                const pull = 650 * dt;
                it.x += (dx / dist) * pull;
                it.y += (dy / dist) * pull;
            }
        }

        if (!dying && checkCollision(player, it)) {
            const info = PICKUP_TYPES[it.kind];
            if (it.kind === 'crystal') {
                shieldEnergy += 25;
                if (shieldEnergy >= 100) {
                    shieldEnergy = 100;
                    player.hasShield = true;
                }
                run.crystals++;
            } else {
                power[it.kind] = POWER_DURATION;
                if (!run.powerKinds.includes(it.kind)) run.powerKinds.push(it.kind);
                showToast(info.name, info.color);
            }

            burst(it.x + it.width / 2, it.y + it.height / 2, 10, info.color,
                { speed: 140, gravity: 100, life: 0.4, size: 3 });
            vibrate(15);
            playSound(milestoneSound);
            items.splice(i, 1);
            continue;
        }

        if (it.x + it.width < 0) items.splice(i, 1);
    }

    // Ostrzeżenia -> drony
    for (let i = warnings.length - 1; i >= 0; i--) {
        const w = warnings[i];
        w.t += dt;
        if (w.t >= w.delay) {
            if (!dying) obstacles.push(new Obstacle(w.type));
            warnings.splice(i, 1);
        }
    }

    // Przeszkody
    if (!dying) {
        spawnTimer += dt;
        if (spawnTimer > nextSpawn) {
            spawnObstacle();
            spawnTimer = 0;
            nextSpawn = computeSpawnInterval();
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update(dt);

        if (!dying && checkCollision(playerBox(player), obstacleBox(obs))) {
            if (player.hasShield) {
                player.hasShield = false;
                shieldEnergy = 0;
                run.shieldBreaks++;
                burst(obs.x + obs.width / 2, obs.y + obs.height / 2, 24, obs.color,
                    { speed: 260, gravity: 400, life: 0.6, size: 4 });
                shakeMag = Math.max(shakeMag, 7);
                vibrate(30);
                playSound(explosionSound);
                obstacles.splice(i, 1);
                continue;
            } else {
                startDying();
            }
        }

        if (obs.x + obs.width < -10) {
            obstacles.splice(i, 1);
        }
    }

    // Cząsteczki i powiadomienia
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = toasts.length - 1; i >= 0; i--) {
        toasts[i].t += realDt;
        if (toasts[i].t >= toasts[i].dur) toasts.splice(i, 1);
    }

    // Punkty (liczone w czasie rzeczywistym, więc spowolnienie nie zabiera punktów)
    if (!dying) {
        scoreTimer += realDt;
        const mult = power.double > 0 ? 2 : 1;
        while (scoreTimer >= 0.05) {
            scoreTimer -= 0.05;
            score += 5 * mult;
        }
        scoreEl.textContent = score;

        let milestoneHit = false;
        while (score >= nextSpeedMilestone) {
            nextSpeedMilestone += 1000;
            gameSpeed = Math.min(MAX_GAME_SPEED, gameSpeed + 40);
            milestoneHit = true;
        }
        if (milestoneHit) playSound(point1000Sound);

        if (score >= nextUfoScore) {
            nextUfoScore += 5000;
            activeUfo = new UFO();
        }

        checkAchievements();
    }

    // Wolna śmierć -> game over
    if (dying) {
        deathTimer += realDt;
        if (deathTimer >= 0.8) endGame();
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scale, scale);

    if (shakeMag > 0) {
        ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    }

    // Tło (gradient danego biomu)
    const b = currentBiome;
    const grad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    grad.addColorStop(0, rgb(b.top));
    grad.addColorStop(1, rgb(b.bottom));
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, V_WIDTH + 40, V_HEIGHT + 40);

    stars.forEach(star => star.draw());
    if (activeUfo) activeUfo.draw();
    clouds.forEach(cloud => cloud.draw());

    // Podłoże + przesuwające się kreski dla poczucia prędkości
    ctx.strokeStyle = rgb(b.ground, 0.15);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, V_HEIGHT - GROUND_MARGIN);
    ctx.lineTo(V_WIDTH + 20, V_HEIGHT - GROUND_MARGIN);
    ctx.stroke();

    ctx.fillStyle = rgb(b.ground, 0.12);
    const spacing = 60;
    for (let x = -(groundOffset % spacing); x < V_WIDTH + spacing; x += spacing) {
        ctx.fillRect(x, V_HEIGHT - 9, 14, 2);
        ctx.fillRect(x + 31, V_HEIGHT - 5, 6, 2);
    }

    items.forEach(it => it.draw());
    obstacles.forEach(obs => obs.draw());
    drawWarnings();

    if (player && !dying && !gameOver) player.draw();

    ctx.save();
    particles.forEach(p => p.draw());
    ctx.restore();

    drawShieldBar();
    drawPowerBars();
    drawToasts();

    ctx.restore();
}

function animate(timestamp) {
    rafId = null;
    if (gameOver || paused) return;
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    update(dt);
    render();

    if (!gameOver) rafId = requestAnimationFrame(animate);
}

function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
}

function setPaused(value) {
    if (!player || gameOver || dying || value === paused) return;
    paused = value;

    if (paused) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        bgMusic.pause();
        // Puszczone klawisze podczas pauzy nie powinny zostać "przyklejone"
        Object.keys(keys).forEach(k => { keys[k] = false; });
    } else {
        bgMusic.play().catch(() => {});
        startLoop();
    }

    if (pauseMenu) pauseMenu.classList.toggle('hidden', !paused);
    if (pauseBtn) pauseBtn.textContent = paused ? '▶' : '⏸';
}

function endGame() {
    gameOver = true;
    dying = false;
    bgMusic.pause();
    playSound(gameOverSound);

    const previousHigh = highScore;
    const newRecord = score > highScore;
    if (newRecord) {
        highScore = score;
        store.set("highScore", highScore);
        highScoreEl.textContent = highScore;
    }

    // Skórki odblokowane w tym biegu
    const newSkins = SKINS.filter(s => s.unlock > previousHigh && s.unlock <= highScore);
    refreshSkinOptions();

    // Statystyki globalne
    stats.games += 1;
    stats.crystals += run.crystals;
    stats.distance += run.distance;
    stats.bestTime = Math.max(stats.bestTime, Math.round(run.time));
    saveJSON('dinoStats', stats);
    renderAchievements();

    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;

    if (runStatsEl) {
        let line = `Czas: ${Math.round(run.time)} s • Dystans: ${Math.round(run.distance)} m • Kryształy: ${run.crystals}`;
        if (newRecord && previousHigh > 0) line += ' • 🏆 Nowy rekord!';
        if (run.newAch.length) line += ` • Osiągnięcia: ${run.newAch.join(', ')}`;
        if (newSkins.length) line += ` • 🔓 Nowa skórka: ${newSkins.map(s => s.name).join(', ')}`;
        runStatsEl.textContent = line;
    }
    if (totalStatsEl) {
        totalStatsEl.textContent =
            `Łącznie: ${stats.games} gier • ${stats.crystals} kryształów • ${Math.round(stats.distance)} m • ` +
            `osiągnięcia ${unlockedAch.size}/${ACHIEVEMENTS.length}`;
    }

    vibrate(120);
    gameOverMenu.classList.remove("hidden");
}

function startGame() {
    menu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    initGame();
    startLoop();
}

// --- STEROWANIE ---

function tryJump() {
    if (!player.jump()) jumpBuffer = JUMP_BUFFER_TIME;
}

function pressJump() {
    if (!player || gameOver || dying || paused) return;
    keys.JumpBtn = true;
    tryJump();
}

function releaseJump() {
    keys.JumpBtn = false;
}

window.addEventListener("load", () => {
    window.addEventListener("resize", () => {
        resizeCanvas();
        redrawIdle();
    });
    resizeCanvas();
    redrawIdle();
    refreshSkinOptions();
    syncAchievementsWithHighScore();
    renderAchievements();

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            toggleFullscreen();
            fullscreenBtn.blur(); // spacja nie może ponownie "klikać" przycisku
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            setPaused(!paused);
            pauseBtn.blur();
        });
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => setPaused(false));
    }

    const resetProgressBtn = document.getElementById('resetProgressBtn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', resetProgress);
    }

    if (skinSelect) {
        skinSelect.addEventListener('change', () => {
            currentSkin = skinSelect.value;
            store.set('dinoSkin', currentSkin);
            skinSelect.blur(); // klawisze gry nie mogą zmieniać wyboru
            redrawIdle();
        });
    }

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);

    if (volumeControl) {
        volumeControl.addEventListener("input", () => {
            bgMusic.volume = volumeControl.value;
        });
    }

    if (volumeControl1) {
        volumeControl1.addEventListener('input', () => {
            const vol = volumeControl1.value;
            effectSounds.forEach(snd => {
                snd.volume = vol;
            });
        });
    }

    window.addEventListener("keydown", e => {
        if (e.code === "Escape" && dinoContainer && dinoContainer.classList.contains('is-fullscreen')) {
            dinoContainer.classList.remove('is-fullscreen');
            updateFullscreenState();
        }
        // Nie przechwytuj klawiszy w polach formularza (suwaki głośności używają strzałek)
        if (e.target.closest && e.target.closest('input, select, textarea')) return;

        if (e.code === "KeyP") {
            if (!e.repeat && player && !gameOver) setPaused(!paused);
            return;
        }

        const playing = Boolean(player) && !gameOver && !dying && !paused;

        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
            if (playing) e.preventDefault();
            keys[e.code] = true;
            // e.repeat ignorowane, żeby przytrzymanie klawisza nie robiło "bunny hop"
            if (playing && !e.repeat) tryJump();
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
            if (playing) e.preventDefault();
            keys[e.code] = true;
        }
    });

    // Po utracie fokusu okna nie zostawiaj "przyklejonych" klawiszy
    window.addEventListener("blur", () => {
        Object.keys(keys).forEach(k => { keys[k] = false; });
    });

    // Ukrycie karty = automatyczna pauza
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (player && !gameOver && !dying) setPaused(true);
            else bgMusic.pause();
        }
    });

    window.addEventListener("keyup", e => {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "KeyS" || e.code === "KeyW") {
            keys[e.code] = false;
        }
    });

    if (jumpBtn) {
        const handleJump = (e) => {
            e.preventDefault();
            pressJump();
        };
        const handleRelease = (e) => {
            e.preventDefault();
            releaseJump();
        };
        jumpBtn.addEventListener("touchstart", handleJump, { passive: false });
        jumpBtn.addEventListener("touchend", handleRelease, { passive: false });
        jumpBtn.addEventListener("touchcancel", handleRelease, { passive: false });
        jumpBtn.addEventListener("mousedown", handleJump);
        jumpBtn.addEventListener("mouseup", handleRelease);
        jumpBtn.addEventListener("mouseleave", handleRelease);
    }

    // Tapnięcie w planszę = skok (przytrzymanie = wyższy skok)
    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        pressJump();
    }, { passive: false });
    canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        releaseJump();
    }, { passive: false });
    canvas.addEventListener("touchcancel", releaseJump);

    if (crouchBtn) {
        const startCrouch = (e) => {
            e.preventDefault();
            keys.ArrowDown = true;
        };
        const endCrouch = (e) => {
            e.preventDefault();
            keys.ArrowDown = false;
        };
        crouchBtn.addEventListener("touchstart", startCrouch, { passive: false });
        crouchBtn.addEventListener("touchend", endCrouch, { passive: false });
        crouchBtn.addEventListener("touchcancel", endCrouch, { passive: false });
        crouchBtn.addEventListener("mousedown", startCrouch);
        crouchBtn.addEventListener("mouseup", endCrouch);
        crouchBtn.addEventListener("mouseleave", endCrouch);
    }

    if (startBtn) {
        startBtn.addEventListener("click", startGame);
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", startGame);
    }
});