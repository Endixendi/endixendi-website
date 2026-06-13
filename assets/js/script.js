/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony, obsługuje menu i podstawowe funkcje
 */

window.addEventListener("load", function() {
    const loader = document.getElementById("loader");
    if (loader) {
        loader.classList.add("loader-hidden");
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
        // Podświetlenie zakładki odpali się natychmiast po wczytaniu menu.html
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
   Pływający przycisk "Wróć na górę" - Zoptymalizowany pod kątem bindowania
   ========================================================================== */
  function initFloatingTopBtn() {
    const floatingTopBtn = document.getElementById('js-floating-top');
    if (!floatingTopBtn) return;

    // Rejestrujemy kliknięcie tylko RAZ przy inicjalizacji, poza eventem scroll
    floatingTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Event scroll odpowiada TYLKO za pokazywanie/ukrywanie klasy klas wizualnych
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            floatingTopBtn.classList.add('show');
        } else {
            floatingTopBtn.classList.remove('show');
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
     Delegacja zdarzeń kliknięcia dla menu mobilnego
     ========================= */
  function initGlobalClickDelegation() {
    document.addEventListener("click", (e) => {
      
      // 1. OBSŁUGA HAMBURGERA
      if (e.target.id === "menu-toggle") {
        const mainNav = document.getElementById("main-nav");
        if (mainNav) {
          mainNav.classList.toggle("show");
          e.target.textContent = mainNav.classList.contains("show") ? "✕" : "☰";
        }
      }
      
      // 2. OBSŁUGA ROZWIJANIA GRUP NA TELEFONIE
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
     Smooth scroll (delegacja zdarzeń)
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
  
    // --- LOGIKA DLA CZERWONEGO PRZYCISKU ---
    const redBtn = document.getElementById("red-theme-btn");
    if (redBtn) {
        redBtn.addEventListener("click", () => {
            const isRed = document.body.classList.toggle("theme-red");
            localStorage.setItem("theme-red-active", isRed);
            
            if (isRed) {
                redBtn.textContent = "Wygląd fabryczny";
                Array.from(document.body.classList).forEach(className => {
                    if (className.startsWith("theme-") && className !== "theme-red") {
                        document.body.classList.remove(className);
                    }
                });
            } else {
                redBtn.textContent = "Włącz czerwony styl";
                if (particleInterval) {
                    clearInterval(particleInterval);
                    particleInterval = null;
                }
                document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());

                if (typeof initSeasonalSystem === "function") {
                    initSeasonalSystem();
                }
            }
            
            if (typeof highlightActiveNav === "function") {
                highlightActiveNav();
            }
        });
    }
    
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

function initSeasonalSystem() {
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

    const redBtn = document.getElementById("red-theme-btn");
    const toggleBtn = document.getElementById('toggle-effects-btn');
    
    if (toggleBtn) toggleBtn.style.display = 'none';

    if (localStorage.getItem("theme-red-active") === "true") {
        document.body.classList.add("theme-red");
        if (redBtn) redBtn.textContent = "Wygląd fabryczny";
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (particleInterval) { 
            clearInterval(particleInterval); 
            particleInterval = null; 
        }
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        return; 
    } else {
        if (redBtn) redBtn.textContent = "Włącz czerwony styl";
    }

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
        } else {
            if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
            document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        }
    }

    if (eventInfo.active) {
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

window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        if (loader) loader.classList.add('loader-hidden');
    }, 1500);
    initSeasonalSystem();
});

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

    const pathMapping = {
        "dino.html": "nav-games",
        "tetris.html": "nav-games",
        "shooter.html": "nav-games",
        "statki.html": "nav-games",
        "tools-rec.html": "nav-tools",
        "tools-all.html": "nav-tools",
        "linux.html": "nav-tools",
        "gallery.html": "nav-gallery"
    };

    const hashMapping = {
        "#tworczosc": "nav-tworczosc",
        "#pc": "nav-pc",
        "#o-mnie": "nav-o-mnie",
        "#kontakt": "nav-kontakt",
        "#spotify": "nav-socials" 
    };

    const matchedPathKey = Object.keys(pathMapping).find(key => currentPath.includes(key));

    if (matchedPathKey) {
        setActiveLink(pathMapping[matchedPathKey]);
    } else if (hashMapping[currentHash]) {
        setActiveLink(hashMapping[currentHash]);
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