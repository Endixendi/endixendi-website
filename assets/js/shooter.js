/**
 * Gra Shooter - Wersja Finalna
 * - Optymalizacja Delta Time
 * - Ostry HUD (HTML/CSS)
 * - System Przegrzewania Działa (5s kary)
 */

const GAME_CONFIG = {
  playerShootCooldown: 150, // Szybkostrzelność (ms)
  initialEnemySpawnRate: 1500,
  initialHealth: 100,
  // KONFIGURACJA PRZEGRZANIA
  maxHeat: 100,           
  heatPerShot: 15,        // Ile % dodaje jeden strzał
  coolDownRate: 40,       // Ile % spada na sekundę
  overheatPenalty: 5000   // 5 sekund kary
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Pobieranie elementów HTML (HUD)
const scoreEl = document.getElementById("score");
const healthFill = document.getElementById("healthFill");
// Elementy temperatury
const heatFillBar = document.getElementById("heatFillBar"); 
const heatLabel = document.getElementById("heatLabel");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const gameOverMenu = document.getElementById("gameOverMenu");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");
const volumeControl = document.getElementById("volumeControl");
const volumeControl1 = document.getElementById("volumeControl1");

const sounds = {
  bg: new Audio("assets/sounds/shooter/shooter-bg.webm"),
  gameover: new Audio("assets/sounds/global/gameover-sad.webm"),
  playerShoot: new Audio("assets/sounds/global/laser.webm"),
  enemyShoot: new Audio("assets/sounds/global/laser.webm"),
  explosion: new Audio("assets/sounds/global/explosion.webm"),
  hit: new Audio("assets/sounds/global/hit.webm"),
  overheat: new Audio("assets/sounds/global/point.webm") // Dźwięk przegrzania (opcjonalny)
};

const gameState = {
  player: null,
  bullets: [],
  enemies: [],
  enemyBullets: [],
  score: 0,
  health: GAME_CONFIG.initialHealth,
  // Zmienne temperatury
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
Object.values(sounds).forEach(s => s.volume = 0.3);

function resizeCanvas() {
  const container = document.querySelector(".shooter-container");
  if(!container) return;
  const maxWidth = Math.min(800, container.offsetWidth - 32);
  canvas.width = maxWidth;
  canvas.height = Math.floor(maxWidth * 0.75);
}

class Player {
  constructor() {
    this.width = canvas.width * 0.05;
    this.height = canvas.width * 0.05;
    this.x = canvas.width/2 - this.width/2;
    this.y = canvas.height - this.height - 10;
    this.speed = canvas.width * 0.7; 
  }
  draw() { 
    // Zmiana koloru gracza, gdy przegrzany
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
    this.width = canvas.width * 0.008; this.height = canvas.width * 0.016;
    this.speed = speed; this.color = color; this.toRemove = false;
  }
  update(dt){ this.y -= this.speed * dt; this.draw(); }
  draw(){ ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Enemy {
  constructor(x, y){ 
    this.x = x; this.y = y;
    this.width = canvas.width * 0.06; this.height = canvas.width * 0.06;
    this.speed = gameState.currentEnemySpeed; 
    this.lastShot = 0;
    this.shootInterval = Math.random() * 2 + 0.5;
    this.toRemove = false;
  }
  update(dt){
    this.y += this.speed * dt;
    this.draw();
    this.lastShot += dt;
    if(this.lastShot >= this.shootInterval){
      gameState.enemyBullets.push(new Bullet(this.x + this.width/2 - 2, this.y + this.height, -400, "red"));
      this.lastShot = 0;
      sounds.enemyShoot.currentTime = 0; sounds.enemyShoot.play();
    }
  }
  draw(){ ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Star {
  constructor(){ 
    this.x = Math.random()*canvas.width; this.y = Math.random()*canvas.height;
    this.size = Math.random()*2+1; this.speed = Math.random()*50+20;
  }
  update(dt){ this.y += this.speed * dt; if(this.y > canvas.height) this.y = 0; this.draw(); }
  draw(){ ctx.fillStyle = "white"; ctx.fillRect(this.x, this.y, this.size, this.size); }
}

function initGame(){
  gameState.player = new Player();
  gameState.bullets = []; gameState.enemies = []; gameState.enemyBullets = []; 
  gameState.score = 0; 
  gameState.health = GAME_CONFIG.initialHealth; 
  gameState.gameOver = false;
  
  // Reset temperatury
  gameState.heat = 0;
  gameState.isOverheated = false;
  
  gameState.enemySpawnTimer = 0;
  gameState.stars = Array.from({length: 80}, () => new Star());
  
  gameState.currentEnemySpeed = canvas.width * 0.15;
  gameState.currentSpawnRate = GAME_CONFIG.initialEnemySpawnRate;
  
  gameState.lastPlayerShot = 0;
  gameState.lastTime = performance.now();
  updateHUD();
  menu.style.display = "none";
  gameOverMenu.classList.add("hidden");
  sounds.bg.currentTime = 0; sounds.bg.play();
}

/**
 * Aktualizacja interfejsu (HTML) - zapewnia idealną ostrość
 */
function updateHUD(){ 
  // 1. Wynik
  scoreEl.textContent = "Wynik: " + gameState.score; 
  
  // 2. Zdrowie
  healthFill.style.height = gameState.health + "%"; 
  healthFill.style.background = gameState.health > 50 ? "limegreen" : gameState.health > 20 ? "orange" : "red"; 

  // 3. Pasek Temperatury (Logic + Visuals)
  const heatPercent = Math.min(100, (gameState.heat / GAME_CONFIG.maxHeat) * 100);
  
  if (heatFillBar) {
      heatFillBar.style.width = heatPercent + "%";
      
      if (gameState.isOverheated) {
          heatLabel.textContent = "PRZEGRZANIE! (Czekaj)";
          heatLabel.style.color = "#ff4d4d"; // Czerwony tekst
          heatFillBar.style.background = "red"; // Czerwony pasek
          heatFillBar.style.boxShadow = "0 0 10px red"; // Efekt poświaty
      } else {
          heatLabel.textContent = "TEMPERATURA DZIAŁA";
          heatLabel.style.color = "white";
          heatFillBar.style.boxShadow = "none";
          
          // Płynna zmiana koloru: Zielony -> Żółty -> Czerwony
          const r = Math.min(255, Math.floor(255 * (heatPercent / 100) * 2));
          const g = Math.min(255, Math.floor(255 * (1 - heatPercent / 100) * 2));
          heatFillBar.style.background = `rgb(${r}, ${g}, 0)`;
      }
  }
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

  // LOGIKA TEMPERATURY
  if (gameState.isOverheated) {
      // Jeśli przegrzany, odliczamy czas kary
      gameState.overheatTimer -= dt * 1000;
      if (gameState.overheatTimer <= 0) {
          gameState.isOverheated = false;
          gameState.heat = 0; // Po karze działo jest zimne
      }
  } else {
      // Jeśli nie przegrzany, działo stygnie
      gameState.heat = Math.max(0, gameState.heat - GAME_CONFIG.coolDownRate * dt);
  }

  gameState.stars.forEach(s => s.update(dt));
  gameState.player.update(dt); 
  gameState.player.draw();

  // STRZELANIE (Sprawdzamy: Klawisz + Cooldown + Czy nie przegrzane)
  gameState.lastPlayerShot += dt * 1000;
  if(gameState.keys[" "] && !gameState.isOverheated && gameState.lastPlayerShot >= GAME_CONFIG.playerShootCooldown) {
      shoot();
  }

  // Spawn wrogów
  gameState.enemySpawnTimer += dt * 1000;
  if(gameState.enemySpawnTimer >= gameState.currentSpawnRate){
    gameState.enemies.push(new Enemy(Math.random()*(canvas.width - 40), -40));
    gameState.enemySpawnTimer = 0;
  }

  // Logika pocisków i kolizji
  gameState.bullets.forEach((b) => {
    b.update(dt);
    gameState.enemies.forEach((e) => { 
      if(detectCollision(b, e)){ 
        e.toRemove = true; b.toRemove = true; 
        gameState.score += 10; 
        sounds.explosion.currentTime = 0; sounds.explosion.play(); 
        
        // Przyspieszanie gry
        if(gameState.score > 0 && gameState.score % 200 === 0) {
           gameState.currentEnemySpeed += 20;
           gameState.currentSpawnRate = Math.max(400, gameState.currentSpawnRate - 50);
        }
      } 
    });
    if(b.y < -20) b.toRemove = true;
  });

  // Wrogowie
  gameState.enemies.forEach((e) => {
    e.update(dt);
    if(detectCollision(e, gameState.player)){ e.toRemove = true; takeDamage(15); }
    if(e.y > canvas.height) { e.toRemove = true; takeDamage(5); }
  });

  // Pociski wroga
  gameState.enemyBullets.forEach((b) => {
    b.y -= b.speed * dt;
    ctx.fillStyle = "red"; ctx.fillRect(b.x, b.y, b.width, b.height);
    if(detectCollision(b, gameState.player)){ b.toRemove = true; takeDamage(10); }
    if(b.y > canvas.height) b.toRemove = true;
  });

  gameState.bullets = gameState.bullets.filter(b => !b.toRemove);
  gameState.enemies = gameState.enemies.filter(e => !e.toRemove);
  gameState.enemyBullets = gameState.enemyBullets.filter(b => !b.toRemove);

  updateHUD();
  requestAnimationFrame(gameLoop);
}

function takeDamage(val){
  gameState.health -= val;
  sounds.hit.currentTime = 0; sounds.hit.play();
  if(gameState.health <= 0) endGame();
}

function shoot() {
  gameState.bullets.push(new Bullet(gameState.player.x + gameState.player.width/2 - 2, gameState.player.y, 600));
  sounds.playerShoot.currentTime = 0; sounds.playerShoot.play();
  gameState.lastPlayerShot = 0;

  // ZWIĘKSZANIE TEMPERATURY
  gameState.heat += GAME_CONFIG.heatPerShot;
  
  // SPRAWDZENIE PRZEGRZANIA
  if (gameState.heat >= GAME_CONFIG.maxHeat) {
      gameState.isOverheated = true;
      gameState.overheatTimer = GAME_CONFIG.overheatPenalty;
      // Opcjonalnie: odtwórz dźwięk błędu/przegrzania
      if(sounds.overheat) sounds.overheat.play();
  }
}

function endGame(){
  gameState.gameOver = true;
  finalScoreEl.textContent = gameState.score;
  gameOverMenu.classList.remove("hidden");
  sounds.bg.pause(); sounds.gameover.play();
}

// Event Listeners
window.addEventListener("load", () => {
  window.addEventListener("resize", resizeCanvas); resizeCanvas();
  volumeControl.addEventListener("input", () => sounds.bg.volume = volumeControl.value);
  volumeControl1.addEventListener("input", () => {
    const v = volumeControl1.value;
    Object.keys(sounds).forEach(k => { if(k !== 'bg') sounds[k].volume = v; });
  });
  window.addEventListener("keydown", (e) => { 
    gameState.keys[e.key] = true; 
    if([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => gameState.keys[e.key] = false);
  startBtn.addEventListener("click", () => { initGame(); requestAnimationFrame(gameLoop); });
  restartBtn.addEventListener("click", () => { initGame(); requestAnimationFrame(gameLoop); });
});