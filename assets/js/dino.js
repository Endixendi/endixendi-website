const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
const mobileControls = document.querySelector(".mobile-controls");

// --- Funkcja do sprawdzania urządzenia dotykowego ---
function isMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Domyślnie ukrywamy przycisk
mobileControls.style.display = "none";

// --- Dźwięki ---
const bgMusic = new Audio("assets/sounds/dino/bg-music.mp3");
const jumpSound = new Audio("assets/sounds/dino/jump.mp3");
const gameOverSound = new Audio("assets/sounds/dino/gameover.mp3");
const milestoneSound = new Audio("assets/sounds/dino/milestone.mp3");

bgMusic.loop = true;
bgMusic.volume = 0.3;

// Obsługa suwaka głośności
volumeControl.addEventListener("input", () => {
  bgMusic.volume = volumeControl.value;
});

// --- Klasy ---
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
  draw() {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
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
  jump() {
    if (this.grounded) {
      this.dy = -this.jumpForce;
      this.grounded = false;
      jumpSound.currentTime = 0;
      jumpSound.play();
    }
  }
}

class Obstacle {
  constructor(x, width, height, speed) {
    this.x = x;
    this.width = width;
    this.height = height;
    this.y = canvas.height - height - 50;
    this.speed = speed;
  }
  draw() {
    ctx.fillStyle = "brown";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  update() {
    this.x -= this.speed;
    this.draw();
  }
}

class Cloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 40;
    this.speed = 0.5;
  }
  draw() {
    ctx.fillStyle = "rgba(200,200,200,0.4)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.width, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.x = canvas.width + this.width;
      this.y = Math.random() * (canvas.height / 2);
    }
    this.draw();
  }
}

class Star {
  constructor(x, y, radius, speed) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
  }
  update() {
    this.x -= this.speed;
    if (this.x < 0) {
      this.x = canvas.width + this.radius;
      this.y = Math.random() * canvas.height;
    }
    this.draw();
  }
  draw() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Zmienne gry ---
let player, obstacles, clouds, stars, frame, score, gameOver, gameSpeed;
let highScore = localStorage.getItem("highScore") || 0;
highScoreEl.textContent = highScore;

// --- Responsywny canvas ---
function resizeCanvas() {
  const containerWidth = document.querySelector(".board-container").offsetWidth;
  canvas.width = containerWidth;
  canvas.height = containerWidth / 2;
  if (player) scaleEntities();
}

function scaleEntities() {
  player.width = canvas.width * 0.0625;
  player.height = canvas.height * 0.125;
  player.y = canvas.height - player.height - canvas.height * 0.125;
  obstacles.forEach(o => {
    o.height = o.width;
    o.y = canvas.height - o.height - canvas.height * 0.125;
  });
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Funkcje gry ---
function initGame() {
  player = new Player();
  obstacles = [];
  clouds = [new Cloud(canvas.width / 2, canvas.height / 4), new Cloud(canvas.width, canvas.height / 3)];
  stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push(new Star(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, Math.random() * 0.3 + 0.1));
  }
  frame = 0;
  score = 0;
  gameOver = false;
  gameSpeed = 6;
  bgMusic.currentTime = 0;
  bgMusic.play();

  // Pokaż przycisk tylko na urządzeniach dotykowych
  if (isMobile()) mobileControls.style.display = "block";
}

function spawnObstacle() {
  let size = Math.random() * 30 + 20;
  obstacles.push(new Obstacle(canvas.width, size, size, gameSpeed));
}

function detectCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.height + a.y > b.y;
}

function drawGround() {
  ctx.fillStyle = "#2e2e2e";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

// --- Animacja ---
function animate() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(star => star.update());
  clouds.forEach(c => c.update());
  drawGround();
  player.update();

  if (frame % 120 === 0) spawnObstacle();
  obstacles.forEach(o => {
    o.update();
    if (detectCollision(player, o)) gameOverHandler();
  });

  score++;
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;

  if (score > 0 && score % 1000 === 0) {
    milestoneSound.currentTime = 0;
    milestoneSound.play();
  }

  if (score > 0 && score % 2000 === 0) gameSpeed++;

  frame++;
  requestAnimationFrame(animate);
}

// --- Game Over ---
function gameOverHandler() {
  gameOver = true;
  bgMusic.pause();
  gameOverSound.currentTime = 0;
  gameOverSound.play();

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  finalScoreEl.textContent = score;
  finalHighScoreEl.textContent = highScore;
  gameOverMenu.classList.remove("hidden");

  // Ukryj przycisk na mobile
  if (isMobile()) mobileControls.style.display = "none";
}

// --- Sterowanie ---
window.addEventListener("keydown", e => {
  if ((e.code === "Space" || e.code === "ArrowUp")) {
    e.preventDefault();
    if (!gameOver) player.jump();
  }
});

jumpBtn.addEventListener("click", () => {
  if (!gameOver) player.jump();
});

// --- Menu ---
startBtn.addEventListener("click", () => {
  menu.classList.add("hidden");
  initGame();
  animate();
});

restartBtn.addEventListener("click", () => {
  gameOverMenu.classList.add("hidden");
  initGame();
  animate();
});