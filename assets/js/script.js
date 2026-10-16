/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony, obsługuje menu i podstawowe funkcje
 */

window.addEventListener("DOMContentLoaded", function() {
    const loader = document.getElementById("loader");
    if (loader) {
        setTimeout(() => {
            loader.classList.add("loader-hidden");
        }, 150);
    }
    
    // Bezpieczne uruchomienie systemu sezonowego
    if (typeof initSeasonalSystem === "function") {
        initSeasonalSystem();
    }
});

// Globalne zmienne dla interwału i ikony, aby były dostępne wszędzie
let particleInterval = null;
let currentSeasonalIcon = "😎"; // Domyślna ikona awaryjna

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
        highlightActiveNav(); 
      }),
      loadHTML("footer-placeholder", FOOTER_PATH).then(() => {
        state.footerLoaded = true;
      })
    ]).catch(error => {
      console.error("Błąd podczas ładowania partiali:", error);
    });
  }

  /* ==========================================================================
     Pływający przycisk "Wróć na górę" z płynnym przewijaniem
     ========================================================================== */
  function initFloatingTopBtn() {
    window.addEventListener('scroll', () => {
        const floatingTopBtn = document.getElementById('js-floating-top');
        
        if (floatingTopBtn) {
            if (window.scrollY > 300) {
                floatingTopBtn.classList.add('show');
            } else {
                floatingTopBtn.classList.remove('show');
            }
            
            if (!floatingTopBtn.dataset.hasListener) {
                floatingTopBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
                floatingTopBtn.dataset.hasListener = 'true';
            }
        }
    });
  }

  /* =========================
     Inicjalizacja toggle menu (hamburger)
     ========================= */
  function initMenuToggle() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");
    
    if (!menuToggle || !mainNav) return;

    const updateMenuVisibility = () => {
      if (window.innerWidth <= 1200) {
        mainNav.style.display = "none";
      } else {
        mainNav.style.display = "";
      }
    };

    updateMenuVisibility();

    menuToggle.addEventListener("click", () => {
      const isVisible = window.getComputedStyle(mainNav).display !== "none";
      mainNav.style.display = isVisible ? "none" : "flex";
    });

    const navLinks = mainNav.querySelectorAll("a");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1200) {
          mainNav.style.display = "none";
        }
      });
    });

    window.addEventListener("resize", updateMenuVisibility);
  }
  
  /* =========================
     Otwieranie menu i rozwijanie grup na mobilkach
     ========================= */
  function initGlobalClickDelegation() {
    document.addEventListener("click", (e) => {
      if (e.target.id === "menu-toggle") {
        const mainNav = document.getElementById("main-nav");
        if (mainNav) {
          mainNav.classList.toggle("show");
          e.target.textContent = mainNav.classList.contains("show") ? "✕" : "☰";
        }
      }
      
      if (e.target.classList.contains("dropbtn") || e.target.closest(".dropbtn")) {
        if (window.innerWidth <= 1200) {
          e.preventDefault();
          
          const targetBtn = e.target.classList.contains("dropbtn") ? e.target : e.target.closest(".dropbtn");
          const parentDropdown = targetBtn.closest(".dropdown");
          
          if (parentDropdown) {
            document.querySelectorAll(".dropdown").forEach(drop => {
              if (drop !== parentDropdown) {
                drop.classList.remove("open");
              }
            });
            parentDropdown.classList.toggle("open");
          }
        }
      }
    });
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
        window.open("https://tipply.pl/@endixendi", "_blank");
      });
    }
  }

  /* =========================
     Smooth scroll
     ========================= */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      const trigger = e.target.closest("a, [data-scroll]");
      if (!trigger) return;

      let targetHash = trigger.getAttribute("data-scroll");
      
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

      const targetElement = document.querySelector(targetHash);
      if (!targetElement) return;

      e.preventDefault();
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      history.pushState(null, null, targetHash);
      if (typeof highlightActiveNav === "function") {
         highlightActiveNav();
      }

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
    initFloatingTopBtn();
    initGlobalClickDelegation();
    
    // --- LOGIKA CYKLICZNEJ ZMIANY STYLÓW ---
    const redBtn = document.getElementById("red-theme-btn");
    if (redBtn) {
        // Dokładna tablica 4 stanów z jasnymi opisami dla kolejnych kliknięć
        const themes = [
            { class: "", text: "Styl: Kalendarz" },       			// Stan 0: Jesteśmy w trybie domyślnym lub kalendarza
            { class: "theme-red", text: "Styl: Czerwony" },         // Stan 1: Jesteśmy w stylu czerwonym
            { class: "theme-green", text: "Styl: Zielony" },        // Stan 2: Jesteśmy w stylu zielonym
            { class: "theme-blue", text: "Styl: Niebieski" }        // Stan 3: Jesteśmy w stylu niebieskim (wymuszonym)
        ];

        // 1. Sprawdzamy kalendarz jako pierwsi
        const isSpecialDayActive = initSeasonalSystem();

        // 2. Pobieramy zapisany stan z pamięci
        let currentThemeIndex = parseInt(localStorage.getItem("theme-cycle-index") || "0", 10);
        if (isNaN(currentThemeIndex) || currentThemeIndex >= themes.length) currentThemeIndex = 0;
        
        const applyTheme = (index) => {
            // Usuwamy wszystkie klasy motywów ręcznych
            document.body.classList.remove("theme-red", "theme-green", "theme-blue");

            // Dodajemy nową klasę, jeśli istnieje
            if (themes[index].class) {
                document.body.classList.add(themes[index].class);
            }

            // Zapisujemy indeks w pamięci
            localStorage.setItem("theme-cycle-index", index);

            // Ustawiamy tekst na przycisku tak, aby informował, co stanie się po KLIKNIĘCIU
            const nextIndex = (index + 1) % themes.length;
            redBtn.textContent = themes[nextIndex].text;

            if (typeof highlightActiveNav === "function") {
                highlightActiveNav();
            }
        };

        // 3. Aplikujemy styl natychmiast przy starcie strony (żeby nie było rozjeżdżania kolorów)
        if (!isSpecialDayActive) {
            applyTheme(currentThemeIndex);
        } else {
            // Jeśli kalendarz ma święto, przycisk pokazuje opcję przejścia do czerwonego
            redBtn.textContent = themes[1].text;
        }

        redBtn.addEventListener("click", () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            
            // Jeśli użytkownik klika w trakcie święta, zdejmujemy motyw daty
            if (isSpecialDayActive) {
                document.body.classList.remove("theme-birthday", "theme-new", "theme-winter", "theme-spring", "theme-summer", "theme-autumn", "theme-patriotic", "theme-youtube");
            }

            applyTheme(currentThemeIndex);

            // Jeśli wróciliśmy do stanu 0 (auto/kalendarz), odświeżamy system sezonowy
            if (currentThemeIndex === 0) {
                if (particleInterval) {
                    clearInterval(particleInterval);
                    particleInterval = null;
                }
                document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
                initSeasonalSystem();
            }
        });
    }
    
    window.addEventListener("hashchange", checkForRedirects);
  }

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

function initSeasonalSystem() {
	// 1. Sprawdzamy czy użytkownik ma włączony ręczny styl (1 = czerwony, 2 = zielony)
    const currentThemeIndex = parseInt(localStorage.getItem("theme-cycle-index") || "0", 10);
    
    // JEŚLI UŻYTKOWNIK WYBRAŁ RĘCZNIE KOLOR, TO KALENDARZ MILCZY I NIE NADPISUJE NICZEGO!
    if (currentThemeIndex > 0) {
        if (particleInterval) { 
            clearInterval(particleInterval); 
            particleInterval = null; 
        }
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        return false; // Zwracamy false, bo kalendarz jest zablokowany przez wybór użytkownika
    }
	
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateStr = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`;

    const easter = getEaster(year);
    const easterMon = new Date(easter); easterMon.setDate(easter.getDate() + 1);
    const zieloneSwiatki = new Date(easter); zieloneSwiatki.setDate(easter.getDate() + 49);
    const bozeCialo = new Date(easter); bozeCialo.setDate(easter.getDate() + 60);

    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();

    const toggleBtn = document.getElementById('toggle-effects-btn');
    if (toggleBtn) toggleBtn.style.display = 'none';

    let eventInfo = { theme: "", icon: "", active: false };

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
    else {
        if (month === 3 && day === 21) {
            eventInfo = { theme: "theme-spring", icon: "🌱", active: true };
        } else if (month === 6 && day === 21) {
            eventInfo = { theme: "theme-summer", icon: "☀️", active: true };
        } else if (month === 9 && day === 23) {
            eventInfo = { theme: "theme-autumn", icon: "🍂", active: true };
        } else if (month === 12 && day === 21) {
            eventInfo = { theme: "theme-winter", icon: "❄️", active: true };
        }
    }

    // JEŚLI JEST SPECJALNY DZIEŃ -> MA PIERWSZEŃSTWO
    if (eventInfo.active) {
        // Usuwamy ręczne style, żeby data rządziła
        document.body.classList.remove("theme-red", "theme-green");
        localStorage.removeItem("theme-cycle-index");

        document.body.classList.add(eventInfo.theme);
        currentSeasonalIcon = eventInfo.icon;

        if (toggleBtn) toggleBtn.style.display = 'block';

        if (localStorage.getItem('effects-disabled') === 'true') {
            document.body.classList.add('effects-off');
            if (toggleBtn) toggleBtn.innerText = "Włącz efekty";
            if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
            document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        } else {
            document.body.classList.remove('effects-off');
            if (toggleBtn) toggleBtn.innerText = "Wyłącz efekty";
            startParticles(currentSeasonalIcon);
        }
        
        return true; // Informujemy, że motyw kalendarzowy jest aktywny
    } else {
        if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        return false;
    }
}

function startParticles(icon) {
    if (particleInterval) {
        clearInterval(particleInterval);
    }

    if (document.body.classList.contains('effects-off')) return;

    particleInterval = setInterval(() => {
        if (document.body.classList.contains('effects-off')) {
            if (particleInterval) {
                clearInterval(particleInterval);
                particleInterval = null;
            }
            return;
        }

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

    const btn = document.getElementById('toggle-effects-btn');

    if (isOff) {
        if (btn) btn.innerText = "Włącz efekty";
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = null;
        }
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
    } else {
        if (btn) btn.innerText = "Wyłącz efekty";
        startParticles(currentSeasonalIcon);
    }
}

window.toggleEffects = toggleEffects;

/* ==========================================================================
   SYSTEM PODŚWIETLANIA AKTYWNEJ ZAKŁADKI W MENU
   ========================================================================== */
function highlightActiveNav() {
    const currentPath = window.location.pathname.toLowerCase();
    const currentHash = window.location.hash.toLowerCase();

    const allLinks = ["nav-home", "nav-tworczosc", "nav-pc", "nav-o-mnie", "nav-kontakt", "nav-gallery", "nav-tools", "nav-socials", "nav-games"];
    allLinks.forEach(id => {
        const link = document.getElementById(id);
        if (link) {
            link.style.color = "";        
            link.style.textShadow = "";   
        }
    });

    if (currentPath.includes("dino.html") || currentPath.includes("tetris.html") || currentPath.includes("shooter.html") || currentPath.includes("statki.html")) {
        setActiveLink("nav-games");
    } 
    else if (currentPath.includes("tools-rec.html") || currentPath.includes("tools-all.html") || currentPath.includes("linux.html")) {
        setActiveLink("nav-tools");
    } 
    else if (currentPath.includes("gallery.html")) {
        setActiveLink("nav-gallery");
    } else if (currentHash === "#tworczosc") {
        setActiveLink("nav-tworczosc");
    } else if (currentHash === "#pc") {
        setActiveLink("nav-pc");
    } else if (currentHash === "#o-mnie") {
        setActiveLink("nav-o-mnie");
    } else if (currentHash === "#kontakt") {
        setActiveLink("nav-kontakt");
    } else if (currentHash === "#spotify") {
        setActiveLink("nav-socials");
    } else if (currentPath === "/" || currentPath.includes("index.html") || currentHash === "#home" || currentHash === "") {
        setActiveLink("nav-home");
    }

    function setActiveLink(activeId) {
        const link = document.getElementById(activeId);
        if (link) {
            link.style.color = "var(--accent)"; 
            link.style.textShadow = "0 0 10px var(--accent)"; 
            link.style.opacity = "1"; 
        }
    }
}

window.addEventListener("hashchange", highlightActiveNav);

// --- SYSTEM ZAKAMUFLOWANEGO INTERFEJSU PANELÓW (INDEX) ---
function initSitePanels() {
    const leftPanel = document.getElementById("navigation-left-panel");
    const rightPanel = document.getElementById("navigation-right-panel");
    const mobilePanel = document.getElementById("mobile-sticky-footer");

    const availableIds = ["goldsaver", "dc", "instant", "tipply", "cs"];

    if (leftPanel && rightPanel && window.innerWidth > 1200) {
        const idLeft = availableIds[Math.floor(Math.random() * availableIds.length)];
        let idRight = availableIds[Math.floor(Math.random() * availableIds.length)];

        if (availableIds.length > 1 && idLeft === idRight) {
            while (idLeft === idRight) {
                idRight = availableIds[Math.floor(Math.random() * availableIds.length)];
            }
        }

        const activeLeft = leftPanel.querySelector(`.shortcut-item[data-id="${idLeft}"]`);
        if (activeLeft) activeLeft.classList.add("is-active");

        const activeRight = rightPanel.querySelector(`.shortcut-item[data-id="${idRight}"]`);
        if (activeRight) activeRight.classList.add("is-active");

        leftPanel.style.display = "block";
        rightPanel.style.display = "block";
    }

    if (mobilePanel && window.innerWidth <= 1200) {
        setTimeout(() => {
            const idMobile = availableIds[Math.floor(Math.random() * availableIds.length)];
            const activeMobile = mobilePanel.querySelector(`.shortcut-item[data-id="${idMobile}"]`);
            
            if (activeMobile) activeMobile.classList.add("is-active");
            
            mobilePanel.style.setProperty("display", "block", "important");
        }, 50);
    }
}

function dismissPanel(elementId) {
    const target = document.getElementById(elementId);
    if (target) {
        target.style.setProperty("display", "none", "important");
    }
}

document.addEventListener("DOMContentLoaded", initSitePanels);