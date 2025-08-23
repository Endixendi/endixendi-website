(function () {
  const MENU_PATH = "menu.html";     // Ścieżka do pliku z menu
  const FOOTER_PATH = "footer.html"; // Ścieżka do pliku ze stopką

  /* =========================
     Helper: wczytaj HTML do kontenera
     ========================= */
  function loadHTML(targetId, path, cb) {
    const target = document.getElementById(targetId);
    if (!target) return Promise.resolve();

    return fetch(path)
      .then((res) =>
        res.ok ? res.text() : Promise.reject(`Fetch ${path} failed: ${res.status}`)
      )
      .then((html) => {
        target.innerHTML = html;          // Wstawiamy HTML do kontenera
        if (typeof cb === "function") cb(); // Jeśli podany callback, uruchom go
      })
      .catch((err) => console.error("Błąd ładowania:", path, err));
  }

  /* =========================
     Ładowanie partiali (menu + footer)
     ========================= */
  function loadPartials() {
    loadHTML("menu-placeholder", MENU_PATH, initMenuToggle); // wczytaj menu i zainicjuj toggle
    loadHTML("footer-placeholder", FOOTER_PATH);             // wczytaj stopkę
  }
  document.addEventListener("DOMContentLoaded", loadPartials);

  /* =========================
     Redirecty (hash i ścieżki)
     ========================= */
  function maybeRedirect() {
    if (
      location.hash === "#social" ||   // np. link do #social
      location.hash === "#media"  ||   // lub do #media
      location.pathname.endsWith("/social") // lub ścieżka /social
    ) {
      // Przekierowanie na linktr.ee
      window.location.replace("https://linktr.ee/endixendi");
    }
  }
  maybeRedirect();
  window.addEventListener("hashchange", maybeRedirect);

  /* =========================
     Obsługa przycisku Donate
     ========================= */
  function initDonate() {
    const donateBtn = document.getElementById("donate-btn");
    if (donateBtn) {
      donateBtn.addEventListener("click", () => {
        // Otwórz stronę donacji w nowej karcie
        window.open("https://streamelements.com/endixendi/tip", "_blank");
      });
    }
  }
  document.addEventListener("DOMContentLoaded", initDonate);

  /* =========================
     Smooth scroll (delegacja zdarzeń)
     =========================
     Obsługuje:
      - <a href="#pc">...</a>
      - <a href="index.html#pc">...</a>
      - <button data-scroll="#pc">...</button>
     ========================= */
  function initSmoothScrollDelegated() {
    const normalizePath = (p) =>
      p.replace(/\/index\.html$/i, "").replace(/\/$/, "");

    document.addEventListener("click", function (e) {
      // Szukamy klikniętego elementu, który jest linkiem lub ma data-scroll
      const trigger = e.target.closest("a, [data-scroll]");
      if (!trigger) return;

      // 1) Priorytet: atrybut data-scroll (np. przyciski)
      let hash = trigger.getAttribute("data-scroll");

      // 2) Jeśli to <a>, wyciągamy hash z href
      if (!hash && trigger.tagName.toLowerCase() === "a") {
        const rawHref = trigger.getAttribute("href");
        if (!rawHref || !rawHref.includes("#")) return; // brak kotwicy -> nic nie robimy

        const url = new URL(rawHref, location.href);

        // Scrollujemy tylko, jeśli link prowadzi na TĘ SAMĄ stronę
        const samePage =
          normalizePath(url.pathname) === normalizePath(location.pathname);
        if (!samePage) return;

        hash = url.hash; // np. "#pc"
      }

      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      // Gładkie przewijanie do elementu
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      // Zamknij mobilne menu po kliknięciu linku
      const mainNav = document.getElementById("main-nav");
      if (mainNav && window.innerWidth <= 1200) {
        mainNav.style.display = "none";
      }
    });
  }
  document.addEventListener("DOMContentLoaded", initSmoothScrollDelegated);

  /* =========================
     Obsługa hamburgera (toggle menu)
     =========================
     Uruchamiana po załadowaniu menu.html
     ========================= */
  function initMenuToggle() {
    const menuToggle = document.getElementById("menu-toggle"); // ikona ☰
    const mainNav = document.getElementById("main-nav");       // całe menu
    if (!menuToggle || !mainNav) return;

    // Ustaw stan początkowy menu
    if (window.innerWidth <= 1200) {
      mainNav.style.display = "none";  // na mobile domyślnie ukryte
    } else {
      mainNav.style.display = "";      // na desktopie widoczne
    }

    // Kliknięcie ikony hamburgera
    menuToggle.addEventListener("click", () => {
      const computed = window.getComputedStyle(mainNav).display;
      mainNav.style.display = computed === "none" ? "flex" : "none";
    });

    // Zamknij menu po kliknięciu linku (tylko na mobile)
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1200) {
          mainNav.style.display = "none";
        }
      });
    });

    // Reakcja na zmianę rozmiaru okna
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1200) {
        mainNav.style.display = ""; // desktop -> zawsze widoczne
      } else if (window.getComputedStyle(mainNav).display !== "flex") {
        mainNav.style.display = "none"; // mobile -> ukryte
      }
    });
  }
})();