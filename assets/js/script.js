/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony, obsługuje menu i podstawowe funkcje
 * @version 1.0
 */

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