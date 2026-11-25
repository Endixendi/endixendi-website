/**
 * Gra Shooter (wersja rozbudowana)
 *
 * Funkcje: fale wrogów i bossowie co 5. falę, 5 typów wrogów, power-upy, combo,
 * 3 poziomy trudności, 3 statki, cząsteczki i wstrząsy ekranu, pauza,
 * podsumowanie gry, osiągnięcia i ustawienia zapisywane w przeglądarce.
 *
 * Wymaga wcześniej załadowanych: storage.js i fullscreen.js.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.log('Nie znaleziono gameCanvas. Pomijam inicjalizację gry Shooter.');
        return;
    }
    const ctx = canvas.getContext('2d');
    const $ = (id) => document.getElementById(id);

    /* ==========================================================================
       ELEMENTY STRONY
       ========================================================================== */
    const shooterStage = $('shooterStage');
    const fullscreenBtn = $('fullscreenBtn');
    const pauseBtn = $('pauseBtn');
    const scoreEl = $('score');
    const healthFill = $('healthFill');
    const heatFillBar = $('heatFillBar');

    const menu = $('menu');
    const startBtn = $('startBtn');
    const gameOverMenu = $('gameOverMenu');
    const finalScoreEl = $('finalScore');
    const finalHighScoreEl = $('finalHighScore');
    const summaryEl = $('gameSummary');
    const restartBtn = $('restartBtn');
    const menuBtn = $('menuBtn');
    const toastEl = $('achievementToast');
    const achievementsList = $('achievementsList');
    const achievementsProgress = $('achievementsProgress');
    const achievementsStats = $('achievementsStats');

    const difficultyChoices = $('difficultyChoices');
    const shipChoices = $('shipChoices');
    const optShake = $('optShake');
    const optMouse = $('optMouse');
    const optTouchSens = $('optTouchSens');
    const resetProgressBtn = $('resetProgressBtn');

    const volumeControl = $('volume-music');
    const volumeControl1 = $('volume-effects');

    const mobileShoot = $('mobileShootBtn');
    const sliderArea = $('touchSliderArea');
    const sliderHandle = $('sliderHandle');

    /* ==========================================================================
       STAŁE I DANE GRY
       ========================================================================== */
    const V_WIDTH = 800;
    const V_HEIGHT = 600;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const KEY_PREFIX = 'endixendi:shooter:';
    const KEYS = {
        highscore: KEY_PREFIX + 'highscore',
        settings: KEY_PREFIX + 'settings',
        stats: KEY_PREFIX + 'stats',
        achievements: KEY_PREFIX + 'achievements'
    };

    const DIFFICULTIES = {
        easy: {
            label: 'Łatwy', maxHeat: 120, heatPerShot: 12, coolDownRate: 50, overheatPenalty: 4000,
            spawnBase: 1500, enemySpeed: 100, bulletSpeed: 280, enemyDmg: 0.7, enemyCount: 0.8,
            bossHp: 0.8, scoreMul: 0.8, dropChance: 0.18
        },
        normal: {
            label: 'Normalny', maxHeat: 100, heatPerShot: 15, coolDownRate: 40, overheatPenalty: 5000,
            spawnBase: 1200, enemySpeed: 120, bulletSpeed: 350, enemyDmg: 1, enemyCount: 1,
            bossHp: 1, scoreMul: 1, dropChance: 0.12
        },
        hard: {
            label: 'Trudny', maxHeat: 100, heatPerShot: 17, coolDownRate: 34, overheatPenalty: 6000,
            spawnBase: 950, enemySpeed: 150, bulletSpeed: 420, enemyDmg: 1.3, enemyCount: 1.25,
            bossHp: 1.3, scoreMul: 1.5, dropChance: 0.09
        }
    };

    const SHIPS = {
        balanced: { name: 'Zbalansowany', speed: 640, cooldown: 150, health: 100, heatMul: 1, width: 48, color: '#ffa500' },
        agile: { name: 'Zwinny', speed: 820, cooldown: 130, health: 75, heatMul: 1.1, width: 40, color: '#4dd2ff' },
        heavy: { name: 'Ciężki', speed: 480, cooldown: 190, health: 140, heatMul: 0.8, width: 58, color: '#b06cff' }
    };

    // shoot: [min, max] sekund między strzałami (null = nie strzela)
    const ENEMY_TYPES = {
        normal: { w: 56, h: 56, hp: 1, speed: 1.0, score: 10, color: '#ff3b3b', shoot: [2.5, 4.5], minWave: 1, weight: 10 },
        fast: { w: 40, h: 40, hp: 1, speed: 1.9, score: 15, color: '#ffb347', shoot: null, minWave: 2, weight: 5 },
        zigzag: { w: 48, h: 48, hp: 1, speed: 1.0, score: 20, color: '#46e3a8', shoot: [3, 5], zig: true, minWave: 3, weight: 5 },
        armored: { w: 64, h: 64, hp: 3, speed: 0.7, score: 30, color: '#8e99a8', shoot: [2, 3.5], minWave: 4, weight: 4 },
        shooter: { w: 52, h: 52, hp: 2, speed: 0.8, score: 35, color: '#c04dff', shoot: [1.2, 2], aimed: true, minWave: 5, weight: 4 },
        boss: { w: 150, h: 80, hp: 0, speed: 0, score: 0, color: '#ff5a1f', shoot: null, minWave: 99, weight: 0 }
    };

    // Style bossów: pierwsze trzy bossy pojawiają się po kolei, potem losowo (bez powtórzeń z rzędu)
    const BOSS_STYLES = [
        { key: 'crusher', name: 'Kruszyciel', color: '#ff5a1f', width: 150, height: 80 },
        { key: 'vortex', name: 'Wir', color: '#c04dff', width: 130, height: 110 },
        { key: 'hunter', name: 'Łowca', color: '#2fe0c0', width: 170, height: 70 }
    ];

    const POWERUPS = {
        cooling: { icon: '🧊', color: '#4dd2ff', label: 'Chłodzenie!' },
        shield: { icon: '🛡️', color: '#5c8dff', label: 'Tarcza!' },
        triple: { icon: '🔱', color: '#ffe14d', label: 'Strzał potrójny!' },
        repair: { icon: '❤️', color: '#4cd964', label: '+25 zdrowia' }
    };

    const SHIELD_DURATION = 15;
    const TRIPLE_DURATION = 8;
    const COMBO_WINDOW = 3;

    const ACHIEVEMENTS = [
        { id: 'first_blood', icon: '🎯', name: 'Pierwsza krew', desc: 'Zestrzel pierwszego wroga.' },
        { id: 'centurion', icon: '💯', name: 'Setka', desc: 'Zestrzel łącznie 100 wrogów.',
          goal: 100, hint: 'Zestrzelone wrogi', progress: () => lifetime.kills },
        { id: 'cool_head', icon: '🧊', name: 'Zimna głowa', desc: 'Ukończ falę bez przegrzania broni.' },
        { id: 'untouchable', icon: '✨', name: 'Nietykalny', desc: 'Ukończ falę bez utraty zdrowia.' },
        { id: 'combo_master', icon: '🔥', name: 'Mistrz combo', desc: 'Zbuduj serię 20 trafień (mnożnik x5).',
          goal: 20, hint: 'Najlepsza seria', progress: () => lifetime.bestCombo },
        { id: 'boss_slayer', icon: '👾', name: 'Pogromca bossa', desc: 'Pokonaj bossa.' },
        { id: 'boss_all', icon: '🏆', name: 'Łowca bossów', desc: 'Pokonaj wszystkie 3 rodzaje bossów.',
          goal: 3, hint: 'Rodzaje bossów', progress: () => lifetime.bossStyles.length },
        { id: 'veteran', icon: '🎖️', name: 'Weteran', desc: 'Dotrzyj do 10. fali.',
          goal: 10, hint: 'Najlepsza fala', progress: () => lifetime.bestWave },
        { id: 'collector', icon: '🎁', name: 'Kolekcjoner', desc: 'Zbierz łącznie 25 power-upów.',
          goal: 25, hint: 'Power-upy', progress: () => lifetime.powerups },
        { id: 'perfect_boss', icon: '🛡️', name: 'Perfekcjonista', desc: 'Pokonaj bossa, nie tracąc ani punktu zdrowia w całej fali.' },
        { id: 'hard_veteran', icon: '💀', name: 'Twardziel', desc: 'Dotrzyj do 10. fali na poziomie Trudnym.' },
        { id: 'close_call', icon: '😅', name: 'Na krawędzi', desc: 'Ukończ falę z mniej niż 10% zdrowia.' }
    ];

    /* ==========================================================================
       POMOCNICZE
       ========================================================================== */
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function loadJSON(key, defaults) {
        try {
            const raw = store.get(key);
            if (!raw) return { ...defaults };
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? { ...defaults, ...parsed } : { ...defaults };
        } catch (e) {
            return { ...defaults };
        }
    }

    function loadList(key) {
        try {
            const raw = store.get(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function formatTime(sec) {
        const s = Math.floor(sec);
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    /* ==========================================================================
       USTAWIENIA, STATYSTYKI I OSIĄGNIĘCIA (zapis w przeglądarce)
       ========================================================================== */
    const settings = loadJSON(KEYS.settings, {
        difficulty: 'normal', ship: 'balanced', shake: !reduceMotion, mouse: false, touchSens: 1
    });
    if (!DIFFICULTIES[settings.difficulty]) settings.difficulty = 'normal';
    if (!SHIPS[settings.ship]) settings.ship = 'balanced';
    settings.touchSens = clamp(parseFloat(settings.touchSens) || 1, 0.5, 1.5);

    const lifetime = loadJSON(KEYS.stats, { kills: 0, games: 0, bossKills: 0, powerups: 0, bestWave: 0, bestCombo: 0, bossStyles: [] });
    if (!Array.isArray(lifetime.bossStyles)) lifetime.bossStyles = [];
    const unlocked = new Set(loadList(KEYS.achievements));
    let shooterHighScore = parseInt(store.get(KEYS.highscore), 10) || 0;

    const saveSettings = () => store.set(KEYS.settings, JSON.stringify(settings));
    const saveLifetime = () => store.set(KEYS.stats, JSON.stringify(lifetime));

    /* ==========================================================================
       DŹWIĘKI
       ========================================================================== */
    const sounds = {
        bg: new Audio('assets/sounds/shooter/shooter-bg.mp3'),
        gameover: new Audio('assets/sounds/global/gameover-sad.mp3'),
        playerShoot: new Audio('assets/sounds/global/laser.mp3'),
        explosion: new Audio('assets/sounds/global/explosion.mp3'),
        hit: new Audio('assets/sounds/global/hit.mp3'),
        overheat: new Audio('assets/sounds/global/point.mp3'),
        powerup: new Audio('assets/sounds/global/success.mp3'),
        wave: new Audio('assets/sounds/global/line-clear.mp3')
    };

    sounds.bg.loop = true;
    // Głośność startowa pochodzi z suwaków w shooter.html (atrybut value)
    sounds.bg.volume = volumeControl ? parseFloat(volumeControl.value) : 0.3;
    Object.keys(sounds).forEach((k) => {
        if (k !== 'bg') sounds[k].volume = volumeControl1 ? parseFloat(volumeControl1.value) : 0.3;
    });

    function playSound(name) {
        const s = sounds[name];
        if (!s) return;
        s.currentTime = 0;
        s.play().catch(() => {});
    }

    /* ==========================================================================
       STAN GRY
       ========================================================================== */
    const state = {
        running: false,
        paused: false,
        gameOver: false,
        rafId: null,
        lastTime: 0,
        time: 0,

        diff: DIFFICULTIES[settings.difficulty],
        ship: SHIPS[settings.ship],

        player: null,
        bullets: [],
        enemies: [],
        enemyBullets: [],
        powerups: [],
        particles: [],
        texts: [],
        stars: [],

        keys: {},
        mouseDown: false,

        score: 0,
        health: 100,
        maxHealth: 100,
        heat: 0,
        maxHeat: 100,
        isOverheated: false,
        overheatTimer: 0,
        lastShot: 0,

        shield: 0,
        triple: 0,
        invuln: 0,
        shake: 0,

        combo: 0,
        comboTimer: 0,

        wave: 0,
        bossStyle: null,
        bossTier: 0,
        lastBossIdx: -1,
        waveState: 'idle',
        waveTimer: 0,
        spawnQueue: [],
        spawnTimer: 0,
        banner: null,
        hadOverheat: false,
        hadDamage: false,

        run: { kills: 0, maxCombo: 0, powerups: 0, bosses: 0, newAchievements: [], newRecord: false }
    };

    /* ==========================================================================
       ROZMIAR PŁÓTNA I PEŁNY EKRAN
       ========================================================================== */
    let scale = 1;

    function resizeCanvas() {
        const container = document.querySelector('.shooter-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const availW = Math.max(200, rect.width || container.offsetWidth || 800);
        const availH = Math.max(150, rect.height || availW * 0.75);
        const aspect = V_WIDTH / V_HEIGHT;

        let targetWidth = availW;
        let targetHeight = targetWidth / aspect;

        if (targetHeight > availH) {
            targetHeight = availH;
            targetWidth = targetHeight * aspect;
        }

        // Ostry obraz na ekranach HiDPI (rozmiar CSS ustala stylesheet)
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        scale = (targetWidth * dpr) / V_WIDTH;
        canvas.width = Math.floor(targetWidth * dpr);
        canvas.height = Math.floor(targetHeight * dpr);

        // Zmiana rozmiaru czyści płótno, więc przy zatrzymanej grze rysujemy je ponownie
        if (state.paused || state.gameOver) render();
    }

    function isFullscreenActive() {
        return GameFullscreen.isActive(shooterStage);
    }

    function updateFullscreenUI() {
        const active = isFullscreenActive();
        if (fullscreenBtn) {
            fullscreenBtn.textContent = active ? '✕' : '⛶';
            fullscreenBtn.title = active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran';
            fullscreenBtn.setAttribute('aria-label', active ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran');
        }
        document.body.style.overflow = active ? 'hidden' : '';
        setTimeout(resizeCanvas, 50);
    }

    function toggleFullscreen() {
        GameFullscreen.toggle(shooterStage, updateFullscreenUI);
    }

    /* ==========================================================================
       KLASY OBIEKTÓW
       ========================================================================== */
    class Player {
        constructor(ship) {
            this.ship = ship;
            this.width = ship.width;
            this.height = 48;
            this.x = V_WIDTH / 2 - this.width / 2;
            this.y = V_HEIGHT - this.height - 15;
            this.speed = ship.speed;
        }

        update(dt) {
            const k = state.keys;
            if (k.ArrowLeft || k.a || k.A) this.x -= this.speed * dt;
            if (k.ArrowRight || k.d || k.D) this.x += this.speed * dt;
            this.x = clamp(this.x, 0, V_WIDTH - this.width);
        }

        draw() {
            const { x, y, width: w, height: h } = this;
            ctx.save();
            if (state.invuln > 0 && Math.floor(state.time * 20) % 2 === 0) ctx.globalAlpha = 0.4;
            ctx.fillStyle = state.isOverheated ? '#555' : this.ship.color;
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w / 2, y + h * 0.78);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(x + w / 2 - 3, y + h * 0.38, 6, 12);
            ctx.restore();

            if (state.shield > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(92,200,255,0.9)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x + w / 2, y + h / 2, w * 0.78, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    class Projectile {
        constructor(x, y, vx, vy, color, w = 4, h = 12, round = false) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.width = w;
            this.height = h;
            this.color = color;
            this.round = round;
            this.toRemove = false;
        }

        update(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        draw() {
            ctx.fillStyle = this.color;
            if (this.round) {
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 1, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    class Enemy {
        constructor(typeKey, x, y) {
            const t = ENEMY_TYPES[typeKey];
            this.type = typeKey;
            this.def = t;
            this.isBoss = typeKey === 'boss';
            this.style = this.isBoss ? state.bossStyle : null;
            this.width = this.isBoss ? this.style.width : t.w;
            this.height = this.isBoss ? this.style.height : t.h;
            this.x = x;
            this.y = y;
            this.baseX = x;
            this.phase = Math.random() * Math.PI * 2;
            this.age = 0;
            this.flash = 0;
            this.toRemove = false;

            if (this.isBoss) {
                // Każdy kolejny boss jest trudniejszy: więcej życia, szybsze i liczniejsze pociski
                const tier = state.bossTier;
                this.hp = Math.round((30 + 3 * state.wave) * (1 + 0.08 * tier) * state.diff.bossHp);
                this.vy = 80;
                this.phase = 1;
                this.rate = Math.max(0.55, 1 - 0.08 * tier);          // mnożnik odstępów między atakami
                this.bulletMul = Math.min(1.5, 1 + 0.06 * tier);      // mnożnik prędkości pocisków
                this.extra = Math.min(3, Math.floor(tier / 1.5));     // dodatkowe pociski w salwach
                this.shootTimer = 1.5 * this.rate;
                this.patternStep = 0;
                this.spiralTimer = 0.5;
                this.spiralAngle = 0;
                this.ringTimer = 2.4;
                this.mode = 'rest';
                this.modeTimer = 0.8;
                this.tx = 0;
                this.burstLeft = 0;
                this.burstTimer = 0;
            } else {
                this.hp = t.hp;
                const waveBoost = Math.min(2.2, 1 + 0.03 * (state.wave - 1));
                this.vy = state.diff.enemySpeed * t.speed * waveBoost;
                this.shootTimer = t.shoot ? rand(t.shoot[0], t.shoot[1]) : Infinity;
                this.hover = t.aimed ? { y: rand(70, 150), time: 7 } : null;
            }
            this.maxHp = this.hp;
        }

        update(dt) {
            this.age += dt;
            this.flash = Math.max(0, this.flash - dt);

            if (this.isBoss) {
                this.updateBoss(dt);
                return;
            }

            if (this.def.zig) {
                this.y += this.vy * dt;
                this.x = clamp(this.baseX + Math.sin(this.age * 2.6 + this.phase) * 90, 0, V_WIDTH - this.width);
            } else if (this.hover) {
                if (this.y < this.hover.y) {
                    this.y += this.vy * 1.4 * dt;
                } else if (this.hover.time > 0) {
                    this.hover.time -= dt;
                    this.x = clamp(this.baseX + Math.sin(this.age * 1.2 + this.phase) * 160, 0, V_WIDTH - this.width);
                } else {
                    this.y += this.vy * dt;
                }
            } else {
                this.y += this.vy * dt;
            }

            if (this.y > 0 && this.y < V_HEIGHT - 120) {
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shoot();
                    this.shootTimer = rand(this.def.shoot[0], this.def.shoot[1]);
                }
            }
        }

        shoot() {
            const cx = this.x + this.width / 2;
            const by = this.y + this.height;
            const speed = state.diff.bulletSpeed;
            if (this.def.aimed) {
                fireEnemy(cx, by, aimAngle(cx, by), speed * 1.1, '#e07bff');
            } else {
                fireEnemy(cx, by, 0, speed, '#ff4040');
            }
        }

        // Faza walki: 1 (>50% życia), 2 (<=50%), 3 (<=20%, tylko od drugiego bossa)
        bossPhase() {
            const r = this.hp / this.maxHp;
            if (r > 0.5) return 1;
            if (r > 0.2) return 2;
            return state.bossTier >= 1 ? 3 : 2;
        }

        updateBoss(dt) {
            const targetY = 120;
            if (this.y < targetY) {
                this.y = Math.min(targetY, this.y + this.vy * dt);
                return;
            }

            const phase = this.bossPhase();
            if (phase > this.phase) this.enterPhase(phase);

            if (this.style.key === 'vortex') this.updateVortex(dt, phase);
            else if (this.style.key === 'hunter') this.updateHunter(dt, phase);
            else this.updateCrusher(dt, phase);
        }

        enterPhase(phase) {
            this.phase = phase;
            addShake(10);
            burst(this.x + this.width / 2, this.y + this.height / 2, this.style.color, 30, 260);
            state.banner = {
                title: phase === 3 ? 'Boss wpada w szał!' : 'Boss się wścieka!',
                sub: '', time: 1.4, max: 1.4
            };
            // Silniejsze bossy przywołują posiłki
            if (phase === 2 && state.bossTier >= 1) {
                const count = Math.min(4, 1 + state.bossTier);
                for (let i = 0; i < count; i++) spawnEnemy(pickEnemyType(state.wave));
            }
        }

        // STYL 1: Kruszyciel - szerokie wachlarze i celowane salwy
        updateCrusher(dt, phase) {
            const center = V_WIDTH / 2 - this.width / 2;
            const amplitude = V_WIDTH / 2 - this.width / 2 - 20;
            this.x = center + Math.sin(this.age * 0.9) * amplitude;

            this.shootTimer -= dt;
            if (this.shootTimer > 0) return;
            this.shootTimer = [0, 1.5, 1.0, 0.75][phase] * this.rate;
            this.patternStep++;

            const cx = this.x + this.width / 2;
            const by = this.y + this.height;
            const sp = state.diff.bulletSpeed * 0.85 * this.bulletMul;
            const wide = 5 + 2 * this.extra;
            const aimed = () => {
                const a = aimAngle(cx, by);
                for (let i = -1; i <= 1; i++) fireEnemy(cx, by, a + i * 0.12, sp * 1.15, '#ff3b6b');
            };

            if (phase === 1) {
                spread(cx, by, 3 + 2 * this.extra, 0.28 + 0.03 * this.extra, sp, '#ff7a00');
            } else if (phase === 2) {
                if (this.patternStep % 2 === 0) spread(cx, by, wide, 0.5, sp, '#ff7a00');
                else aimed();
            } else {
                spread(cx, by, wide, 0.5, sp, '#ff7a00');
                aimed();
            }
        }

        // STYL 2: Wir - spirale pocisków i pierścienie
        updateVortex(dt, phase) {
            const center = V_WIDTH / 2 - this.width / 2;
            this.x = center + Math.sin(this.age * 0.5) * 150;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const sp = state.diff.bulletSpeed * 0.6 * this.bulletMul;

            this.spiralTimer -= dt;
            if (this.spiralTimer <= 0) {
                const arms = 2 + (state.bossTier >= 2 ? 1 : 0) + (phase === 3 ? 1 : 0);
                for (let k = 0; k < arms; k++) {
                    fireEnemy(cx, cy, this.spiralAngle + (k * Math.PI * 2) / arms, sp, '#e07bff');
                }
                this.spiralAngle += phase === 2 ? -0.32 : 0.32;
                this.spiralTimer = Math.max(0.1, (phase === 1 ? 0.16 : 0.12) * this.rate);
            }

            if (phase >= 2) {
                this.ringTimer -= dt;
                if (this.ringTimer <= 0) {
                    const n = 14 + 2 * this.extra;
                    const offset = Math.random() * Math.PI;
                    for (let i = 0; i < n; i++) {
                        fireEnemy(cx, cy, offset + (i * Math.PI * 2) / n, sp * 1.1, '#ff3b6b');
                    }
                    this.ringTimer = 2.6 * this.rate;
                }
            }
        }

        // STYL 3: Łowca - szybkie rzuty w stronę gracza, serie i "kurtyna" pocisków z luką
        updateHunter(dt, phase) {
            const sp = state.diff.bulletSpeed * this.bulletMul;
            const p = state.player;

            if (this.mode === 'move') {
                const step = (260 + 40 * state.bossTier + (phase === 3 ? 90 : 0)) * dt;
                const dx = this.tx - this.x;
                if (Math.abs(dx) <= step) {
                    this.x = this.tx;
                    this.mode = 'burst';
                    this.burstLeft = 3 + this.extra + (phase >= 2 ? 2 : 0);
                    this.burstTimer = 0.25;
                } else {
                    this.x += Math.sign(dx) * step;
                }
            } else if (this.mode === 'burst') {
                this.burstTimer -= dt;
                if (this.burstLeft > 0 && this.burstTimer <= 0) {
                    const cx = this.x + this.width / 2;
                    const by = this.y + this.height;
                    fireEnemy(cx, by, aimAngle(cx, by), sp * 1.25, '#2fe0c0');
                    this.burstLeft--;
                    this.burstTimer = 0.12;
                }
                if (this.burstLeft === 0 && this.burstTimer <= 0) {
                    if (phase >= 2) this.curtain(sp);
                    this.mode = 'rest';
                    this.modeTimer = 0.9 * this.rate;
                }
            } else {
                this.modeTimer -= dt;
                this.x = clamp(this.x + Math.sin(this.age * 3) * 40 * dt, 0, V_WIDTH - this.width);
                if (this.modeTimer <= 0) {
                    this.mode = 'move';
                    this.tx = clamp(p.x + p.width / 2 - this.width / 2 + rand(-60, 60), 0, V_WIDTH - this.width);
                }
            }
        }

        // Rząd pocisków na całą szerokość ekranu z luką do przelecenia
        curtain(speed) {
            const slots = 11;
            const gapSlots = state.bossTier >= 4 ? 1 : 2;
            const gap = Math.floor(Math.random() * (slots - gapSlots + 1));
            const by = this.y + this.height;
            for (let i = 0; i < slots; i++) {
                if (i >= gap && i < gap + gapSlots) continue;
                fireEnemy((V_WIDTH * (i + 0.5)) / slots, by, 0, speed * 0.7, '#7cfbe0');
            }
        }

        drawBoss() {
            const { x, y, width: w, height: h } = this;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const enraged = this.phase >= 2;
            ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.style.color;

            if (this.style.key === 'vortex') {
                ctx.beginPath();
                ctx.arc(cx, cy, h * 0.42, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 6; i++) {
                    const a = this.age * (enraged ? 2.6 : 1.6) + (i * Math.PI * 2) / 6;
                    ctx.beginPath();
                    ctx.arc(cx + Math.cos(a) * w * 0.48, cy + Math.sin(a) * h * 0.48, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#1a0b24';
                ctx.beginPath();
                ctx.arc(cx, cy, h * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = enraged ? '#ff3b6b' : '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, h * 0.09, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.style.key === 'hunter') {
                ctx.beginPath();
                ctx.moveTo(x + w * 0.15, y + h * 0.15);
                ctx.lineTo(x + w * 0.85, y + h * 0.15);
                ctx.lineTo(x + w, y + h * 0.65);
                ctx.lineTo(x + w * 0.5, y + h);
                ctx.lineTo(x, y + h * 0.65);
                ctx.closePath();
                ctx.fill();
                // szpony po bokach
                ctx.beginPath();
                ctx.moveTo(x, y + h * 0.3);
                ctx.lineTo(x - 18, y + h * 0.85);
                ctx.lineTo(x + w * 0.18, y + h * 0.6);
                ctx.moveTo(x + w, y + h * 0.3);
                ctx.lineTo(x + w + 18, y + h * 0.85);
                ctx.lineTo(x + w * 0.82, y + h * 0.6);
                ctx.fill();
                ctx.fillStyle = '#0b1a17';
                ctx.fillRect(x + w * 0.3, y + h * 0.35, w * 0.4, 10);
                ctx.fillStyle = enraged ? '#ff2a2a' : '#7cfbe0';
                ctx.fillRect(x + w * 0.36, y + h * 0.38, 12, 4);
                ctx.fillRect(x + w * 0.64 - 12, y + h * 0.38, 12, 4);
            } else {
                ctx.fillRect(x, y + 14, w, h - 14);
                ctx.fillRect(x + w * 0.3, y, w * 0.4, 20);
                ctx.fillStyle = enraged ? '#ff2a2a' : '#1a1a1a';
                ctx.fillRect(x + w * 0.2, y + 34, 18, 14);
                ctx.fillRect(x + w * 0.8 - 18, y + 34, 18, 14);
            }
        }

        draw() {
            const { x, y, width: w, height: h } = this;
            ctx.save();
            ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.def.color;

            switch (this.type) {
                case 'fast':
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + w, y);
                    ctx.lineTo(x + w / 2, y + h);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'zigzag':
                    ctx.beginPath();
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + h / 2);
                    ctx.lineTo(x + w / 2, y + h);
                    ctx.lineTo(x, y + h / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'shooter':
                    ctx.beginPath();
                    ctx.moveTo(x + w * 0.25, y);
                    ctx.lineTo(x + w * 0.75, y);
                    ctx.lineTo(x + w, y + h * 0.5);
                    ctx.lineTo(x + w * 0.75, y + h);
                    ctx.lineTo(x + w * 0.25, y + h);
                    ctx.lineTo(x, y + h * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(x + w / 2 - 4, y + h / 2 - 4, 8, 8);
                    break;
                case 'armored':
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeStyle = '#3b4350';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
                    break;
                case 'boss':
                    this.drawBoss();
                    break;
                default:
                    ctx.fillRect(x, y, w, h);
                    ctx.fillStyle = 'rgba(0,0,0,0.45)';
                    ctx.fillRect(x + w * 0.2, y + h * 0.3, 10, 10);
                    ctx.fillRect(x + w * 0.8 - 10, y + h * 0.3, 10, 10);
            }

            // Pasek życia wrogów z kilkoma punktami życia
            if (!this.isBoss && this.maxHp > 1) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(x, y - 8, w, 4);
                ctx.fillStyle = '#4cd964';
                ctx.fillRect(x, y - 8, w * (this.hp / this.maxHp), 4);
            }
            ctx.restore();
        }
    }

    class PowerUp {
        constructor(type, x, y) {
            this.type = type;
            this.def = POWERUPS[type];
            this.width = 32;
            this.height = 32;
            this.x = x - this.width / 2;
            this.y = y;
            this.vy = 110;
            this.age = 0;
            this.toRemove = false;
        }

        update(dt) {
            this.age += dt;
            this.y += this.vy * dt;
        }

        draw() {
            const cx = this.x + this.width / 2 + Math.sin(this.age * 4) * 3;
            const cy = this.y + this.height / 2;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(this.def.icon, cx, cy + 1);
            ctx.restore();
        }
    }

    /* ==========================================================================
       POCISKI WROGÓW I POMOCNIKI
       ========================================================================== */
    // angle: kąt od kierunku "prosto w dół" (radiany)
    function fireEnemy(x, y, angle, speed, color) {
        state.enemyBullets.push(new Projectile(x - 3, y, Math.sin(angle) * speed, Math.cos(angle) * speed, color, 6, 6, true));
    }

    // Wachlarz pocisków rozłożonych równomiernie od -half do +half (radiany)
    function spread(x, y, count, half, speed, color) {
        for (let i = 0; i < count; i++) {
            const a = count === 1 ? 0 : -half + (2 * half * i) / (count - 1);
            fireEnemy(x, y, a, speed, color);
        }
    }

    function aimAngle(fromX, fromY) {
        const p = state.player;
        if (!p) return 0;
        return Math.atan2(p.x + p.width / 2 - fromX, p.y + p.height / 2 - fromY);
    }

    function detectCollision(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    /* ==========================================================================
       EFEKTY: cząsteczki, wstrząsy, teksty
       ========================================================================== */
    function burst(x, y, color, count, speed = 180) {
        if (reduceMotion) count = Math.ceil(count / 3);
        for (let i = 0; i < count && state.particles.length < 260; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = rand(speed * 0.3, speed);
            const life = rand(0.35, 0.8);
            state.particles.push({
                x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life, max: life, size: rand(2, 4.5), color
            });
        }
    }

    function addShake(amount) {
        if (!settings.shake) return;
        state.shake = Math.max(state.shake, amount);
    }

    function floatText(x, y, text, color = '#fff') {
        if (state.texts.length > 24) state.texts.shift();
        state.texts.push({ x, y, text, color, life: 1, max: 1 });
    }

    /* ==========================================================================
       OSIĄGNIĘCIA
       ========================================================================== */
    const toastQueue = [];
    let toastBusy = false;

    function nextToast() {
        const a = toastQueue.shift();
        if (!a || !toastEl) {
            toastBusy = false;
            return;
        }
        toastBusy = true;
        toastEl.textContent = a.icon + a.name;
        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(nextToast, 400);
        }, 3200);
    }

    function renderAchievements() {
        if (!achievementsList) return;
        achievementsList.innerHTML = '';
        ACHIEVEMENTS.forEach((a) => {
            const done = unlocked.has(a.id);
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
                const bar = document.createElement('span');
                bar.className = 'achievement-bar';
                const fill = document.createElement('span');
                fill.className = 'achievement-bar-fill';
                fill.style.width = Math.round((cur / a.goal) * 100) + '%';
                bar.appendChild(fill);
                const hint = document.createElement('small');
                hint.textContent = a.hint + ': ' + cur.toLocaleString('pl-PL') + ' / ' + a.goal.toLocaleString('pl-PL');
                body.appendChild(bar);
                body.appendChild(hint);
            }

            li.appendChild(icon);
            li.appendChild(body);
            achievementsList.appendChild(li);
        });
        if (achievementsProgress) {
            achievementsProgress.textContent = 'Odblokowano: ' + unlocked.size + ' / ' + ACHIEVEMENTS.length;
        }
        if (achievementsStats) {
            achievementsStats.textContent =
                'Rozegrane gry: ' + lifetime.games +
                ' • Zestrzelone wrogi: ' + lifetime.kills +
                ' • Pokonane bossy: ' + lifetime.bossKills +
                ' • Najlepsza fala: ' + lifetime.bestWave +
                ' • Najlepsze combo: x' + lifetime.bestCombo;
        }
    }

    function unlock(id) {
        if (unlocked.has(id)) return;
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (!a) return;
        unlocked.add(id);
        store.set(KEYS.achievements, JSON.stringify([...unlocked]));
        state.run.newAchievements.push(a.name);
        toastQueue.push(a);
        if (!toastBusy) nextToast();
        renderAchievements();
    }

    /* ==========================================================================
       WYNIK, COMBO, ZDROWIE
       ========================================================================== */
    const comboMultiplier = () => Math.min(5, 1 + Math.floor(state.combo / 5));

    function addScore(base, useCombo = true) {
        const mult = useCombo ? comboMultiplier() : 1;
        const pts = Math.round(base * mult * state.diff.scoreMul);
        state.score += pts;
        return pts;
    }

    function takeDamage(val, leak = false) {
        if (state.gameOver) return;

        if (!leak) {
            if (state.invuln > 0) return;
            if (state.shield > 0) {
                state.shield = 0;
                state.invuln = 0.4;
                const p = state.player;
                burst(p.x + p.width / 2, p.y + p.height / 2, '#5cc8ff', 18);
                addShake(4);
                return;
            }
            state.invuln = 0.3;
        }

        state.health -= val;
        state.combo = 0;
        state.hadDamage = true;
        addShake(7);
        playSound('hit');

        if (state.health <= 0) {
            state.health = 0;
            endGame();
        }
    }

    /* ==========================================================================
       POWER-UPY
       ========================================================================== */
    function pickPowerupType() {
        const weights = {
            cooling: state.heat > state.maxHeat * 0.6 || state.isOverheated ? 5 : 3,
            shield: 2,
            triple: 2,
            repair: state.health < state.maxHealth * 0.4 ? 5 : 2
        };
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let roll = Math.random() * total;
        for (const [type, w] of Object.entries(weights)) {
            roll -= w;
            if (roll <= 0) return type;
        }
        return 'cooling';
    }

    function maybeDrop(x, y, chance) {
        if (Math.random() < chance) state.powerups.push(new PowerUp(pickPowerupType(), x, y));
    }

    function applyPowerup(type) {
        const def = POWERUPS[type];
        const p = state.player;

        if (type === 'cooling') {
            state.heat = 0;
            state.isOverheated = false;
            state.overheatTimer = 0;
        } else if (type === 'shield') {
            state.shield = SHIELD_DURATION;
        } else if (type === 'triple') {
            state.triple = TRIPLE_DURATION;
        } else if (type === 'repair') {
            state.health = Math.min(state.maxHealth, state.health + 25);
        }

        state.run.powerups++;
        lifetime.powerups++;
        if (lifetime.powerups >= 25) unlock('collector');

        playSound('powerup');
        burst(p.x + p.width / 2, p.y, def.color, 14, 140);
        floatText(p.x + p.width / 2, p.y - 10, def.label, def.color);
    }

    /* ==========================================================================
       ZABIJANIE WROGÓW
       ========================================================================== */
    function killEnemy(e) {
        e.toRemove = true;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;

        state.run.kills++;
        lifetime.kills++;
        state.combo++;
        state.comboTimer = COMBO_WINDOW;
        state.run.maxCombo = Math.max(state.run.maxCombo, state.combo);

        if (e.isBoss) {
            const pts = addScore(300 + 60 * state.wave, false);
            burst(cx, cy, '#ff9a3c', 70, 320);
            addShake(14);
            floatText(cx, cy, '+' + pts, '#ffd24d');
            state.enemyBullets.length = 0;
            state.powerups.push(new PowerUp(pickPowerupType(), cx - 30, cy));
            state.powerups.push(new PowerUp(pickPowerupType(), cx + 30, cy));
            state.run.bosses++;
            lifetime.bossKills++;
            unlock('boss_slayer');
            if (e.style && !lifetime.bossStyles.includes(e.style.key)) lifetime.bossStyles.push(e.style.key);
            if (BOSS_STYLES.every((b) => lifetime.bossStyles.includes(b.key))) unlock('boss_all');
            if (!state.hadDamage) unlock('perfect_boss');
        } else {
            const pts = addScore(e.def.score);
            burst(cx, cy, e.def.color, 16);
            addShake(2.5);
            if (pts >= 20 || comboMultiplier() > 1) floatText(cx, e.y, '+' + pts, '#ffd24d');
            const bonus = e.maxHp > 1 ? 0.12 : 0;
            maybeDrop(cx, cy, state.diff.dropChance + bonus);
        }

        playSound('explosion');

        if (lifetime.kills >= 1) unlock('first_blood');
        if (lifetime.kills >= 100) unlock('centurion');
        if (state.combo >= 20) unlock('combo_master');
    }

    function hitEnemy(e, b) {
        b.toRemove = true;
        e.hp -= 1;
        e.flash = 0.08;
        burst(b.x, b.y, '#ffe14d', 3, 120);
        if (e.hp <= 0) killEnemy(e);
    }

    /* ==========================================================================
       FALE
       ========================================================================== */
    function pickEnemyType(wave) {
        const pool = Object.entries(ENEMY_TYPES).filter(([k, t]) => k !== 'boss' && t.minWave <= wave);
        const total = pool.reduce((s, [, t]) => s + t.weight, 0);
        let roll = Math.random() * total;
        for (const [k, t] of pool) {
            roll -= t.weight;
            if (roll <= 0) return k;
        }
        return 'normal';
    }

    function startWave(n) {
        state.wave = n;
        state.hadOverheat = state.isOverheated;
        state.hadDamage = false;
        state.spawnTimer = 0;
        state.waveState = 'intro';
        state.waveTimer = 2.2;

        const isBoss = n % 5 === 0;
        state.spawnQueue = [];
        if (isBoss) {
            const bossNumber = Math.round(n / 5);
            state.bossTier = bossNumber - 1;
            let idx;
            if (bossNumber <= BOSS_STYLES.length) {
                idx = bossNumber - 1;                       // pierwsze trzy: stała kolejność
            } else {
                do { idx = Math.floor(Math.random() * BOSS_STYLES.length); } while (idx === state.lastBossIdx);
            }
            state.lastBossIdx = idx;
            state.bossStyle = BOSS_STYLES[idx];
            const minions = Math.min(8, 3 + Math.floor(n / 2));
            for (let i = 0; i < minions; i++) state.spawnQueue.push(pickEnemyType(n));
            state.spawnQueue.unshift('boss');
        } else {
            const count = Math.min(40, Math.round((6 + 2.5 * (n - 1)) * state.diff.enemyCount));
            for (let i = 0; i < count; i++) state.spawnQueue.push(pickEnemyType(n));
        }

        state.banner = {
            title: isBoss ? 'Fala ' + n + ' - BOSS' : 'Fala ' + n,
            sub: isBoss ? state.bossStyle.name + ' (poziom ' + (state.bossTier + 1) + ')' : '',
            time: 2.2,
            max: 2.2
        };

        lifetime.bestWave = Math.max(lifetime.bestWave, n);
        if (n >= 10) unlock('veteran');
        if (n >= 10 && state.diff === DIFFICULTIES.hard) unlock('hard_veteran');
        if (n > 1) playSound('wave');
    }

    function spawnEnemy(typeKey) {
        if (typeKey === 'boss') {
            const boss = new Enemy('boss', V_WIDTH / 2 - state.bossStyle.width / 2, -state.bossStyle.height);
            state.enemies.push(boss);
            return;
        }
        const t = ENEMY_TYPES[typeKey];
        state.enemies.push(new Enemy(typeKey, rand(0, V_WIDTH - t.w), -t.h));
    }

    function completeWave() {
        if (state.health > 0 && state.health < state.maxHealth * 0.1) unlock('close_call');
        const bonus = addScore(50 * state.wave, false);
        state.health = Math.min(state.maxHealth, state.health + 8);
        if (!state.hadOverheat) unlock('cool_head');
        if (!state.hadDamage) unlock('untouchable');

        state.waveState = 'break';
        state.waveTimer = 2.4;
        state.banner = { title: 'Fala ' + state.wave + ' ukończona', sub: '+' + bonus + ' pkt', time: 2.4, max: 2.4 };
    }

    function updateWaves(dt) {
        switch (state.waveState) {
            case 'intro':
                state.waveTimer -= dt;
                if (state.waveTimer <= 0) state.waveState = 'spawn';
                break;
            case 'spawn': {
                state.spawnTimer += dt;
                const interval = Math.max(0.35, (state.diff.spawnBase - 45 * (state.wave - 1)) / 1000);
                while (state.spawnQueue.length && (state.spawnQueue[0] === 'boss' || state.spawnTimer >= interval)) {
                    const next = state.spawnQueue.shift();
                    if (next !== 'boss') state.spawnTimer -= interval;
                    spawnEnemy(next);
                }
                if (!state.spawnQueue.length) state.waveState = 'clear';
                break;
            }
            case 'clear':
                if (state.enemies.length === 0) completeWave();
                break;
            case 'break':
                state.waveTimer -= dt;
                if (state.waveTimer <= 0) startWave(state.wave + 1);
                break;
            default:
        }
    }

    /* ==========================================================================
       STRZELANIE
       ========================================================================== */
    function shoot() {
        if (!state.player || state.isOverheated) return;
        const p = state.player;
        const cx = p.x + p.width / 2 - 2;
        const speed = 620;

        if (state.triple > 0) {
            [-140, 0, 140].forEach((vx) => state.bullets.push(new Projectile(cx, p.y, vx, -speed, '#ffe14d')));
        } else {
            state.bullets.push(new Projectile(cx, p.y, 0, -speed, '#ffe14d'));
        }

        playSound('playerShoot');
        state.lastShot = 0;
        state.heat += state.diff.heatPerShot * state.ship.heatMul * (state.triple > 0 ? 1.5 : 1);

        if (state.heat >= state.maxHeat) {
            state.heat = state.maxHeat;
            state.isOverheated = true;
            state.hadOverheat = true;
            state.overheatTimer = state.diff.overheatPenalty;
            playSound('overheat');
        }
    }

    /* ==========================================================================
       TŁO: gwiazdy w 3 warstwach (paralaksa)
       ========================================================================== */
    function makeStars() {
        state.stars = [];
        [[30, 1, 0.4, 15], [22, 1.6, 0.7, 35], [12, 2.4, 1, 70]].forEach(([count, size, alpha, speed]) => {
            for (let i = 0; i < count; i++) {
                state.stars.push({
                    x: rand(0, V_WIDTH), y: rand(0, V_HEIGHT), size, alpha, speed: speed * rand(0.8, 1.2)
                });
            }
        });
    }

    function updateStars(dt) {
        state.stars.forEach((s) => {
            s.y += s.speed * dt;
            if (s.y > V_HEIGHT) {
                s.y = 0;
                s.x = Math.random() * V_WIDTH;
            }
        });
    }

    /* ==========================================================================
       AKTUALIZACJA STANU (bez rysowania)
       ========================================================================== */
    function update(dt) {
        state.time += dt;
        state.invuln = Math.max(0, state.invuln - dt);
        state.shield = Math.max(0, state.shield - dt);
        state.triple = Math.max(0, state.triple - dt);
        state.shake = Math.max(0, state.shake - dt * 30);

        if (state.banner) {
            state.banner.time -= dt;
            if (state.banner.time <= 0) state.banner = null;
        }
        if (state.combo > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) state.combo = 0;
        }

        // Temperatura broni
        if (state.isOverheated) {
            state.overheatTimer -= dt * 1000;
            if (state.overheatTimer <= 0) {
                state.isOverheated = false;
                state.heat = 0;
            }
        } else {
            state.heat = Math.max(0, state.heat - state.diff.coolDownRate * dt);
        }

        updateStars(dt);
        state.player.update(dt);

        state.lastShot += dt * 1000;
        if ((state.keys[' '] || state.mouseDown) && state.lastShot >= state.ship.cooldown) shoot();

        updateWaves(dt);

        // Pociski gracza
        state.bullets.forEach((b) => {
            if (b.toRemove) return;
            b.update(dt);
            for (const e of state.enemies) {
                if (e.toRemove || b.toRemove) continue;
                if (detectCollision(b, e)) hitEnemy(e, b);
            }
        });

        // Wrogowie
        for (const e of state.enemies) {
            if (state.gameOver) break;
            if (e.toRemove) continue;
            e.update(dt);

            if (detectCollision(e, state.player)) {
                if (e.isBoss) {
                    takeDamage(25 * state.diff.enemyDmg);
                } else {
                    e.toRemove = true;
                    burst(e.x + e.width / 2, e.y + e.height / 2, e.def.color, 12);
                    takeDamage(15 * state.diff.enemyDmg);
                }
            }
            if (!state.gameOver && !e.isBoss && e.y > V_HEIGHT) {
                e.toRemove = true;
                takeDamage(5 * state.diff.enemyDmg, true);
            }
        }

        // Pociski wrogów
        for (const b of state.enemyBullets) {
            if (state.gameOver) break;
            b.update(dt);
            if (detectCollision(b, state.player)) {
                b.toRemove = true;
                takeDamage(10 * state.diff.enemyDmg);
            }
        }

        // Power-upy
        for (const pu of state.powerups) {
            pu.update(dt);
            if (!pu.toRemove && detectCollision(pu, state.player)) {
                pu.toRemove = true;
                applyPowerup(pu.type);
            }
        }

        // Cząsteczki i teksty
        state.particles.forEach((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= dt;
        });
        state.texts.forEach((t) => {
            t.y -= 40 * dt;
            t.life -= dt;
        });

        // Sprzątanie
        const inside = (o) => o.y > -40 && o.y < V_HEIGHT + 40 && o.x > -40 && o.x < V_WIDTH + 40;
        state.bullets = state.bullets.filter((b) => !b.toRemove && inside(b));
        state.enemies = state.enemies.filter((e) => !e.toRemove);
        state.enemyBullets = state.enemyBullets.filter((b) => !b.toRemove && inside(b));
        state.powerups = state.powerups.filter((p) => !p.toRemove && p.y < V_HEIGHT + 40);
        state.particles = state.particles.filter((p) => p.life > 0);
        state.texts = state.texts.filter((t) => t.life > 0);
    }

    /* ==========================================================================
       RYSOWANIE
       ========================================================================== */
    function drawHudOverlay() {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Numer fali i combo
        if (state.wave > 0) {
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText('Fala ' + state.wave, V_WIDTH / 2, 56);
        }
        if (state.combo >= 2) {
            const mult = comboMultiplier();
            ctx.font = 'bold ' + (16 + mult * 2) + 'px system-ui, sans-serif';
            ctx.fillStyle = mult >= 4 ? '#ff6b35' : '#ffd24d';
            ctx.fillText('COMBO x' + mult + ' (' + state.combo + ')', V_WIDTH / 2, 80);
        }

        // Pasek życia bossa z nazwą i znacznikami faz
        const boss = state.enemies.find((e) => e.isBoss);
        if (boss) {
            const bw = 360;
            const bx = V_WIDTH / 2 - bw / 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx, 98, bw, 10);
            ctx.fillStyle = boss.phase >= 2 ? '#ff3b3b' : boss.style.color;
            ctx.fillRect(bx, 98, bw * Math.max(0, boss.hp / boss.maxHp), 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, 98, bw, 10);
            ctx.beginPath();
            ctx.moveTo(bx + bw * 0.5, 98);
            ctx.lineTo(bx + bw * 0.5, 108);
            if (state.bossTier >= 1) {
                ctx.moveTo(bx + bw * 0.2, 98);
                ctx.lineTo(bx + bw * 0.2, 108);
            }
            ctx.stroke();
            ctx.textAlign = 'right';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillStyle = boss.style.color;
            ctx.fillText(boss.style.name.toUpperCase(), bx - 8, 103);
        }

        // Aktywne power-upy
        ctx.textAlign = 'left';
        let row = 0;
        [['shield', state.shield, SHIELD_DURATION], ['triple', state.triple, TRIPLE_DURATION]].forEach(([type, left, total]) => {
            if (left <= 0) return;
            const y = V_HEIGHT - 20 - row * 26;
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(POWERUPS[type].icon, 14, y);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(38, y - 4, 70, 8);
            ctx.fillStyle = POWERUPS[type].color;
            ctx.fillRect(38, y - 4, 70 * (left / total), 8);
            row++;
        });

        // Baner fali
        if (state.banner) {
            const b = state.banner;
            const alpha = clamp(Math.min(b.time / 0.4, (b.max - b.time) / 0.3), 0, 1);
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.font = 'bold 40px system-ui, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 5;
            ctx.strokeText(b.title, V_WIDTH / 2, V_HEIGHT * 0.38);
            ctx.fillText(b.title, V_WIDTH / 2, V_HEIGHT * 0.38);
            if (b.sub) {
                ctx.font = '20px system-ui, sans-serif';
                ctx.strokeText(b.sub, V_WIDTH / 2, V_HEIGHT * 0.38 + 38);
                ctx.fillText(b.sub, V_WIDTH / 2, V_HEIGHT * 0.38 + 38);
            }
            ctx.globalAlpha = 1;
        }

        // Pauza
        if (state.paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 56px system-ui, sans-serif';
            ctx.fillText('PAUZA', V_WIDTH / 2, V_HEIGHT / 2 - 10);
            ctx.font = '20px system-ui, sans-serif';
            ctx.fillText('Naciśnij P lub przycisk, aby wznowić', V_WIDTH / 2, V_HEIGHT / 2 + 36);
        }
        ctx.restore();
    }

    function render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(scale, scale);
        if (settings.shake && state.shake > 0.5) {
            ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
        }

        // Gwiazdy
        ctx.fillStyle = '#fff';
        state.stars.forEach((s) => {
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1;

        state.powerups.forEach((p) => p.draw());
        state.enemies.forEach((e) => e.draw());
        state.bullets.forEach((b) => b.draw());
        state.enemyBullets.forEach((b) => b.draw());
        if (state.player) state.player.draw();

        state.particles.forEach((p) => {
            ctx.globalAlpha = Math.max(0, p.life / p.max);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1;

        state.texts.forEach((t) => {
            ctx.globalAlpha = Math.max(0, t.life / t.max);
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.save();
        ctx.scale(scale, scale);
        drawHudOverlay();
        ctx.restore();
    }

    function updateHUD() {
        if (scoreEl) scoreEl.textContent = 'Wynik: ' + state.score;

        if (healthFill) {
            const pct = Math.max(0, (state.health / state.maxHealth) * 100);
            healthFill.style.height = pct + '%';
            healthFill.style.background = pct > 50 ? 'limegreen' : pct > 20 ? 'orange' : 'red';
        }

        const heatPercent = Math.min(100, (state.heat / state.maxHeat) * 100);
        if (heatFillBar) {
            heatFillBar.style.height = heatPercent + '%';
            if (state.isOverheated) {
                heatFillBar.style.background = 'red';
            } else {
                const r = Math.floor(255 * (heatPercent / 100));
                const g = Math.floor(255 * (1 - heatPercent / 100));
                heatFillBar.style.background = 'rgb(' + r + ', ' + g + ', 0)';
            }
        }
    }

    /* ==========================================================================
       PĘTLE GRY
       ========================================================================== */
    function stopLoop() {
        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }
    }

    function gameLoop(now) {
        if (!state.running || state.paused || state.gameOver) return;

        const dt = (now - state.lastTime) / 1000;
        state.lastTime = now;

        if (dt > 0 && dt <= 0.1) {
            update(dt);
            if (state.gameOver) return;
            render();
            updateHUD();
        }
        state.rafId = requestAnimationFrame(gameLoop);
    }

    // Animowane tło za menu startowym
    let idleLast = 0;
    function idleLoop(now) {
        if (state.running) return;
        const dt = Math.min(0.1, Math.max(0, (now - idleLast) / 1000));
        idleLast = now;
        updateStars(dt);
        render();
        state.rafId = requestAnimationFrame(idleLoop);
    }

    function startIdle() {
        stopLoop();
        idleLast = performance.now();
        state.rafId = requestAnimationFrame(idleLoop);
    }

    function updatePauseBtn() {
        if (!pauseBtn) return;
        pauseBtn.disabled = !state.running || state.gameOver;
        pauseBtn.textContent = state.paused ? '▶' : '⏸';
        const label = state.paused ? 'Wznów grę' : 'Pauza';
        pauseBtn.title = label;
        pauseBtn.setAttribute('aria-label', label);
    }

    function setPaused(paused) {
        if (!state.running || state.gameOver || paused === state.paused) return;
        state.paused = paused;

        if (paused) {
            stopLoop();
            sounds.bg.pause();
            render();
        } else {
            state.lastTime = performance.now();
            sounds.bg.play().catch(() => {});
            state.rafId = requestAnimationFrame(gameLoop);
        }
        updatePauseBtn();
    }

    /* ==========================================================================
       START / KONIEC GRY
       ========================================================================== */
    function initGame() {
        stopLoop();

        state.diff = DIFFICULTIES[settings.difficulty];
        state.ship = SHIPS[settings.ship];

        resizeCanvas();

        state.player = new Player(state.ship);
        state.bullets = [];
        state.enemies = [];
        state.enemyBullets = [];
        state.powerups = [];
        state.particles = [];
        state.texts = [];
        makeStars();

        state.score = 0;
        state.maxHealth = state.ship.health;
        state.health = state.maxHealth;
        state.maxHeat = state.diff.maxHeat;
        state.heat = 0;
        state.isOverheated = false;
        state.overheatTimer = 0;
        state.lastShot = state.ship.cooldown;
        state.shield = 0;
        state.triple = 0;
        state.invuln = 0;
        state.shake = 0;
        state.combo = 0;
        state.comboTimer = 0;
        state.banner = null;
        state.time = 0;
        state.mouseDown = false;
        state.run = { kills: 0, maxCombo: 0, powerups: 0, bosses: 0, newAchievements: [], newRecord: false };

        state.lastBossIdx = -1;
        state.bossStyle = null;
        state.bossTier = 0;

        state.running = true;
        state.paused = false;
        state.gameOver = false;
        startWave(1);

        updateHUD();
        updatePauseBtn();
        if (menu) menu.style.display = 'none';
        if (gameOverMenu) gameOverMenu.classList.add('hidden');

        sounds.bg.currentTime = 0;
        sounds.bg.play().catch(() => console.log('Interakcja wymagana do dźwięku'));

        state.lastTime = performance.now();
        state.rafId = requestAnimationFrame(gameLoop);
    }

    function summaryRow(label, value) {
        const row = document.createElement('div');
        row.className = 'summary-row';
        const l = document.createElement('span');
        l.textContent = label;
        const v = document.createElement('strong');
        v.textContent = value;
        row.appendChild(l);
        row.appendChild(v);
        return row;
    }

    function endGame() {
        state.gameOver = true;
        state.running = false;
        stopLoop();

        lifetime.games++;
        lifetime.bestCombo = Math.max(lifetime.bestCombo, state.run.maxCombo);
        saveLifetime();

        if (state.score > shooterHighScore) {
            shooterHighScore = state.score;
            state.run.newRecord = true;
            store.set(KEYS.highscore, shooterHighScore);
        }

        render();
        updateHUD();
        updatePauseBtn();

        if (finalScoreEl) finalScoreEl.textContent = state.score;
        if (finalHighScoreEl) {
            finalHighScoreEl.textContent = shooterHighScore + (state.run.newRecord ? ' (nowy rekord!)' : '');
        }

        if (summaryEl) {
            summaryEl.innerHTML = '';
            summaryEl.appendChild(summaryRow('Poziom trudności', state.diff.label));
            summaryEl.appendChild(summaryRow('Statek', state.ship.name));
            summaryEl.appendChild(summaryRow('Osiągnięta fala', String(state.wave)));
            summaryEl.appendChild(summaryRow('Zestrzelone wrogie statki', String(state.run.kills)));
            summaryEl.appendChild(summaryRow('Najdłuższe combo', String(state.run.maxCombo)));
            summaryEl.appendChild(summaryRow('Zebrane power-upy', String(state.run.powerups)));
            summaryEl.appendChild(summaryRow('Czas gry', formatTime(state.time)));
            if (state.run.newAchievements.length) {
                summaryEl.appendChild(summaryRow('Nowe osiągnięcia', state.run.newAchievements.join(', ')));
            }
        }

        if (gameOverMenu) gameOverMenu.classList.remove('hidden');
        sounds.bg.pause();
        playSound('gameover');
    }

    function backToMenu() {
        if (gameOverMenu) gameOverMenu.classList.add('hidden');
        if (menu) menu.style.display = 'flex';
        state.player = null;
        state.enemies = [];
        state.bullets = [];
        state.enemyBullets = [];
        state.powerups = [];
        state.particles = [];
        state.texts = [];
        state.banner = null;
        state.wave = 0;
        state.combo = 0;
        state.shield = 0;
        state.triple = 0;
        makeStars();
        startIdle();
    }

    /* ==========================================================================
       USTAWIENIA W INTERFEJSIE
       ========================================================================== */
    function bindChoiceGroup(container, key) {
        if (!container) return;
        const buttons = Array.from(container.querySelectorAll('.choice'));

        const select = (value) => {
            buttons.forEach((b) => {
                const on = b.dataset.value === value;
                b.classList.toggle('active', on);
                b.setAttribute('aria-checked', String(on));
            });
        };

        buttons.forEach((b) => {
            b.addEventListener('click', () => {
                settings[key] = b.dataset.value;
                saveSettings();
                select(settings[key]);
            });
        });
        select(settings[key]);
    }

    function bindOptions() {
        bindChoiceGroup(difficultyChoices, 'difficulty');
        bindChoiceGroup(shipChoices, 'ship');

        if (optShake) {
            optShake.checked = Boolean(settings.shake);
            optShake.addEventListener('change', () => {
                settings.shake = optShake.checked;
                saveSettings();
            });
        }
        if (optMouse) {
            optMouse.checked = Boolean(settings.mouse);
            optMouse.addEventListener('change', () => {
                settings.mouse = optMouse.checked;
                saveSettings();
            });
        }
        if (optTouchSens) {
            optTouchSens.value = settings.touchSens;
            optTouchSens.addEventListener('input', () => {
                settings.touchSens = clamp(parseFloat(optTouchSens.value) || 1, 0.5, 1.5);
                saveSettings();
            });
        }
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', () => {
                if (state.running && !state.paused && !state.gameOver) setPaused(true);
                if (!window.confirm('Na pewno wyzerować rekord, statystyki i osiągnięcia w Shooterze?')) return;
                shooterHighScore = 0;
                unlocked.clear();
                Object.assign(lifetime, { kills: 0, games: 0, bossKills: 0, powerups: 0, bestWave: 0, bestCombo: 0, bossStyles: [] });
                store.remove(KEYS.highscore);
                store.remove(KEYS.achievements);
                store.remove(KEYS.stats);
                if (finalHighScoreEl) finalHighScoreEl.textContent = '0';
                renderAchievements();
            });
        }
    }

    /* ==========================================================================
       ZDARZENIA
       ========================================================================== */
    const isTyping = (target) => Boolean(target && target.closest && target.closest('input, select, textarea'));

    window.addEventListener('load', () => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        makeStars();
        renderAchievements();
        bindOptions();
        updatePauseBtn();
        startIdle();

        if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateFullscreenUI);
        document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && shooterStage && shooterStage.classList.contains('is-fullscreen')) {
                shooterStage.classList.remove('is-fullscreen');
                updateFullscreenUI();
            }
            // Nie przechwytuj klawiszy w polach formularza (suwaki używają strzałek)
            if (isTyping(e.target)) return;

            if ((e.key === 'p' || e.key === 'P') && state.running && !state.gameOver) {
                setPaused(!state.paused);
                return;
            }

            state.keys[e.key] = true;
            const playing = state.player && state.running && !state.gameOver;
            if (playing && [' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            state.keys[e.key] = false;
        });

        // Po utracie fokusu: zwolnij klawisze i zapauzuj trwającą grę
        window.addEventListener('blur', () => {
            state.keys = {};
            state.mouseDown = false;
            if (state.running && !state.gameOver) setPaused(true);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.running && !state.gameOver) setPaused(true);
        });
        window.addEventListener('pagehide', saveLifetime);

        if (volumeControl) {
            volumeControl.addEventListener('input', () => {
                sounds.bg.volume = volumeControl.value;
            });
        }
        if (volumeControl1) {
            volumeControl1.addEventListener('input', () => {
                const v = volumeControl1.value;
                Object.keys(sounds).forEach((k) => {
                    if (k !== 'bg') sounds[k].volume = v;
                });
            });
        }

        if (startBtn) startBtn.addEventListener('click', initGame);
        if (restartBtn) restartBtn.addEventListener('click', initGame);
        if (menuBtn) menuBtn.addEventListener('click', backToMenu);
        if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!state.paused));

        // Sterowanie myszką (opcjonalne): ruch statku i strzał klikaniem
        canvas.addEventListener('mousemove', (e) => {
            if (!settings.mouse || !state.running || state.paused || state.gameOver || !state.player) return;
            const r = canvas.getBoundingClientRect();
            const vx = ((e.clientX - r.left) / r.width) * V_WIDTH;
            state.player.x = clamp(vx - state.player.width / 2, 0, V_WIDTH - state.player.width);
        });
        canvas.addEventListener('mousedown', (e) => {
            if (settings.mouse && e.button === 0 && state.running && !state.paused) {
                state.mouseDown = true;
                e.preventDefault();
            }
        });
        window.addEventListener('mouseup', () => {
            state.mouseDown = false;
        });

        // Sterowanie dotykowe: przycisk strzału
        if (mobileShoot) {
            const startShoot = (e) => {
                e.preventDefault();
                state.keys[' '] = true;
            };
            const stopShoot = (e) => {
                e.preventDefault();
                state.keys[' '] = false;
            };

            mobileShoot.addEventListener('touchstart', startShoot, { passive: false });
            mobileShoot.addEventListener('touchend', stopShoot, { passive: false });
            mobileShoot.addEventListener('touchcancel', stopShoot, { passive: false });
            mobileShoot.addEventListener('mousedown', startShoot);
            mobileShoot.addEventListener('mouseup', stopShoot);
        }

        // Sterowanie dotykowe: suwak ruchu z regulowaną czułością
        const handleSlider = (clientX) => {
            if (!state.player || state.gameOver || state.paused || !sliderArea) return;
            const rect = sliderArea.getBoundingClientRect();
            if (rect.width <= 0) return;
            let val = (clientX - rect.left) / rect.width;
            val = clamp(val, 0, 1);
            val = clamp(0.5 + (val - 0.5) * settings.touchSens, 0, 1);

            if (sliderHandle) sliderHandle.style.left = (val * 100) + '%';
            state.player.x = val * (V_WIDTH - state.player.width);
        };

        if (sliderArea) {
            sliderArea.addEventListener('touchstart', (e) => {
                if (e.touches[0]) handleSlider(e.touches[0].clientX);
            }, { passive: false });
            sliderArea.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (e.touches[0]) handleSlider(e.touches[0].clientX);
            }, { passive: false });

            let isDragging = false;
            sliderArea.addEventListener('mousedown', (e) => {
                isDragging = true;
                handleSlider(e.clientX);
            });
            window.addEventListener('mousemove', (e) => {
                if (isDragging) handleSlider(e.clientX);
            });
            window.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
    });
})();