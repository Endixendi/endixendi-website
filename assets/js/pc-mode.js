// --- 1. DYNAMICZNY ZEGAR I DATA ---
function updateClockAndDate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('pc-time').textContent = timeStr;
    
    const fullTimeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if(document.getElementById('popup-large-time')) {
        document.getElementById('popup-large-time').textContent = fullTimeStr;
    }

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('pc-date').textContent = `${day}.${month}.${now.getFullYear()}`;
    
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const fullDateStr = now.toLocaleDateString('pl-PL', options);
    if(document.getElementById('popup-large-date')) {
        document.getElementById('popup-large-date').textContent = fullDateStr;
    }
}
setInterval(updateClockAndDate, 1000);
updateClockAndDate();

// --- 2. OBSŁUGA MENU START ---
function toggleStartMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('start-menu');
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'flex';
    }
}

document.onclick = function(event) {
    const menu = document.getElementById('start-menu');
    if (menu && menu.style.display === 'flex') {
        menu.style.display = 'none';
    }
};

// --- 3. OBSŁUGA OKIEN SYSTEMOWYCH ---
let highestZ = 100;

function openWindow(id) {
    const win = document.getElementById(id);
    win.style.display = 'flex';
    focusWindow(win);
    const title = win.querySelector('.window-title').textContent;
    document.getElementById('taskbar-status').textContent = title;
    
    if (id === 'win-notepad') {
        const savedNote = localStorage.getItem('gamingOS_note');
        if (savedNote !== null) {
            document.getElementById('notepad-text').value = savedNote;
        }
    }
    // Automatyczne inicjowanie silnika mini gry, kiedy okno przeglądarki jest otwierane
    if (id === 'win-browser') {
        resetBrowserDino(null);
    }
}

function closeWindow(id) {
    document.getElementById(id).style.display = 'none';
    document.getElementById('taskbar-status').textContent = "GamingOS v2.0";
    if (id === 'win-browser') {
        stopBrowserDinoLoop();
    }
}

function focusWindow(win) {
    highestZ++;
    win.style.zIndex = highestZ;
}

// --- 4. PRZECIĄGANIE OKIEN Z BLOKADĄ KRAWĘDZI ---
function dragWindow(e, id) {
    // BLOKADA DLA TELEFONÓW: Wyłączamy przeciąganie na małych ekranach dotykowych
    if (window.innerWidth <= 768) {
        return;
    }

    if (e.target.classList.contains('window-close')) return;
    
    const win = document.getElementById(id);
    focusWindow(win);
    let posX = e.clientX;
    let posY = e.clientY;

    const arena = document.querySelector('.desktop-arena');
    const arenaRect = arena.getBoundingClientRect();

    document.onmousemove = function(e) {
        const diffX = posX - e.clientX;
        const diffY = posY - e.clientY;
        posX = e.clientX;
        posY = e.clientY;

        let newTop = win.offsetTop - diffY;
        let newLeft = win.offsetLeft - diffX;

        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        if (newTop + win.offsetHeight > arenaRect.height) newTop = arenaRect.height - win.offsetHeight;
        if (newLeft + win.offsetWidth > arenaRect.width) newLeft = arenaRect.width - win.offsetWidth;

        win.style.top = newTop + "px";
        win.style.left = newLeft + "px";
    };

    document.onmouseup = function() {
        document.onmousemove = null;
        document.onmouseup = null;
    };
}

// --- 5. LOGIKA NOTATNIKA ---
function saveNote() {
    const text = document.getElementById('notepad-text').value;
    localStorage.setItem('gamingOS_note', text);
    const status = document.getElementById('notepad-status');
    status.textContent = "Zapisano!";
    setTimeout(() => { status.textContent = ""; }, 2000);
}

function exportNote() {
    const text = document.getElementById('notepad-text').value;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'notatka.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// --- INTEGRACJA: EKSPLORATOR -> NOTATNIK ---
function openStaticFile(name, escapedContent) {
    const content = escapedContent.replace(/\\n/g, '\n');
    openWindow('win-notepad');
    document.getElementById('notepad-text').value = content;
    const status = document.getElementById('notepad-status');
    status.textContent = `Wczytano: ${name}`;
    setTimeout(() => { status.textContent = ""; }, 3000);
}

// --- INTERAKTYWNA KONSOLA (TERMINAL) ---
function handleTerminalCommand(e) {
    if (e.key === 'Enter') {
        const inputEl = document.getElementById('terminal-input');
        const cmd = inputEl.value.trim().toLowerCase();
        const outputEl = document.getElementById('terminal-output');
        
        if (!cmd) return;

        let response = `\n> ${inputEl.value}\n`;

        if (cmd === 'help') {
            response += "Dostępne komendy:\n" +
                        " help      - Wyświetla tę listę\n" +
                        " cls       - Czyszczenie ekranu konsoli\n" +
                        " notepad   - Otwiera aplikację Notatnik\n" +
                        " browser   - Otwiera przeglądarkę internetową\n" +
                        " about     - Pokazuje informacje o systemie\n" +
                        " shutdown  - Wyłącza system GamingOS";
        } else if (cmd === 'cls') {
            outputEl.textContent = "";
            inputEl.value = "";
            return;
        } else if (cmd === 'notepad') {
            openWindow('win-notepad');
            response += "Uruchamianie Notatnika...";
        } else if (cmd === 'browser') {
            openWindow('win-browser');
            response += "Uruchamianie Cyber Netscape Browser...";
        } else if (cmd === 'about') {
            openWindow('win-about');
            response += "Otwieranie okna informacji o systemie...";
        } else if (cmd === 'shutdown') {
            response += "Inicjowanie sekwencji wyłączania...";
            outputEl.textContent += response;
            inputEl.value = "";
            setTimeout(() => triggerShutdown(), 1000);
            return;
        } else {
            response += `Błąd: Komenda '${cmd}' nie została rozpoznana. Wpisz 'help'.`;
        }

        outputEl.textContent += response;
        inputEl.value = "";
        outputEl.scrollTop = outputEl.scrollHeight;
    }
}

// --- LOGIKA EMULACJI PRZEGLĄDARKI (PODSTRONY STEROWANE KLASAMI) ---
function changeBrowserContent(page) {
    const homeTab = document.getElementById('web-page-home');
    const newsTab = document.getElementById('web-page-news');
    const arcadeTab = document.getElementById('web-page-arcade');

    // Reset klas do stanu ukrytego
    homeTab.className = 'browser-tab-hidden';
    newsTab.className = 'browser-tab-hidden';
    arcadeTab.className = 'browser-tab-hidden';

    const urlField = document.getElementById('browser-url-field');
    const indicator = document.getElementById('browser-loading-indicator');

    indicator.style.background = '#ff006e'; // Tutaj dynamiczny kolor indykatora może zostać
    stopBrowserDinoLoop();

    setTimeout(() => {
        indicator.style.background = '#39ff14';
        
        if (page === 'home') {
            homeTab.className = 'browser-tab-active';
            urlField.textContent = "https://gaming-matrix.net";
        } else if (page === 'news') {
            newsTab.className = 'browser-tab-active';
            urlField.textContent = "https://gaming-matrix.net/news_feed.html";
        } else if (page === 'arcade') {
            arcadeTab.className = 'browser-tab-active';
            urlField.textContent = "https://gaming-matrix.net/local_arcade";
            resetBrowserDino(null);
        }
    }, 250);
}

// --- CAŁKOWICIE NOWY, PŁYNNY SILNIK GRY DINO ---
let dinoY = 0;
let dinoVelocity = 0;
const gravity = -0.6; // Siła grawitacji
const jumpStrength = 8.5; // Siła wybicia skoku
let isJumping = false;

let cactusX = 500;
let gameSpeed = 4.5; // Prędkość poruszania kaktusa
let dinoScore = 0;
let bIsGameOver = false;
let dinoAnimationId = null;

function jumpBrowserDino() {
    if (isJumping || bIsGameOver) return;
    isJumping = true;
    dinoVelocity = jumpStrength;
}

// Przechwytywanie spacji globalnie
window.addEventListener('keydown', function(e) {
    const arcadeTab = document.getElementById('web-page-arcade');
    if (e.key === ' ' && arcadeTab && arcadeTab.classList.contains('browser-tab-active')) {
        e.preventDefault();
        jumpBrowserDino();
    }
});

function resetBrowserDino(event) {
    if (event) event.stopPropagation();
    stopBrowserDinoLoop();
    
    bIsGameOver = false;
    dinoScore = 0;
    dinoY = 0;
    dinoVelocity = 0;
    isJumping = false;
    cactusX = 450; // Zmniejszone z 500, żeby kaktus nie wychodził poza obszar ramki
    gameSpeed = 4.5;

    document.getElementById('b-gameover').style.display = 'none';
    document.getElementById('b-score').textContent = "Punkty: 0";
    
    // Render początkowy
    document.getElementById('b-dino').style.transform = `translateY(0px)`;
    document.getElementById('b-cactus').style.transform = `translateX(${cactusX}px)`;

    const arcadeTab = document.getElementById('web-page-arcade');
    if (arcadeTab && arcadeTab.classList.contains('browser-tab-active')) {
        dinoAnimationId = requestAnimationFrame(updateBrowserDinoGameLoop);
    }
}

function stopBrowserDinoLoop() {
    if (dinoAnimationId) {
        cancelAnimationFrame(dinoAnimationId);
        dinoAnimationId = null;
    }
}

function updateBrowserDinoGameLoop() {
    if (bIsGameOver) return;

    // 1. Fizyka skoku dinozaura
    if (isJumping) {
        dinoY += dinoVelocity;
        dinoVelocity += gravity;

        if (dinoY <= 0) {
            dinoY = 0;
            dinoVelocity = 0;
            isJumping = false;
        }
    }
    document.getElementById('b-dino').style.transform = `translateY(${-dinoY}px)`;

	// 2. Ruch kaktusa
    cactusX -= gameSpeed;
    if (cactusX < -20) {
        cactusX = 450; // Reset pozycji kaktusa wewnątrz kontenera
        dinoScore += 10;
        document.getElementById('b-score').textContent = `Punkty: ${dinoScore}`;
        
        if (gameSpeed < 8) gameSpeed += 0.2;
    }
    document.getElementById('b-cactus').style.transform = `translateX(${cactusX}px)`;

	// 3. Detekcja kolizji (Skorygowane wartości pod szerokość okna)
    const dinoLeft = 40;
    const dinoRight = 64;
    const cactusLeft = cactusX;
    const cactusRight = cactusX + 20;

    if (cactusRight > dinoLeft && cactusLeft < dinoRight) {
        if (dinoY < 20) {
            bIsGameOver = true;
            stopBrowserDinoLoop();
            document.getElementById('b-gameover').style.display = 'flex';
            return;
        }
    }

    dinoAnimationId = requestAnimationFrame(updateBrowserDinoGameLoop);
}

// --- 6. INICJALIZACJA SYSTEMOWEGO AUDIO ---
const systemSounds = {
    startup: new Audio("assets/sounds/system/windows-xp-startup.mp3"),
    shutdown: new Audio("assets/sounds/system/microsoft-windows-xp-shutdown-sound.mp3"),
    bartosz: new Audio("assets/sounds/system/bartosz.mp3")
};
systemSounds.startup.volume = 0.5;
systemSounds.shutdown.volume = 0.6;

systemSounds.bartosz.loop = true;
systemSounds.bartosz.volume = 0.0;

function playStartupSound() {
    systemSounds.startup.play()
        .then(() => {
            document.removeEventListener('click', playStartupSound);
        })
        .catch(err => {
            console.log("Autoplay zablokowany. Oczekiwanie na interakcję...");
        });
}

window.addEventListener('DOMContentLoaded', playStartupSound);
document.addEventListener('click', playStartupSound);

// OBSŁUGA SUWAKA GŁOŚNOŚCI I PĘTLI BARTOSZ.MP3
const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider) {
    volumeSlider.addEventListener('input', function() {
        const volValue = parseInt(this.value);
        const normalizedVolume = volValue / 100;

        if (volValue > 0) {
            systemSounds.bartosz.volume = normalizedVolume;
            if (systemSounds.bartosz.paused) {
                systemSounds.bartosz.play().catch(err => console.log("Blokada odtwarzania:", err));
            }
        } else {
            systemSounds.bartosz.pause();
        }
    });
}

// --- 7. SEKWENCJA ZAMYKANIA SYSTEMU (SHUTDOWN) ---
function triggerShutdown(event) {
    if(event) event.stopPropagation();
    
    systemSounds.bartosz.pause();
    stopBrowserDinoLoop();

    const menu = document.getElementById('start-menu');
    if(menu) menu.style.display = 'none';

    try {
        systemSounds.shutdown.currentTime = 0;
        systemSounds.shutdown.play().catch(err => console.log("Blokada audio:", err));
    } catch(e) {
        console.log("Błąd odtwarzacza:", e);
    }

    const shutdownScreen = document.getElementById('shutdown-screen');
    if(shutdownScreen) {
        shutdownScreen.classList.add('active');
    }

    setTimeout(() => {
        if(shutdownScreen) shutdownScreen.classList.add('pitch-black');
    }, 2200);

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3500);
}

// --- EASTER EGG: WIRUS PO 1 MINUTACH ---
setTimeout(() => {
    const virusWin = document.getElementById('win-virus');
    if (virusWin) {
        // Otwieramy okno wirusa
        virusWin.style.display = 'flex';
        
        // Centrujemy okno na ekranie, aby wyskoczyło idealnie na środku
        virusWin.style.top = '25%';
        virusWin.style.left = '35%';
        
        // Wywołujemy istniejącą funkcję focusu, żeby okno było na samym wierzchu
        if (typeof focusWindow === 'function') {
            focusWindow(virusWin);
        }
        
        // Opcjonalnie: zmienia status na pasku zadań na alert
        const taskbarStatus = document.getElementById('taskbar-status');
        if (taskbarStatus) {
            taskbarStatus.textContent = "⚠️ SYSTEM INFECTION DETECTED!";
            taskbarStatus.style.color = "#ff0055";
        }
    }
}, 60000); // 120000 ms = dokładnie 2 minuty