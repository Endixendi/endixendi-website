/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony, obsługuje menu i podstawowe funkcje
 */

// Globalne zmienne dla interwału i ikony, aby były dostępne wszędzie
let particleInterval = null;
let currentSeasonalIcon = "😎"; // Domyślna ikona awaryjna

(function () {
  'use strict';

  // Ścieżki do plików częściowych
  const MENU_PATH = "menu.html";
  const FOOTER_PATH = "footer.html";

  const MANUAL_THEMES = ["", "theme-red", "theme-green", "theme-blue"];
  const SEASONAL_THEMES = [
    "theme-birthday",
    "theme-new",
    "theme-winter",
    "theme-spring",
    "theme-summer",
    "theme-autumn",
    "theme-patriotic",
    "theme-youtube"
  ];

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
        updateFloatingTopBtn();
      })
    ]).catch(error => {
      console.error("Błąd podczas ładowania partiali:", error);
    });
  }

  /* ==========================================================================
     Pływający przycisk "Wróć na górę" z płynnym przewijaniem
     ========================================================================== */
  function updateFloatingTopBtn() {
    const floatingTopBtn = document.getElementById('js-floating-top');
    if (!floatingTopBtn) return;

    // Jeśli strona ma własny przycisk back-to-top (np. tools-all.html), nie dublujemy go
    const localBackToTop = document.getElementById('back-to-top-btn');
    if (localBackToTop) {
      floatingTopBtn.classList.remove('show');
      floatingTopBtn.style.display = 'none';
      return;
    }

    floatingTopBtn.style.display = '';
    if (window.scrollY > 300) {
      floatingTopBtn.classList.add('show');
    } else {
      floatingTopBtn.classList.remove('show');
    }
  }

  function initFloatingTopBtn() {
    window.addEventListener('scroll', updateFloatingTopBtn, { passive: true });
    window.addEventListener('resize', updateFloatingTopBtn, { passive: true });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#js-floating-top');
      if (!btn) return;
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    updateFloatingTopBtn();
  }

  /* =========================
     Inicjalizacja toggle menu (hamburger) i rozwijanie grup na mobilkach
     ========================= */
  function closeMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");

    if (mainNav) {
      mainNav.classList.remove("show");
      mainNav.style.display = "";
    }
    if (menuToggle) {
      menuToggle.textContent = "☰";
    }
    document.querySelectorAll(".dropdown.open").forEach(drop => {
      drop.classList.remove("open");
    });
  }

  function initMenuToggle() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");
    if (!menuToggle || !mainNav) return;

    const handleResize = () => {
      if (window.innerWidth > 1200) {
        closeMobileMenu();
      }
    };

    if (!menuToggle.dataset.bound) {
      menuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.innerWidth > 1200) return;

        const isOpen = mainNav.classList.toggle("show");
        mainNav.style.display = "";
        menuToggle.textContent = isOpen ? "✕" : "☰";
      });
      menuToggle.dataset.bound = "true";
    }

    if (!mainNav.dataset.linksBound) {
      mainNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          if (window.innerWidth <= 1200) {
            closeMobileMenu();
          }
        });
      });
      mainNav.dataset.linksBound = "true";
    }

    if (!window.__menuResizeBound) {
      window.addEventListener("resize", handleResize);
      window.__menuResizeBound = true;
    }

    handleResize();
  }

  function initDropdownDelegation() {
    if (document.__dropdownDelegationBound) return;
    document.__dropdownDelegationBound = true;

    document.addEventListener("click", (e) => {
      const dropBtn = e.target.closest(".dropbtn");
      if (dropBtn && window.innerWidth <= 1200) {
        e.preventDefault();
        const parentDropdown = dropBtn.closest(".dropdown");
        if (parentDropdown) {
          document.querySelectorAll(".dropdown").forEach(drop => {
            if (drop !== parentDropdown) {
              drop.classList.remove("open");
            }
          });
          parentDropdown.classList.toggle("open");
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
    if (donateBtn && !donateBtn.dataset.bound) {
      donateBtn.addEventListener("click", () => {
        window.open("https://tipply.pl/@endixendi", "_blank");
      });
      donateBtn.dataset.bound = "true";
    }
  }

  /* =========================
     Smooth scroll
     ========================= */
  function initSmoothScroll() {
    if (document.__smoothScrollBound) return;
    document.__smoothScrollBound = true;

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

      if (window.innerWidth <= 1200) {
        closeMobileMenu();
      }
    });
  }

  /* =========================
     Motywy: ręczne i sezonowe
     ========================= */
  function clearManualThemes() {
    document.body.classList.remove("theme-red", "theme-green", "theme-blue");
  }

  function clearSeasonalThemes() {
    document.body.classList.remove(...SEASONAL_THEMES);
  }

  function initThemeSystem() {
    const themes = [
      { class: "", text: "Styl: Kalendarz" },
      { class: "theme-red", text: "Styl: Czerwony" },
      { class: "theme-green", text: "Styl: Zielony" },
      { class: "theme-blue", text: "Styl: Niebieski" }
    ];

    let currentThemeIndex = parseInt(localStorage.getItem("theme-cycle-index") || "0", 10);
    if (isNaN(currentThemeIndex) || currentThemeIndex < 0 || currentThemeIndex >= themes.length) {
      currentThemeIndex = 0;
    }

    const redBtn = document.getElementById("red-theme-btn");

    const applyManualTheme = (index) => {
      clearManualThemes();
      clearSeasonalThemes();
      if (themes[index].class) {
        document.body.classList.add(themes[index].class);
      }
      localStorage.setItem("theme-cycle-index", String(index));

      if (redBtn) {
        const nextIndex = (index + 1) % themes.length;
        redBtn.textContent = themes[nextIndex].text;
      }

      if (typeof highlightActiveNav === "function") {
        highlightActiveNav();
      }
    };

    if (currentThemeIndex > 0) {
      applyManualTheme(currentThemeIndex);
      initSeasonalSystem(); // Upewnia się, że cząsteczki i święto są wyłączone
    } else {
      const isSpecialDayActive = initSeasonalSystem();
      if (!isSpecialDayActive) {
        applyManualTheme(0);
      } else if (redBtn) {
        redBtn.textContent = themes[1].text;
      }
    }

    if (redBtn && !redBtn.dataset.bound) {
      redBtn.addEventListener("click", () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;

        if (currentThemeIndex === 0) {
          localStorage.setItem("theme-cycle-index", "0");
          clearManualThemes();
          const isSpecialDayActive = initSeasonalSystem();
          if (!isSpecialDayActive) {
            applyManualTheme(0);
          } else {
            redBtn.textContent = themes[1].text;
            if (typeof highlightActiveNav === "function") {
              highlightActiveNav();
            }
          }
        } else {
          applyManualTheme(currentThemeIndex);
          initSeasonalSystem();
        }
      });
      redBtn.dataset.bound = "true";
    }
  }

  /* =========================
     Inicjalizacja wszystkich komponentów
     ========================= */
  function init() {
    const loader = document.getElementById("loader");
    if (loader) {
      setTimeout(() => {
        loader.classList.add("loader-hidden");
      }, 150);
    }

    loadPartials();
    checkForRedirects();
    initDonateButton();
    initSmoothScroll();
    initFloatingTopBtn();
    initDropdownDelegation();
    initThemeSystem();

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

function stopParticles() {
  if (particleInterval) {
    clearInterval(particleInterval);
    particleInterval = null;
  }
  document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
}

function initSeasonalSystem() {
  const currentThemeIndex = parseInt(localStorage.getItem("theme-cycle-index") || "0", 10);
  const toggleBtn = document.getElementById('toggle-effects-btn');

  // Jeśli użytkownik wybrał ręcznie kolor, kalendarz nie nadpisuje motywu
  if (currentThemeIndex > 0) {
    stopParticles();
    if (toggleBtn) toggleBtn.style.display = 'none';
    return false;
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

  if (eventInfo.active) {
    document.body.classList.remove("theme-red", "theme-green", "theme-blue");
    document.body.classList.remove(
      "theme-birthday", "theme-new", "theme-winter", "theme-spring",
      "theme-summer", "theme-autumn", "theme-patriotic", "theme-youtube"
    );

    document.body.classList.add(eventInfo.theme);
    currentSeasonalIcon = eventInfo.icon;

    if (toggleBtn) toggleBtn.style.display = 'block';

    if (localStorage.getItem('effects-disabled') === 'true') {
      document.body.classList.add('effects-off');
      if (toggleBtn) toggleBtn.innerText = "Włącz efekty";
      stopParticles();
    } else {
      document.body.classList.remove('effects-off');
      if (toggleBtn) toggleBtn.innerText = "Wyłącz efekty";
      startParticles(currentSeasonalIcon);
    }

    return true;
  }

  if (toggleBtn) toggleBtn.style.display = 'none';
  stopParticles();
  return false;
}

function startParticles(icon) {
  stopParticles();

  if (document.body.classList.contains('effects-off')) return;

  particleInterval = setInterval(() => {
    if (document.body.classList.contains('effects-off')) {
      stopParticles();
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
  localStorage.setItem('effects-disabled', String(isOff));

  const btn = document.getElementById('toggle-effects-btn');

  if (isOff) {
    if (btn) btn.innerText = "Włącz efekty";
    stopParticles();
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

  const allLinks = [
    "nav-home", "nav-tworczosc", "nav-pc", "nav-o-mnie",
    "nav-kontakt", "nav-gallery", "nav-tools", "nav-socials", "nav-games"
  ];
  allLinks.forEach(id => {
    const link = document.getElementById(id);
    if (link) {
      link.style.color = "";
      link.style.textShadow = "";
      link.style.opacity = "";
    }
  });

  if (currentPath.includes("dino.html") || currentPath.includes("tetris.html") || currentPath.includes("shooter.html") || currentPath.includes("statki.html")) {
    setActiveLink("nav-games");
  } else if (currentPath.includes("tools-rec.html") || currentPath.includes("tools-all.html") || currentPath.includes("linux.html")) {
    setActiveLink("nav-tools");
  } else if (currentPath.includes("gallery.html")) {
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