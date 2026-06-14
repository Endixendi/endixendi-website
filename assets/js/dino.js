/**
 * Gra Dino - Cyber-Arcade z systemem ładowania tarczy
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
const volumeControl = document.getElementById('volume-music');
const volumeControl1 = document.getElementById('volume-effects');
const jumpBtn = document.getElementById('jumpBtn');
const crouchBtn = document.getElementById('crouchBtn');

// Ukrywamy kontrolki mobilne na komputerach na start
if (window.innerWidth > 768) {
    if (jumpBtn) jumpBtn.style.display = "none";
    if (crouchBtn) crouchBtn.style.display = "none";
}

// Dźwięki
const bgMusic = new Audio("assets/sounds/dino/dino-bg.webm");
const jumpSound = new Audio("assets/sounds/global/jump.webm");
const gameOverSound = new Audio("assets/sounds/global/gameover-sad.webm");
const milestoneSound = new Audio("assets/sounds/global/point.webm");
const point1000Sound = new Audio("assets/sounds/global/line-clear.webm");
const explosionSound = new Audio("assets/sounds/global/explosion.webm");

bgMusic.loop = true;

// Stan gry
let player = null;
let obstacles = [];
let clouds = [];
let stars = [];
let items = [];
let activeUfo = null;
let score = 0;
let lastMilestoneScore = 0;
let gameOver = false;
let gameSpeed = 350;
let lastTime = 0;
let spawnTimer = 0;
let itemSpawnTimer = 0;
let scoreTimer = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
highScoreEl.textContent = highScore;

// System tarczy (ładowanej kryształami)
let shieldEnergy = 0; // Wartość od 0 do 100%

// Monitorowanie wciśniętych klawiszy
const keys = {
    ArrowUp: false,
    Space: false,
    ArrowDown: false,
    KeyS: false,
    KeyW: false
};

// WIRTUALNA ROZDZIELCZOŚĆ (Stałe proporcje gry)
const V_WIDTH = 800;
const V_HEIGHT = 350;
let scale = 1;

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;
    
    let targetWidth = container.clientWidth;
    if (targetWidth > 800) targetWidth = 800;
    
    scale = targetWidth / V_WIDTH;
    
    canvas.width = targetWidth;
    canvas.height = V_HEIGHT * scale;
}

function getAccentColor(fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || fallback;
}

// --- KLASY I OBIEKTY ---

class Dino {
    constructor() {
        this.normalHeight = 44;
        this.crouchHeight = 22;
        this.width = 44;
        this.height = this.normalHeight;
        
        this.x = 60;
        this.groundY = V_HEIGHT - this.normalHeight - 15;
        this.y = this.groundY;
        
        this.vy = 0;
        this.gravity = 1600; 
        this.jumpForce = -520;
        this.isJumping = false;
        this.isCrouching = false;
        
        this.hasShield = false;
    }

    jump() {
        if (!this.isJumping && !this.isCrouching) {
            this.vy = this.jumpForce;
            this.isJumping = true;
            jumpSound.currentTime = 0;
            jumpSound.play().catch(() => {});
        }
    }

    update(dt) {
        if ((keys.ArrowDown || keys.KeyS) && !this.isJumping) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.height = this.crouchHeight;
                this.y = V_HEIGHT - this.crouchHeight - 15;
            }
        } else {
            if (this.isCrouching) {
                this.isCrouching = false;
                this.height = this.normalHeight;
                this.y = V_HEIGHT - this.normalHeight - 15;
            }
        }

        if (!this.isCrouching) {
            this.vy += this.gravity * dt;
            this.y += this.vy * dt;

            let currentGround = V_HEIGHT - this.height - 15;
            if (this.y > currentGround) {
                this.y = currentGround;
                this.vy = 0;
                this.isJumping = false;
            }
        }
    }

    draw() {
        ctx.save();
        
        if (this.hasShield) {
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff64';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.9, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = getAccentColor('#00aaff');
        ctx.shadowBlur = this.isCrouching ? 0 : 5;
        ctx.shadowColor = getAccentColor('#00aaff');
        
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.isCrouching ? 4 : 8);
        ctx.fill();
        
        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.type = Math.random() < 0.25 ? 'drone' : 'ground';
        
        if (this.type === 'ground') {
            this.width = 18 + Math.random() * 16;
            this.height = 35 + Math.random() * 25;
            this.x = V_WIDTH;
            this.y = V_HEIGHT - this.height - 15;
            this.color = "#ff4d6d";
        } else {
            this.width = 30;
            this.height = 20;
            this.x = V_WIDTH;
            this.y = V_HEIGHT - 68;
            this.color = "#00f5ff";
            this.hoverTime = Math.random() * 10;
        }
    }

    update(dt) {
        this.x -= gameSpeed * dt;
        if (this.type === 'drone') {
            this.hoverTime += dt * 5;
            this.y += Math.sin(this.hoverTime) * 0.4;
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
        } else {
            ctx.roundRect(this.x, this.y, this.width, this.height, 4);
            ctx.fillRect(this.x - 4, this.y + 6, this.width + 8, 4);
        }
        ctx.fill();
        ctx.restore();
    }
}

class PickupItem {
    constructor() {
        this.width = 16;
        this.height = 16;
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
        const hoverOffset = Math.sin(this.bounceTime) * 3;

        ctx.shadowBlur = 10;
        ctx.fillStyle = '#bd00ff'; // Kryształ energetyczny
        ctx.shadowColor = '#bd00ff';
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + hoverOffset);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2 + hoverOffset);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height + hoverOffset);
        ctx.lineTo(this.x, this.y + this.height / 2 + hoverOffset);
        ctx.closePath();
        ctx.fill();
        
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
        this.spawnThreshold = Math.random() * 6000; // Niektóre gwiazdy pojawią się dopiero w głębokiej nocy
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
        // Rysuj gwiazdę tylko jeśli zdobyliśmy wymagany próg punktowy (efekt zagęszczania gwiazd nocą)
        if (score >= this.spawnThreshold) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
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

// Funkcja rysująca pasek energii tarczy na ekranie
function drawShieldBar() {
    ctx.save();
    const barWidth = 100;
    const barHeight = 10;
    const x = V_WIDTH - barWidth - 20;
    const y = 20;

    // Tło paska
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 3);
    ctx.fill();

    // Wypełnienie paska energii
    if (shieldEnergy > 0) {
        // Kolor zmienia się na zielony, gdy tarcza jest w 100% gotowa
        ctx.fillStyle = player && player.hasShield ? '#00ff64' : '#bd00ff';
        ctx.shadowBlur = player && player.hasShield ? 8 : 4;
        ctx.shadowColor = ctx.fillStyle;
        
        ctx.beginPath();
        ctx.roundRect(x, y, (shieldEnergy / 100) * barWidth, barHeight, 3);
        ctx.fill();
    }

    // Tekst pomocniczy nad paskiem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(player && player.hasShield ? 'TARCZA AKTYWNA' : `ENERGIA: ${shieldEnergy}%`, x + barWidth, y - 5);
    ctx.restore();
}

// --- SILNIK ROZGRYWKI ---

function initGame() {
    resizeCanvas();
    player = new Dino();
    obstacles = [];
    items = [];
    activeUfo = null;
    score = 0;
    lastMilestoneScore = 0;
    shieldEnergy = 0;
    gameOver = false;
    gameSpeed = 350;
    spawnTimer = 0;
    itemSpawnTimer = 0;
    scoreTimer = 0;
    scoreEl.textContent = score;

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
    
    // Włączenie przycisków na urządzeniach mobilnych
    if (window.innerWidth <= 768) {
        if (jumpBtn) jumpBtn.style.display = "block";
        if (crouchBtn) crouchBtn.style.display = "block";
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function animate(timestamp) {
    if (gameOver) return;
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(scale, scale);

    // KROK PO KROKU ŚCIEMNIANIE NIEBA (Płynny miks od #0f1115 do czystego #000000 wraz z punktami)
    let darknessFactor = Math.min(1, score / 6000); // Pełna czerń przy 6000 pkt
    let r = Math.floor(15 * (1 - darknessFactor));
    let g = Math.floor(17 * (1 - darknessFactor));
    let b = Math.floor(21 * (1 - darknessFactor));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Aktualizacja tła
    stars.forEach(star => { star.update(dt); star.draw(); });
    
    if (activeUfo) {
        activeUfo.update(dt);
        activeUfo.draw();
        if (activeUfo.x < -60) activeUfo = null;
    }

    clouds.forEach(cloud => { cloud.update(dt); cloud.draw(); });
    
    // Linia podłoża
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, V_HEIGHT - 15);
    ctx.lineTo(V_WIDTH, V_HEIGHT - 15);
    ctx.stroke();

    // Dinozaur
    player.update(dt);
    player.draw();

    // Rysowanie UI interfejsu tarczy ochronnej
    drawShieldBar();

    // Spawnowanie fioletowych kryształów (tylko, gdy gracz nie ma jeszcze pełnej tarczy)
    if (!player.hasShield) {
        itemSpawnTimer += dt;
        if (itemSpawnTimer > 4.0 + Math.random() * 2.0) {
            items.push(new PickupItem());
            itemSpawnTimer = 0;
        }
    }

    // Obsługa zbierania kryształów
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i];
        it.update(dt);
        it.draw();

        if (checkCollision(player, it)) {
            // Dodajemy 25% energii za każdy kryształ
            shieldEnergy += 25;
            if (shieldEnergy >= 100) {
                shieldEnergy = 100;
                player.hasShield = true; // Włączenie tarczy przy 100%
            }
            
            milestoneSound.currentTime = 0;
            milestoneSound.play().catch(() => {});
            
            items.splice(i, 1);
            continue;
        }

        if (it.x + it.width < 0) items.splice(i, 1);
    }

    // Przeszkody
    spawnTimer += dt;
    let spawnInterval = Math.max(0.9, 2.2 - (gameSpeed / 400)); 
    if (spawnTimer > spawnInterval) {
        obstacles.push(new Obstacle());
        spawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update(dt);
        obs.draw();

        if (checkCollision(player, obs)) {
            if (player.hasShield) {
                player.hasShield = false; 
                shieldEnergy = 0; // Zużycie energii po pęknięciu tarczy
                obstacles.splice(i, 1); 
                explosionSound.currentTime = 0; 
                explosionSound.play().catch(() => {}); 
                continue;
            } else {
                ctx.restore();
                endGame();
                return;
            }
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Płynne naliczanie punktów czasowych
    scoreTimer += dt;
    if (scoreTimer >= 0.05) { 
        score += 5; 
        scoreTimer = 0;
        scoreEl.textContent = score;
        
        if (score > 0 && score % 1000 === 0) {
            point1000Sound.currentTime = 0;
            point1000Sound.play().catch(() => {});
            gameSpeed += 40;
        }

        if (score > 0 && score % 5000 === 0 && score !== lastMilestoneScore) {
            lastMilestoneScore = score;
            activeUfo = new UFO();
        }
    }

    ctx.restore();
    requestAnimationFrame(animate);
}

function endGame() {
    gameOver = true;
    bgMusic.pause();
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(() => {});

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        highScoreEl.textContent = highScore;
    }

    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;
    gameOverMenu.classList.remove("hidden");
    
    if (jumpBtn) jumpBtn.style.display = "none";
    if (crouchBtn) crouchBtn.style.display = "none";
}

// Listenery globalne i obsługa klawiatury
window.addEventListener("load", () => {
    window.addEventListener("resize", () => {
        resizeCanvas();
        if (!player || gameOver) {
            ctx.fillStyle = '#0f1115';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    });
    resizeCanvas();

    if (volumeControl) {
        volumeControl.addEventListener("input", () => {
            bgMusic.volume = volumeControl.value;
        });
    }
    
    if (volumeControl1) {
        volumeControl1.addEventListener('input', () => {
            const vol = volumeControl1.value;
            jumpSound.volume = vol;
            gameOverSound.volume = vol;
            milestoneSound.volume = vol;
        });
    }

    window.addEventListener("keydown", e => {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
            e.preventDefault();
            keys[e.code] = true;
            if (!gameOver && player) player.jump();
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
            e.preventDefault();
            keys[e.code] = true;
        }
    });

    window.addEventListener("keyup", e => {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "KeyS" || e.code === "KeyW") {
            e.preventDefault();
            keys[e.code] = false;
        }
    });

    // --- OBSŁUGA DOTYKU DLA URZĄDZEŃ MOBILNYCH ---

    // Przycisk SKOKU
    if (jumpBtn) {
        jumpBtn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (!gameOver && player) player.jump();
        }, { passive: false });
    }

    // Przycisk KUCANIA (Dino kuca tylko wtedy, gdy trzymasz palec)
    if (crouchBtn) {
        crouchBtn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            keys.ArrowDown = true; // Aktywuje kucanie w pętli gry
        }, { passive: false });

        crouchBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            keys.ArrowDown = false; // Wyłącza kucanie po puszczeniu palca
        }, { passive: false });
        
        crouchBtn.addEventListener("touchcancel", (e) => {
            e.preventDefault();
            keys.ArrowDown = false; // Zabezpieczenie na wypadek zsunięcia palca
        }, { passive: false });
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            menu.classList.add("hidden");
            initGame();
            lastTime = performance.now();
            requestAnimationFrame(animate);
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", () => {
            gameOverMenu.classList.add("hidden");
            initGame();
            lastTime = performance.now();
            requestAnimationFrame(animate);
        });
    }
});