/**
 * Gra Dino - skaczący dinozaur omijający przeszkody
 * Inspirowana grą z przeglądarki Chrome
 * @version 1.0
 */

// Inicjalizacja canvas i kontekstu
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementy UI
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const gameOverMenu = document.getElementById('gameOverMenu');
const finalScoreEl = document.getElementById('finalScore');
const finalHighScoreEl = document.getElementById('finalHighScore');
const restartBtn = document.getElementById('restartBtn');
const volumeControl = document.getElementById("volumeControl");
const jumpBtn = document.getElementById('jumpBtn');

// Domyślnie ukrywamy przycisk skoku
jumpBtn.style.display = "none";

// Dźwięki gry
const bgMusic = new Audio("assets/sounds/dino/bg-music.mp3");
const jumpSound = new Audio("assets/sounds/dino/jump.mp3");
const gameOverSound = new Audio("assets/sounds/dino/gameover.mp3");
const milestoneSound = new Audio("assets/sounds/dino/milestone.mp3");

// Konfiguracja dźwięków
bgMusic.loop = true;
bgMusic.volume = 0.3;

jumpSound.volume = 0.3;
gameOverSound.volume = 0.3;
milestoneSound.volume = 0.3;

// Stan gry
let player, obstacles, clouds, stars, frame, score, gameOver, gameSpeed;
let highScore = localStorage.getItem("highScore") || 0;
highScoreEl.textContent = highScore;

/**
 * Klasa Player - reprezentuje gracza (dino)
 */
class Player {
  constructor() {
    this.width = 50;
    this.height = 50;
    this.x = 100;
    this.y = 0;
    this.dy = 0;
    this.jumpForce = 15;
    this.gravity = 0.8;
    this.grounded = false;
  }
  
  /**
   * Rysuje gracza na canvas
   */
  draw() {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  
  /**
   * Aktualizuje pozycję gracza
   */
  update() {
    this.y += this.dy;
    if (!this.grounded) this.dy += this.gravity;
    if (this.y + this.height >= canvas.height - 50) {
      this.y = canvas.height - this.height - 50;
      this.grounded = true;
      this.dy = 0;
    } else this.grounded = false;
    this.draw();
  }
  
  /**
   * Wykonuje skok gracza
   */
  jump() {
    if (this.grounded) {
      this.dy = -this.jumpForce;
      this.grounded = false;
      jumpSound.currentTime = 0;
      jumpSound.play();
    }
  }
}

/**
 * Klasa Obstacle - reprezentuje przeszkody
 */
class Obstacle {
  constructor(x, width, height, speed) {
    this.x = x;
    this.width = width;
    this.height = height;
    this.y = canvas.height - height - 50;
    this.speed = speed;
  }
  
  /**
   * Rysuje przeszkodę na canvas
   */
  draw() {
    ctx.fillStyle = "brown";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  
  /**
   * Aktualizuje pozycję przeszkody
   */
  update() {
    this.x -= this.speed;
    this.draw();
  }
}

/**
 * Klasa Cloud - reprezentuje chmury w tle
 */
class Cloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 40;
    this.speed = 0.5;
  }
  
  /**
   * Rysuje chmurę na canvas
   */
  draw() {
    ctx.fillStyle = "rgba(200,200,200,0.4)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.width, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Aktualizuje pozycję chmury
   */
  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.x = canvas.width + this.width;
      this.y = Math.random() * (canvas.height / 2);
    }
    this.draw();
  }
}

/**
 * Klasa Star - reprezentuje gwiazdy w tle
 */
class Star {
  constructor(x, y, radius, speed) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
  }
  
  /**
   * Aktualizuje pozycję gwiazdy
   */
  update() {
    this.x -= this.speed;
    if (this.x < 0) {
      this.x = canvas.width + this.radius;
      this.y = Math.random() * canvas.height;
    }
    this.draw();
  }
  
  /**
   * Rysuje gwiazdę na canvas
   */
  draw() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Responsywny canvas - dostosowuje rozmiar do kontenera
 */
function resizeCanvas() {
  const containerWidth = document.querySelector(".board-container").offsetWidth;
  canvas.width = containerWidth;
  canvas.height = containerWidth / 2;
  if (player) scaleEntities();
}

/**
 * Skaluje entity gry do nowego rozmiaru canvas
 */
function scaleEntities() {
  player.width = canvas.width * 0.0625;
  player.height = canvas.height * 0.125;
  player.y = canvas.height - player.height - canvas.height * 0.125;
  obstacles.forEach(o => {
    o.height = o.width;
    o.y = canvas.height - o.height - canvas.height * 0.125;
  });
}

/**
 * Inicjalizuje grę - resetuje stan gry
 */
function initGame() {
  player = new Player();
  obstacles = [];
  clouds = [new Cloud(canvas.width / 2, canvas.height / 4), new Cloud(canvas.width, canvas.height / 3)];
  stars = [];
  
  // Tworzy gwiazdy w tle
  for (let i = 0; i < 150; i++) {
    stars.push(new Star(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 1.5,
      Math.random() * 0.3 + 0.1
    ));
  }
  
  frame = 0;
  score = 0;
  gameOver = false;
  gameSpeed = 6;
  bgMusic.currentTime = 0;
  bgMusic.play();

  // Pokaż przycisk skoku
  jumpBtn.style.display = "block";
}

/**
 * Tworzy nową przeszkodę
 */
function spawnObstacle() {
  let size = Math.random() * 30 + 20;
  obstacles.push(new Obstacle(canvas.width, size, size, gameSpeed));
}

/**
 * Wykrywa kolizję między dwoma obiektami
 * @param {Object} a - Pierwszy obiekt
 * @param {Object} b - Drugi obiekt
 * @returns {boolean} - Czy wystąpiła kolizja
 */
function detectCollision(a, b) {
  return a.x < b.x + b.width && 
         a.x + a.width > b.x &&
         a.y < b.y + b.height && 
         a.height + a.y > b.y;
}

/**
 * Rysuje ziemię na canvas
 */
function drawGround() {
  ctx.fillStyle = "#2e2e2e";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

/**
 * Główna pętla animacji gry
 */
function animate() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tło
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Aktualizuj i rysuj elementy gry
  stars.forEach(star => star.update());
  clouds.forEach(c => c.update());
  drawGround();
  player.update();

  // Twórz przeszkody co 120 klatek
  if (frame % 120 === 0) spawnObstacle();
  
  // Aktualizuj i sprawdzaj kolizje przeszkód
  obstacles.forEach(o => {
    o.update();
    if (detectCollision(player, o)) gameOverHandler();
  });

  // Aktualizuj wynik
  score++;
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;

  // Odtwórz dźwięk milestonu co 1000 punktów
  if (score > 0 && score % 1000 === 0) {
    milestoneSound.currentTime = 0;
    milestoneSound.play();
  }

  // Zwiększ prędkość gry co 2000 punktów
  if (score > 0 && score % 2000 === 0) gameSpeed++;

  frame++;
  requestAnimationFrame(animate);
}

/**
 * Obsługuje koniec gry
 */
function gameOverHandler() {
  gameOver = true;
  bgMusic.pause();
  gameOverSound.currentTime = 0;
  gameOverSound.play();

  // Aktualizuj rekord jeśli został pobity
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  // Aktualizuj menu game over
  finalScoreEl.textContent = score;
  finalHighScoreEl.textContent = highScore;
  gameOverMenu.classList.remove("hidden");

  // Ukryj przycisk skoku po Game Over
  jumpBtn.style.display = "none";
}

// Inicjalizacja gry po załadowaniu strony
window.addEventListener("load", () => {
  // Responsywny canvas
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Obsługa suwaka głośności
  volumeControl.addEventListener("input", () => {
    bgMusic.volume = volumeControl.value;
  });
    
  // Obsługa suwaka głośności - efekty
  volumeControl1.addEventListener('input', () => {
    jumpSound.volume = volumeControl1.value;
	gameOverSound.volume = volumeControl1.value;
	milestoneSound.volume = volumeControl1.value;
  });

  // Sterowanie klawiaturą
  window.addEventListener("keydown", e => {
    if ((e.code === "Space" || e.code === "ArrowUp")) {
      e.preventDefault();
      if (!gameOver) player.jump();
    }
  });

  // Sterowanie przyciskiem mobilnym
  jumpBtn.addEventListener("click", () => {
    if (!gameOver) player.jump();
  });

  // Menu startowe
  startBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    initGame();
    animate();
  });

  // Restart gry
  restartBtn.addEventListener("click", () => {
    gameOverMenu.classList.add("hidden");
    initGame();
    animate();
  });
});