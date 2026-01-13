/**
 * Gra Dino - wersja zoptymalizowana (Delta Time)
 * Naprawiona prędkość dla monitorów
 */

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
const volumeControl1 = document.getElementById('volumeControl1');
const jumpBtn = document.getElementById('jumpBtn');

jumpBtn.style.display = "none";

// Dźwięki
const bgMusic = new Audio("assets/sounds/dino/dino-bg.webm");
const jumpSound = new Audio("assets/sounds/global/jump.webm");
const gameOverSound = new Audio("assets/sounds/global/gameover-sad.webm");
const milestoneSound = new Audio("assets/sounds/global/point.webm");

bgMusic.loop = true;


// Stan gry
let player, obstacles, clouds, stars, score, gameOver, gameSpeed;
let lastTime = 0;
let spawnTimer = 0;
let scoreTimer = 0;
let highScore = localStorage.getItem("highScore") || 0;
highScoreEl.textContent = highScore;

class Player {
  constructor() {
    this.width = 50;
    this.height = 50;
    this.x = 100;
    this.y = 0;
    this.dy = 0;
    this.jumpForce = 850;   // Siła skoku
    this.gravity = 2600;     // Grawitacja (dinozaur jest "cięższy")
    this.grounded = false;
  }
  
  draw() {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  
  update(dt) {
    if (!this.grounded) {
      this.dy += this.gravity * dt;
    }
    this.y += this.dy * dt;

    const groundLevel = canvas.height - this.height - 50;
    if (this.y >= groundLevel) {
      this.y = groundLevel;
      this.grounded = true;
      this.dy = 0;
    } else {
      this.grounded = false;
    }
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
  
  update(dt) {
    this.x -= this.speed * dt;
    this.draw();
  }
}

class Cloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 40;
    this.speed = 60;
  }
  
  draw() {
    ctx.fillStyle = "rgba(200,200,200,0.4)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.width, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  update(dt) {
    this.x -= this.speed * dt;
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
    this.speed = speed * 100;
  }
  
  update(dt) {
    this.x -= this.speed * dt;
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

function resizeCanvas() {
  const container = document.querySelector(".board-container");
  if (!container) return;
  canvas.width = container.offsetWidth;
  canvas.height = canvas.width / 2;
  if (player) {
    player.width = canvas.width * 0.0625;
    player.height = canvas.height * 0.125;
  }
}

function initGame() {
  player = new Player();
  obstacles = [];
  clouds = [new Cloud(canvas.width / 2, canvas.height / 4), new Cloud(canvas.width, canvas.height / 3)];
  stars = [];
  
  for (let i = 0; i < 150; i++) {
    stars.push(new Star(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, Math.random() * 0.3 + 0.1));
  }
  
  score = 0;
  spawnTimer = 0;
  scoreTimer = 0;
  gameOver = false;
  gameSpeed = 650; // Dynamiczny start
  lastTime = performance.now();
  
  bgMusic.currentTime = 0;
  bgMusic.play();
  jumpBtn.style.display = "block";
}

function spawnObstacle() {
  let size = Math.random() * 30 + 25;
  obstacles.push(new Obstacle(canvas.width, size, size, gameSpeed));
}

function detectCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.height + a.y > b.y;
}

function drawGround() {
  ctx.fillStyle = "#2e2e2e";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

function animate(currentTime) {
  if (gameOver) return;
  
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (dt > 0.1) {
    requestAnimationFrame(animate);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(star => star.update(dt));
  clouds.forEach(c => c.update(dt));
  drawGround();
  player.update(dt);

  // Spawnowanie oparte na czasie i prędkości (im szybciej, tym częściej, by zachować odstęp)
  spawnTimer += dt;
  let spawnInterval = Math.max(0.8, 1.8 - (gameSpeed / 1000)); 
  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }
  
  obstacles.forEach((o, index) => {
    o.update(dt);
    if (detectCollision(player, o)) gameOverHandler();
    if (o.x + o.width < 0) obstacles.splice(index, 1);
  });

  // Punkty
  scoreTimer += dt;
  if (scoreTimer >= 0.05) { // Szybkie naliczanie wizualne
    score += 5; 
    scoreTimer = 0;
    scoreEl.textContent = score;
    
    // Przyspieszenie co 1000 pkt
    if (score > 0 && score % 1000 === 0) {
      milestoneSound.currentTime = 0;
      milestoneSound.play();
      gameSpeed += 80; // Wyraźny skok prędkości
    }
  }

  requestAnimationFrame(animate);
}

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
  jumpBtn.style.display = "none";
}

// Listenery
window.addEventListener("load", () => {
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  volumeControl.addEventListener("input", () => bgMusic.volume = volumeControl.value);
  if (volumeControl1) {
    volumeControl1.addEventListener('input', () => {
      jumpSound.volume = volumeControl1.value;
      gameOverSound.volume = volumeControl1.value;
      milestoneSound.volume = volumeControl1.value;
    });
  }

  window.addEventListener("keydown", e => {
    if ((e.code === "Space" || e.code === "ArrowUp")) {
      e.preventDefault();
      if (!gameOver && player) player.jump();
    }
  });

  jumpBtn.addEventListener("click", () => {
    if (!gameOver && player) player.jump();
  });

  startBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    initGame();
    requestAnimationFrame(animate);
  });

  restartBtn.addEventListener("click", () => {
    gameOverMenu.classList.add("hidden");
    initGame();
    requestAnimationFrame(animate);
  });
});