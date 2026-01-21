/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony, obsługuje menu i podstawowe funkcje
 * @version 1.0
 */

window.addEventListener("load", function() {
    const loader = document.getElementById("loader");
    // Dodajemy klasę, która sprawi, że loader zniknie płynnie
    loader.classList.add("loader-hidden");
});

(function () {
  'use strict';
  
  // Ścieżki do plików częściowych
  const MENU_PATH = "menu.html";
  const FOOTER_PATH = "footer.html";
  
  // Stan aplikacji
  const state = {
    menuLoaded: false,
    footerLoaded: false
  };

  /* =========================
     Helper: wczytaj HTML do kontenera
     ========================= */
  function loadHTML(targetId, path) {
    return new Promise((resolve, reject) => {
      const target = document.getElementById(targetId);
      if (!target) {
        resolve();
        return;
      }

      fetch(path)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Fetch ${path} failed: ${response.status}`);
          }
          return response.text();
        })
        .then(html => {
          target.innerHTML = html;
          resolve();
        })
        .catch(error => {
          console.error("Błąd ładowania:", path, error);
          reject(error);
        });
    });
  }

  /* =========================
     Ładowanie partiali (menu + footer)
     ========================= */
  function loadPartials() {
    Promise.all([
      loadHTML("menu-placeholder", MENU_PATH).then(() => {
        state.menuLoaded = true;
        initMenuToggle();
      }),
      loadHTML("footer-placeholder", FOOTER_PATH).then(() => {
        state.footerLoaded = true;
      })
    ]).catch(error => {
      console.error("Błąd podczas ładowania partiali:", error);
    });
  }

  /* =========================
     Inicjalizacja toggle menu (hamburger)
     ========================= */
  function initMenuToggle() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");
    
    if (!menuToggle || !mainNav) return;

    // Ustaw stan początkowy menu
    const updateMenuVisibility = () => {
      if (window.innerWidth <= 1200) {
        mainNav.style.display = "none";
      } else {
        mainNav.style.display = "";
      }
    };

    updateMenuVisibility();

    // Kliknięcie ikony hamburgera
    menuToggle.addEventListener("click", () => {
      const isVisible = window.getComputedStyle(mainNav).display !== "none";
      mainNav.style.display = isVisible ? "none" : "flex";
    });

    // Zamknij menu po kliknięciu linku (tylko na mobile)
    const navLinks = mainNav.querySelectorAll("a");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1200) {
          mainNav.style.display = "none";
        }
      });
    });

    // Reakcja na zmianę rozmiaru okna
    window.addEventListener("resize", updateMenuVisibility);
  }

  /* =========================
     Redirecty (hash i ścieżki)
     ========================= */
  function checkForRedirects() {
    const shouldRedirect = (
      location.hash === "#social" ||
      location.hash === "#media" ||
      location.pathname.endsWith("/social")
    );
    
    if (shouldRedirect) {
      window.location.replace("https://linktr.ee/endixendi");
    }
  }

  /* =========================
     Obsługa przycisku Donate
     ========================= */
  function initDonateButton() {
    const donateBtn = document.getElementById("donate-btn");
    if (donateBtn) {
      donateBtn.addEventListener("click", () => {
        window.open("https://streamelements.com/endixendi/tip", "_blank");
      });
    }
  }

  /* =========================
     Smooth scroll (delegacja zdarzeń)
     ========================= */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      const trigger = e.target.closest("a, [data-scroll]");
      if (!trigger) return;

      // Pobierz cel scrollowania
      let targetHash = trigger.getAttribute("data-scroll");
      
      // Dla linków <a>, sprawdź czy hash jest w bieżącej stronie
      if (!targetHash && trigger.tagName === "A") {
        const href = trigger.getAttribute("href");
        if (!href || !href.includes("#")) return;
        
        try {
          const url = new URL(href, window.location.href);
          if (url.pathname !== window.location.pathname) return;
          targetHash = url.hash;
        } catch (error) {
          console.error("Błąd parsowania URL:", error);
          return;
        }
      }

      if (!targetHash || targetHash === "#") return;

      // Znajdź element docelowy
      const targetElement = document.querySelector(targetHash);
      if (!targetElement) return;

      // Wykonaj płynne przewijanie
      e.preventDefault();
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      // Zamknij mobilne menu po kliknięciu
      const mainNav = document.getElementById("main-nav");
      if (mainNav && window.innerWidth <= 1200) {
        mainNav.style.display = "none";
      }
    });
  }

  /* =========================
     Inicjalizacja wszystkich komponentów
     ========================= */
  function init() {
    loadPartials();
    checkForRedirects();
    initDonateButton();
    initSmoothScroll();
    
    // Nasłuchuj zmian hash dla redirectów
    window.addEventListener("hashchange", checkForRedirects);
  }

  // Uruchom inicjalizację gdy DOM jest gotowy
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// --- FUNKCJA OBLICZAJĄCA WIELKANOC ---
function getEaster(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100,
          d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
          g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
          i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
          m = Math.floor((a + 11 * h + 22 * l) / 451),
          month = Math.floor((h + l - 7 * m + 114) / 31),
          day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

let particleInterval;

function initSeasonalSystem() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateStr = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`;

    // Daty ruchome
    const easter = getEaster(year);
    const easterMon = new Date(easter); easterMon.setDate(easter.getDate() + 1);
    const zieloneSwiatki = new Date(easter); zieloneSwiatki.setDate(easter.getDate() + 49);
    const bozeCialo = new Date(easter); bozeCialo.setDate(easter.getDate() + 60);

    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();

    let eventInfo = { theme: "", icon: "", active: false };

    // --- SPRAWDZANIE ŚWIĄT ---
    if (dateStr === "07.06") eventInfo = { theme: "theme-birthday", icon: "🎁", active: true };
    else if (dateStr === "01.01") eventInfo = { theme: "theme-new", icon: "🎆", active: true };
    else if (dateStr === "06.01") eventInfo = { theme: "theme-winter", icon: "👑", active: true };
    else if (isSameDay(now, easter)) eventInfo = { theme: "theme-spring", icon: "🐣", active: true };
    else if (isSameDay(now, easterMon)) eventInfo = { theme: "theme-spring", icon: "💧", active: true };
    else if (dateStr === "01.05") eventInfo = { theme: "theme-patriotic", icon: "🛠️", active: true };
    else if (dateStr === "03.05") eventInfo = { theme: "theme-patriotic", icon: "🇵🇱", active: true };
    else if (isSameDay(now, zieloneSwiatki)) eventInfo = { theme: "theme-spring", icon: "🌿", active: true };
    else if (isSameDay(now, bozeCialo)) eventInfo = { theme: "theme-spring", icon: "🌸", active: true };
	else if (dateStr === "07.07") eventInfo = { theme: "theme-youtube", icon: "🎬", active: true };
    else if (dateStr === "15.08") eventInfo = { theme: "theme-patriotic", icon: "🎖️", active: true };
    else if (dateStr === "01.11") eventInfo = { theme: "theme-autumn", icon: "🕯️", active: true };
    else if (dateStr === "11.11") eventInfo = { theme: "theme-patriotic", icon: "🇵🇱", active: true };
    else if (dateStr === "24.12") eventInfo = { theme: "theme-winter", icon: "🎄", active: true };
    else if (dateStr === "25.12" || dateStr === "26.12") eventInfo = { theme: "theme-winter", icon: "🎅", active: true };
    
    // --- PORY ROKU (Jeśli nie ma święta) ---
    else {
        if ((month === 3 && day >= 21)) 
            eventInfo = { theme: "theme-spring", icon: "🌱", active: true };
        else if ((month === 6 && day >= 21)) 
            eventInfo = { theme: "theme-summer", icon: "☀️", active: true };
        else if ((month === 9 && day >= 23)) 
            eventInfo = { theme: "theme-autumn", icon: "🍂", active: true };
        else if ((month === 12 && day >= 21))
            eventInfo = { theme: "theme-winter", icon: "❄️", active: true };
    }

    // Aplikowanie motywu
    if (eventInfo.active) {
        document.body.classList.add(eventInfo.theme);
        // Pokaż przycisk wyłączania
        const toggleBtn = document.getElementById('toggle-effects-btn');
        if (toggleBtn) toggleBtn.style.display = 'block';

        // Sprawdź czy użytkownik wcześniej nie wyłączył
        if (localStorage.getItem('effects-disabled') === 'true') {
            document.body.classList.add('effects-off');
        } else {
            startParticles(eventInfo.icon);
        }
    }
}

function startParticles(icon) {
    particleInterval = setInterval(() => {
        if (document.body.classList.contains('effects-off')) return;
        const p = document.createElement('div');
        p.className = 'seasonal-particle';
        p.innerText = icon;
        p.style.left = Math.random() * 100 + "vw";
        p.style.animationDuration = (Math.random() * 3 + 2) + "s";
        p.style.fontSize = (Math.random() * 15 + 10) + "px";
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 5000);
    }, 400);
}

function toggleEffects() {
    const isOff = document.body.classList.toggle('effects-off');
    localStorage.setItem('effects-disabled', isOff);
}

// Loader
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('loader-hidden');
    }, 1500);
    initSeasonalSystem();
});