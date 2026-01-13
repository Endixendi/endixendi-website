/**
 * Gra Shooter - Wersja zintegrowana ze sliderem i HUD
 */

const GAME_CONFIG = {
    playerShootCooldown: 150, 
    initialEnemySpawnRate: 1500,
    initialHealth: 100,
    maxHeat: 100,           
    heatPerShot: 15,        
    coolDownRate: 40,       
    overheatPenalty: 5000   
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Pobieranie elementów HTML (HUD)
const scoreEl = document.getElementById("score");
const healthFill = document.getElementById("healthFill");
const heatFillBar = document.getElementById("heatFillBar"); 
const heatLabel = document.getElementById("heatLabel");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const gameOverMenu = document.getElementById("gameOverMenu");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// Kontrola głośności
const volumeControl = document.getElementById("volumeControl");
const volumeControl1 = document.getElementById("volumeControl1");

// Elementy sterowania mobilnego (Slider i Przycisk)
const mobileShoot = document.getElementById("mobileShootBtn");
const sliderArea = document.getElementById("touchSliderArea");
const sliderHandle = document.getElementById("sliderHandle");

const sounds = {
    bg: new Audio("assets/sounds/shooter/shooter-bg.webm"),
    gameover: new Audio("assets/sounds/global/gameover-sad.webm"),
    playerShoot: new Audio("assets/sounds/global/laser.webm"),
    enemyShoot: new Audio("assets/sounds/global/laser.webm"),
    explosion: new Audio("assets/sounds/global/explosion.webm"),
    hit: new Audio("assets/sounds/global/hit.webm"),
    overheat: new Audio("assets/sounds/global/point.webm") 
};

const gameState = {
    player: null,
    bullets: [],
    enemies: [],
    enemyBullets: [],
    score: 0,
    health: GAME_CONFIG.initialHealth,
    heat: 0,
    isOverheated: false,
    overheatTimer: 0,
    gameOver: false,
    stars: [],
    keys: {}, 
    lastTime: 0,
    lastPlayerShot: 0,
    enemySpawnTimer: 0,
    currentEnemySpeed: 0,
    currentSpawnRate: 0
};

sounds.bg.loop = true;
// Domyślna głośność zgodna z suwakami
sounds.bg.volume = 0.3;
Object.keys(sounds).forEach(k => { if(k !== 'bg') sounds[k].volume = 0.3; });

function resizeCanvas() {
    const container = document.querySelector(".shooter-container");
    if(!container) return;
    const maxWidth = Math.min(800, container.offsetWidth);
    canvas.width = maxWidth;
    canvas.height = Math.floor(maxWidth * 0.75);
    if(gameState.player) {
        gameState.player.y = canvas.height - gameState.player.height - 10;
    }
}

class Player {
    constructor() {
        this.width = canvas.width * 0.06;
        this.height = this.width;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = canvas.width * 0.8; 
    }
    draw() { 
        ctx.fillStyle = gameState.isOverheated ? "#555" : "orange"; 
        ctx.fillRect(this.x, this.y, this.width, this.height); 
    }
    update(dt) { 
        if(gameState.keys["ArrowLeft"]) this.x = Math.max(0, this.x - this.speed * dt);
        if(gameState.keys["ArrowRight"]) this.x = Math.min(canvas.width - this.width, this.x + this.speed * dt);
    }
}

class Bullet {
    constructor(x, y, speed, color = "yellow") { 
        this.x = x; this.y = y;
        this.width = 4; this.height = 12;
        this.speed = speed; this.color = color; this.toRemove = false;
    }
    update(dt){ this.y -= this.speed * dt; this.draw(); }
    draw(){ ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Enemy {
    constructor(x, y){ 
        this.x = x; this.y = y;
        this.width = canvas.width * 0.07; this.height = this.width;
        this.speed = gameState.currentEnemySpeed; 
        this.lastShot = 0;
        this.shootInterval = Math.random() * 2 + 1;
        this.toRemove = false;
    }
    update(dt){
        this.y += this.speed * dt;
        this.draw();
        this.lastShot += dt;
        if(this.lastShot >= this.shootInterval){
            gameState.enemyBullets.push(new Bullet(this.x + this.width/2 - 2, this.y + this.height, -350, "red"));
            this.lastShot = 0;
        }
    }
    draw(){ ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Star {
    constructor(){ 
        this.x = Math.random()*canvas.width; this.y = Math.random()*canvas.height;
        this.size = Math.random()*2; this.speed = Math.random()*40+10;
    }
    update(dt){ this.y += this.speed * dt; if(this.y > canvas.height) this.y = 0; ctx.fillStyle = "white"; ctx.fillRect(this.x, this.y, this.size, this.size); }
}

function initGame(){
    gameState.player = new Player();
    gameState.bullets = []; gameState.enemies = []; gameState.enemyBullets = []; 
    gameState.score = 0; 
    gameState.health = GAME_CONFIG.initialHealth; 
    gameState.gameOver = false;
    gameState.heat = 0;
    gameState.isOverheated = false;
    gameState.enemySpawnTimer = 0;
    gameState.stars = Array.from({length: 60}, () => new Star());
    gameState.currentEnemySpeed = canvas.width * 0.15;
    gameState.currentSpawnRate = GAME_CONFIG.initialEnemySpawnRate;
    gameState.lastTime = performance.now();
    
    updateHUD();
    menu.style.display = "none";
    gameOverMenu.classList.add("hidden");
    sounds.bg.currentTime = 0; 
    sounds.bg.play().catch(() => console.log("Interakcja wymagana do dźwięku"));
}

function updateHUD(){ 
    scoreEl.textContent = "Wynik: " + gameState.score; 
    healthFill.style.height = gameState.health + "%"; 
    healthFill.style.background = gameState.health > 50 ? "limegreen" : gameState.health > 20 ? "orange" : "red"; 

    const heatPercent = Math.min(100, (gameState.heat / GAME_CONFIG.maxHeat) * 100);
    if (heatFillBar) {
        heatFillBar.style.width = heatPercent + "%";
        if (gameState.isOverheated) {
            heatLabel.textContent = "PRZEGRZANIE! (Czekaj)";
            heatFillBar.style.background = "red"; 
        } else {
            heatLabel.textContent = "TEMPERATURA DZIAŁA";
            const r = Math.floor(255 * (heatPercent / 100));
            const g = Math.floor(255 * (1 - heatPercent / 100));
            heatFillBar.style.background = `rgb(${r}, ${g}, 0)`;
        }
    }
}

function shoot() {
    if(!gameState.player || gameState.isOverheated) return;
    gameState.bullets.push(new Bullet(gameState.player.x + gameState.player.width/2 - 2, gameState.player.y, 600));
    sounds.playerShoot.currentTime = 0; sounds.playerShoot.play();
    gameState.lastPlayerShot = 0;
    gameState.heat += GAME_CONFIG.heatPerShot;
    if (gameState.heat >= GAME_CONFIG.maxHeat) {
        gameState.isOverheated = true;
        gameState.overheatTimer = GAME_CONFIG.overheatPenalty;
        sounds.overheat.play();
    }
}

function takeDamage(val){
    gameState.health -= val;
    sounds.hit.currentTime = 0; sounds.hit.play();
    if(gameState.health <= 0) endGame();
}

function endGame(){
    gameState.gameOver = true;
    finalScoreEl.textContent = gameState.score;
    gameOverMenu.classList.remove("hidden");
    sounds.bg.pause(); sounds.gameover.play();
}

function detectCollision(a, b){ 
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; 
}

function gameLoop(currentTime){
    if(gameState.gameOver) return;
    const dt = (currentTime - gameState.lastTime) / 1000;
    gameState.lastTime = currentTime;
    if (dt > 0.1) { requestAnimationFrame(gameLoop); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.isOverheated) {
        gameState.overheatTimer -= dt * 1000;
        if (gameState.overheatTimer <= 0) { gameState.isOverheated = false; gameState.heat = 0; }
    } else {
        gameState.heat = Math.max(0, gameState.heat - GAME_CONFIG.coolDownRate * dt);
    }

    gameState.stars.forEach(s => s.update(dt));
    gameState.player.update(dt); 
    gameState.player.draw();

    gameState.lastPlayerShot += dt * 1000;
    if(gameState.keys[" "] && gameState.lastPlayerShot >= GAME_CONFIG.playerShootCooldown) shoot();

    gameState.enemySpawnTimer += dt * 1000;
    if(gameState.enemySpawnTimer >= gameState.currentSpawnRate){
        gameState.enemies.push(new Enemy(Math.random()*(canvas.width - 40), -40));
        gameState.enemySpawnTimer = 0;
    }

    gameState.bullets.forEach(b => {
        b.update(dt);
        gameState.enemies.forEach(e => {
            if(detectCollision(b, e)){
                e.toRemove = true; b.toRemove = true;
                gameState.score += 10; sounds.explosion.currentTime = 0; sounds.explosion.play();
                if(gameState.score % 200 === 0) {
                    gameState.currentEnemySpeed += 15;
                    gameState.currentSpawnRate = Math.max(500, gameState.currentSpawnRate - 50);
                }
            }
        });
    });

    gameState.enemies.forEach(e => {
        e.update(dt);
        if(detectCollision(e, gameState.player)){ e.toRemove = true; takeDamage(15); }
        if(e.y > canvas.height) { e.toRemove = true; takeDamage(5); }
    });

    gameState.enemyBullets.forEach(b => {
        b.y -= b.speed * dt;
        ctx.fillStyle = "red"; ctx.fillRect(b.x, b.y, b.width, b.height);
        if(detectCollision(b, gameState.player)){ b.toRemove = true; takeDamage(10); }
    });

    gameState.bullets = gameState.bullets.filter(b => !b.toRemove && b.y > -20);
    gameState.enemies = gameState.enemies.filter(e => !e.toRemove && e.y < canvas.height + 20);
    gameState.enemyBullets = gameState.enemyBullets.filter(b => b.y < canvas.height + 20 && !b.toRemove);

    updateHUD();
    requestAnimationFrame(gameLoop);
}

// === OBSŁUGA ZDARZEŃ (START/LOGIKA) ===
window.addEventListener("load", () => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Klawiatura
    window.addEventListener("keydown", (e) => { 
        gameState.keys[e.key] = true; 
        if([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => gameState.keys[e.key] = false);

    // Dźwięk
    volumeControl.addEventListener("input", () => sounds.bg.volume = volumeControl.value);
    volumeControl1.addEventListener("input", () => {
        const v = volumeControl1.value;
        Object.keys(sounds).forEach(k => { if(k !== 'bg') sounds[k].volume = v; });
    });

    // Start
    startBtn.addEventListener("click", () => { initGame(); requestAnimationFrame(gameLoop); });
    restartBtn.addEventListener("click", () => { initGame(); requestAnimationFrame(gameLoop); });

    // --- STEROWANIE MOBILNE ---
    
    // Przycisk Strzału
    if (mobileShoot) {
        const startShoot = (e) => { e.preventDefault(); gameState.keys[" "] = true; };
        const stopShoot = (e) => { e.preventDefault(); gameState.keys[" "] = false; };
        
        mobileShoot.addEventListener("touchstart", startShoot, {passive: false});
        mobileShoot.addEventListener("touchend", stopShoot, {passive: false});
        mobileShoot.addEventListener("mousedown", startShoot);
        mobileShoot.addEventListener("mouseup", stopShoot);
    }

    // Slider Ruchu
    const handleSlider = (clientX) => {
        if (!gameState.player || gameState.gameOver) return;
        const rect = sliderArea.getBoundingClientRect();
        let val = (clientX - rect.left) / rect.width;
        val = Math.max(0, Math.min(1, val));
        
        sliderHandle.style.left = (val * 100) + "%";
        gameState.player.x = val * (canvas.width - gameState.player.width);
    };

    if (sliderArea) {
        sliderArea.addEventListener("touchstart", (e) => handleSlider(e.touches[0].clientX), {passive: false});
        sliderArea.addEventListener("touchmove", (e) => { e.preventDefault(); handleSlider(e.touches[0].clientX); }, {passive: false});
        
        let isDragging = false;
        sliderArea.addEventListener("mousedown", (e) => { isDragging = true; handleSlider(e.clientX); });
        window.addEventListener("mousemove", (e) => { if(isDragging) handleSlider(e.clientX); });
        window.addEventListener("mouseup", () => isDragging = false);
    }
});