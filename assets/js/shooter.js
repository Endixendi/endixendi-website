/**
 * Gra Shooter - strzelanie do wrogich statków
 * Optymalizacja: lepsze zarządzanie pamięcią i wydajnością
 * @version 1.0
 */

// Stałe gry
const GAME_CONFIG = {
  playerShootCooldown: 200,  // ms między strzałami gracza
  enemySpawnRate: 1500,      // ms między spawnem wrogów
  initialHealth: 100         // Początkowe zdrowie gracza
};

// Inicjalizacja canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementy HUD
const scoreEl = document.getElementById("score");
const healthFill = document.getElementById("healthFill");

// Menu i przyciski
const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const gameOverMenu = document.getElementById("gameOverMenu");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// Kontrola dźwięku
const volumeControl = document.getElementById("volumeControl");

// Dźwięki gry
const sounds = {
  bg: new Audio("assets/sounds/shooter/retro-wave-style-track-59892.mp3"),
  gameover: new Audio("assets/sounds/shooter/gameover-86548.mp3"),
  playerShoot: new Audio("assets/sounds/shooter/laser-gun-81720.mp3"),
  enemyShoot: new Audio("assets/sounds/shooter/laser-gun-81720-red.mp3"),
  explosion: new Audio("assets/sounds/shooter/explosion-9-340460.mp3"),
  hit: new Audio("assets/sounds/shooter/ui-designed-hit-modern-interface-impact-sweetener-01-230484.mp3")
};

// Globalny stan gry
const gameState = {
  player: null,
  bullets: [],
  enemies: [],
  enemyBullets: [],
  score: 0,
  health: GAME_CONFIG.initialHealth,
  gameOver: false,
  stars: [],
  planets: [],
  keys: {},
  lastTime: 0,
  lastPlayerShot: 0,
  enemySpawnInterval: null
};

// Konfiguracja dźwięków
sounds.bg.loop = true;
sounds.bg.volume = 0.3;

// Ustawienie początkowego poziomu głośności dla wszystkich dźwięków
Object.values(sounds).forEach(sound => {
  sound.volume = 0.3;
});

/**
 * Responsywny canvas - dostosowuje rozmiar do kontenera
 */
function resizeCanvas() {
  const container = document.querySelector(".shooter-container");
  const maxWidth = Math.min(800, container.offsetWidth - 32);
  canvas.width = maxWidth;
  canvas.height = Math.floor(maxWidth * 0.75); // 4:3 aspect ratio
}

/**
 * Klasa Player - reprezentuje gracza
 */
class Player {
  constructor() {
    this.width = canvas.width * 0.05;
    this.height = canvas.width * 0.05;
    this.x = canvas.width/2 - this.width/2;
    this.y = canvas.height - this.height - 10;
    this.speed = canvas.width * 0.006;
  }
  
  draw() { 
    ctx.fillStyle = "orange"; 
    ctx.fillRect(this.x, this.y, this.width, this.height); 
  }
  
  update() { 
    if(gameState.keys["ArrowLeft"]) this.move(-1); 
    if(gameState.keys["ArrowRight"]) this.move(1); 
  }
  
  move(dir) { 
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + dir*this.speed)); 
  }
}

/**
 * Klasa Bullet - reprezentuje pociski
 */
class Bullet {
  constructor(x, y, speed = canvas.width * 0.009, color = "yellow") { 
    this.x = x;
    this.y = y;
    this.width = canvas.width * 0.006;
    this.height = canvas.width * 0.012;
    this.speed = speed;
    this.color = color;
  }
  
  update(){ 
    this.y -= this.speed; 
    this.draw(); 
  }
  
  draw(){ 
    ctx.fillStyle = this.color; 
    ctx.fillRect(this.x, this.y, this.width, this.height); 
  }
}

/**
 * Klasa Enemy - reprezentuje wrogów
 */
class Enemy {
  constructor(x, y){ 
    this.x = x;
    this.y = y;
    this.width = canvas.width * 0.05;
    this.height = canvas.width * 0.05;
    this.speed = canvas.width * 0.002;
    this.lastShot = 0;
    this.shootInterval = Math.random()*1500+500;
  }
  
  update(deltaTime){
    this.y += this.speed;
    this.draw();
    this.lastShot += deltaTime;
    const playerInSight = gameState.player.x + gameState.player.width > this.x && gameState.player.x < this.x + this.width;
    if(this.lastShot >= this.shootInterval && (playerInSight || Math.random()<0.02)){
      gameState.enemyBullets.push(new Bullet(this.x+this.width/2-2.5, this.y+this.height, 4, "orange"));
      this.lastShot = 0;
      this.shootInterval = Math.random()*1500+500;
      sounds.enemyShoot.currentTime = 0;
      sounds.enemyShoot.play();
    }
  }
  
  draw(){ 
    ctx.fillStyle = "red"; 
    ctx.fillRect(this.x, this.y, this.width, this.height); 
  }
}

/**
 * Klasa Star - reprezentuje gwiazdy w tle
 */
class Star {
  constructor(){ 
    this.x = Math.random()*canvas.width;
    this.y = Math.random()*canvas.height;
    this.size = Math.random()*2+1;
    this.speed = Math.random()*0.5+0.2;
  }
  
  update(){ 
    this.y += this.speed; 
    if(this.y > canvas.height) this.y = 0; 
    this.draw(); 
  }
  
  draw(){ 
    ctx.fillStyle = "white"; 
    ctx.fillRect(this.x, this.y, this.size, this.size); 
  }
}

/**
 * Klasa Planet - reprezentuje planety w tle
 */
class Planet {
  constructor(){ 
    this.x = Math.random()*canvas.width;
    this.y = Math.random()*canvas.height;
    this.radius = Math.random()*20+10;
    this.speed = Math.random()*0.2+0.1;
    this.color = ["purple","orange","blue","pink"][Math.floor(Math.random()*4)];
  }
  
  update(){ 
    this.y += this.speed;
    if(this.y > canvas.height) this.y = -this.radius;
    this.draw();
  }
  
  draw(){ 
    ctx.fillStyle = this.color; 
    ctx.beginPath(); 
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
    ctx.fill();
  }
}

/**
 * Inicjalizacja gry - resetuje stan gry
 */
function initGame(){
  gameState.player = new Player();
  gameState.bullets = []; 
  gameState.enemies = []; 
  gameState.enemyBullets = []; 
  gameState.score = 0; 
  gameState.health = GAME_CONFIG.initialHealth; 
  gameState.gameOver = false;
  gameState.stars = Array.from({length: 100}, () => new Star());
  gameState.planets = Array.from({length: 3}, () => new Planet());
  gameState.lastPlayerShot = 0;
  updateHUD();
  menu.style.display = "none";
  gameOverMenu.classList.add("hidden");
}

/**
 * Aktualizuje HUD (wynik i zdrowie)
 */
function updateHUD(){ 
  scoreEl.textContent = "Wynik: " + gameState.score; 
  healthFill.style.height = gameState.health + "%"; 
  healthFill.style.background = gameState.health > 50 ? "limegreen" : gameState.health > 20 ? "orange" : "red"; 
}

/**
 * Tworzy nowego wroga
 */
function spawnEnemy(){ 
  gameState.enemies.push(new Enemy(Math.random()*(canvas.width-40), -40)); 
}

/**
 * Wykrywa kolizję między dwoma obiektami
 * @param {Object} a - Pierwszy obiekt
 * @param {Object} b - Drugi obiekt
 * @returns {boolean} - Czy wystąpiła kolizja
 */
function detectCollision(a, b){ 
  return a.x < b.x + b.width && 
         a.x + a.width > b.x && 
         a.y < b.y + b.height && 
         a.y + a.height > b.y; 
}

/**
 * Główna pętla gry
 * @param {number} timestamp - Aktualny czas
 */
function gameLoop(timestamp){
  if(gameState.gameOver) return;
  const deltaTime = timestamp - gameState.lastTime; 
  gameState.lastTime = timestamp;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Aktualizuj czas od ostatniego strzału gracza
  gameState.lastPlayerShot += deltaTime;
  
  // Obsługa strzelania gracza
  if(gameState.keys[" "] && !gameState.gameOver && gameState.lastPlayerShot >= GAME_CONFIG.playerShootCooldown){
    gameState.bullets.push(new Bullet(gameState.player.x+gameState.player.width/2-2.5, gameState.player.y));
    sounds.playerShoot.currentTime = 0;
    sounds.playerShoot.play();
    gameState.lastPlayerShot = 0;
  }

  gameState.stars.forEach(s => s.update());
  gameState.planets.forEach(p => p.update());
  gameState.player.update(); 
  gameState.player.draw();

  gameState.bullets.forEach((b, i) => {
    b.update();
    gameState.enemies.forEach((e, j) => { 
      if(detectCollision(b, e)){ 
        gameState.enemies.splice(j, 1); 
        gameState.bullets.splice(i, 1); 
        gameState.score += 10; 
        sounds.explosion.currentTime = 0; 
        sounds.explosion.play(); 
      } 
    });
    if(b.y + b.height < 0) gameState.bullets.splice(i, 1);
  });

  gameState.enemies.forEach((e, i) => {
    e.update(deltaTime);
    if(detectCollision(e, gameState.player)){ 
      gameState.enemies.splice(i, 1); 
      gameState.health -= 5; 
      sounds.hit.currentTime = 0; 
      sounds.hit.play(); 
      if(gameState.health <= 0) endGame(); 
    }
    if(e.y > canvas.height){ 
      gameState.enemies.splice(i, 1); 
      gameState.health -= 5; 
      if(gameState.health <= 0) endGame(); 
    }
  });

  gameState.enemyBullets.forEach((b, i) => {
    b.y += b.speed; 
    ctx.fillStyle = "orange"; 
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if(detectCollision(b, gameState.player)){ 
      gameState.enemyBullets.splice(i, 1); 
      gameState.health -= 5; 
      sounds.hit.currentTime = 0; 
      sounds.hit.play(); 
      if(gameState.health <= 0) endGame(); 
    }
    if(b.y > canvas.height) gameState.enemyBullets.splice(i, 1);
  });

  updateHUD();
  requestAnimationFrame(gameLoop);
}

/**
 * Kończy grę i wyświetla menu game over
 */
function endGame(){
  gameState.gameOver = true;
  finalScoreEl.textContent = gameState.score;
  gameOverMenu.classList.remove("hidden");
  clearInterval(gameState.enemySpawnInterval);
  sounds.bg.pause();
  sounds.gameover.currentTime = 0;
  sounds.gameover.play();
}

/**
 * Obsługa przycisków mobilnych
 */
function initMobileControls() {
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const shootBtn = document.getElementById("shootBtn");

  leftBtn.addEventListener("touchstart", () => { gameState.keys["ArrowLeft"] = true; });
  leftBtn.addEventListener("touchend", () => { gameState.keys["ArrowLeft"] = false; });
  leftBtn.addEventListener("mousedown", () => { gameState.keys["ArrowLeft"] = true; });
  leftBtn.addEventListener("mouseup", () => { gameState.keys["ArrowLeft"] = false; });
  leftBtn.addEventListener("mouseleave", () => { gameState.keys["ArrowLeft"] = false; });

  rightBtn.addEventListener("touchstart", () => { gameState.keys["ArrowRight"] = true; });
  rightBtn.addEventListener("touchend", () => { gameState.keys["ArrowRight"] = false; });
  rightBtn.addEventListener("mousedown", () => { gameState.keys["ArrowRight"] = true; });
  rightBtn.addEventListener("mouseup", () => { gameState.keys["ArrowRight"] = false; });
  rightBtn.addEventListener("mouseleave", () => { gameState.keys["ArrowRight"] = false; });

  shootBtn.addEventListener("touchstart", () => { 
    if (!gameState.gameOver && gameState.lastPlayerShot >= GAME_CONFIG.playerShootCooldown) {
      shoot();
    }
  });
  shootBtn.addEventListener("mousedown", () => { 
    if (!gameState.gameOver && gameState.lastPlayerShot >= GAME_CONFIG.playerShootCooldown) {
      shoot();
    }
  });
}

/**
 * Funkcja strzału gracza
 */
function shoot() {
  gameState.bullets.push(new Bullet(gameState.player.x + gameState.player.width/2 - 2.5, gameState.player.y));
  sounds.playerShoot.currentTime = 0;
  sounds.playerShoot.play();
  gameState.lastPlayerShot = 0;
}

// Inicjalizacja gry po załadowaniu strony
window.addEventListener("load", () => {
  // Responsywny canvas
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Obsługa suwaka głośności
  volumeControl.addEventListener("input", () => {
    const volume = parseFloat(volumeControl.value);
    Object.values(sounds).forEach(sound => {
      sound.volume = volume;
    });
  });

  // Sterowanie klawiaturą
  window.addEventListener("keydown", (e) => { 
    gameState.keys[e.key] = true; 
    if([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => { 
    gameState.keys[e.key] = false; 
  });

  // Menu startowe
  startBtn.addEventListener("click", () => {
    initGame();
    gameState.enemySpawnInterval = setInterval(spawnEnemy, GAME_CONFIG.enemySpawnRate);
    gameState.lastTime = 0;
    gameLoop(0);
    sounds.bg.currentTime = 0; 
    sounds.bg.play();
  });

  // Restart gry
  restartBtn.addEventListener("click", () => { 
    initGame();
    gameState.enemySpawnInterval = setInterval(spawnEnemy, GAME_CONFIG.enemySpawnRate);
    gameState.lastTime = 0;
    gameLoop(0);
    sounds.bg.currentTime = 0; 
    sounds.bg.play();
  });

  // Zapobiegaj przewijaniu strony przy dotknięciu canvas
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });

  // Inicjalizacja sterowania mobilnego
  initMobileControls();
});