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
			// TUTAJ DOPISUJEMY: Podświetlenie zakładki odpali się natychmiast po wczytaniu menu.html
			highlightActiveNav(); 
		  }),
		  loadHTML("footer-placeholder", FOOTER_PATH).then(() => {
			state.footerLoaded = true;
		  })
		]).catch(error => {
		  console.error("Błąd podczas ładowania partiali:", error);
		});
	}
  
  /* =========================
   Pływający przycisk "Wróć na górę" (Dla dynamicznej stopki)
   ========================= */
	window.addEventListener('scroll', () => {
		const floatingTopBtn = document.getElementById('js-floating-top');
		
		// Jeśli stopka się już załadowała i przycisk istnieje w dokumencie
		if (floatingTopBtn) {
			if (window.scrollY > 300) {
				floatingTopBtn.classList.add('show');
			} else {
				floatingTopBtn.classList.remove('show');
			}
		}
	});

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
     Otwieranie całego menu na telefonie oraz rozwijanie podkategorii po kliknięciu
     ========================= */
	document.addEventListener("DOMContentLoaded", () => {
		// Ponieważ menu ładuje się dynamicznie, nasłuchujemy kliknięć na całym dokumencie
		document.addEventListener("click", (e) => {
			
			// 1. OBSŁUGA HAMBURGERA
			if (e.target.id === "menu-toggle") {
				const mainNav = document.getElementById("main-nav");
				if (mainNav) {
					mainNav.classList.toggle("show");
					
					// Zmiana ikony na krzyżyk po otwarciu, i z powrotem na hamburger po zamknięciu
					if (mainNav.classList.contains("show")) {
						e.target.textContent = "✕";
					} else {
						e.target.textContent = "☰";
					}
				}
			}
			
			// 2. OBSŁUGA ROZWIJANIA GRUP (Narzędzia, Sociale, Gry) NA TELEFONIE
			// Skrypt zadziała bez względu na to, czy to tag <a> czy <button>
			if (e.target.classList.contains("dropbtn") || e.target.closest(".dropbtn")) {
				// Reaguj tylko na ekranach mobilnych (poniżej 1200px)
				if (window.innerWidth <= 1200) {
					e.preventDefault(); // Zatrzymuje domyślne akcje (np. podskakiwanie strony)
					
					const targetBtn = e.target.classList.contains("dropbtn") ? e.target : e.target.closest(".dropbtn");
					const parentDropdown = targetBtn.closest(".dropdown");
					
					if (parentDropdown) {
						// Zamknij inne otwarte podmenu, żeby nie nachodziły na siebie
						document.querySelectorAll(".dropdown").forEach(drop => {
							if (drop !== parentDropdown) {
								drop.classList.remove("open");
							}
						});
						
						// Otwórz lub zamknij kliknięte podmenu
						parentDropdown.classList.toggle("open");
					}
				}
			}
		});
	});

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
     Smooth scroll (delegacja zdarzeń) - POPRAWIONY URL
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

      // --- POPRAWKA: Aktualizujemy adres URL w przeglądarce i ręcznie wywołujemy podświetlenie ---
      history.pushState(null, null, targetHash);
      if (typeof highlightActiveNav === "function") {
         highlightActiveNav();
      }

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
	
	// --- LOGIKA DLA CZERWONEGO PRZYCISKU (Zmiany na czerwony styl) ---
    const redBtn = document.getElementById("red-theme-btn");
    if (redBtn) {
        redBtn.addEventListener("click", () => {
            const isRed = document.body.classList.toggle("theme-red");
            
            // Zapisujemy stan (true/false) do pamięci przeglądarki
            localStorage.setItem("theme-red-active", isRed);
            
            if (isRed) {
                redBtn.textContent = "Wygląd fabryczny";
                
                // Czyszczenie innych motywów, żeby się nie gryzły
                Array.from(document.body.classList).forEach(className => {
                    if (className.startsWith("theme-") && className !== "theme-red") {
                        document.body.classList.remove(className);
                    }
                });
            } else {
                redBtn.textContent = "Włącz czerwony styl";
                
                // ZABEZPIECZENIE: Czyścimy stary stoper i cząsteczki przed przywróceniem święta
                if (particleInterval) {
                    clearInterval(particleInterval);
                    particleInterval = null;
                }
                document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());

                // Po wyłączeniu czerwonego, ponownie odpalamy system sezonowy
                if (typeof initSeasonalSystem === "function") {
                    initSeasonalSystem();
                }
            }
            
            if (typeof highlightActiveNav === "function") {
                highlightActiveNav();
            }
        });
    }
    
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

    const redBtn = document.getElementById("red-theme-btn");
    const toggleBtn = document.getElementById('toggle-effects-btn');
    
    // Na start ukrywamy przycisk efektów (pokażemy go tylko, jeśli jest autentyczne święto)
    if (toggleBtn) toggleBtn.style.display = 'none';

    // === SPRAWDZANIE CZERWONEGO MOTYWU NA KAŻDEJ PODSTRONIE ===
    if (localStorage.getItem("theme-red-active") === "true") {
        document.body.classList.add("theme-red");
        
        if (redBtn) redBtn.textContent = "Wygląd fabryczny";
        
        // ZABEZPIECZENIE: Zwykła zmiana koloru nie ma efektów, 
        // więc chowamy przycisk i upewniamy się, że stary stoper cząsteczek jest wyłączony.
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (particleInterval) { 
            clearInterval(particleInterval); 
            particleInterval = null; 
        }
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
        
        return; // Przerywamy dalsze sprawdzanie – ręczny czerwony styl blokuje efekty kalendarzowe
    } else {
        if (redBtn) redBtn.textContent = "Włącz czerwony styl";
    }
    // ==============================================================

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
        if (month === 3 && day === 21) {
            eventInfo = { theme: "theme-spring", icon: "🌱", active: true };
        } else if (month === 6 && day === 21) {
            eventInfo = { theme: "theme-summer", icon: "☀️", active: true };
        } else if (month === 9 && day === 23) {
            eventInfo = { theme: "theme-autumn", icon: "🍂", active: true };
        } else if (month === 12 && day === 21) {
            eventInfo = { theme: "theme-winter", icon: "❄️", active: true };
        } else {
            // Brak świąt i startu por roku -> upewniamy się, że wszystko jest wyczyszczone
            if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
            document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
            console.log("Dzisiaj nie ma żadnego święta ani pory roku, więc zostawiamy wygląd fabryczny.");
        }
    }

    // Aplikowanie motywu sezonowego (Tylko dla wykrytych specjalnych dat!)
    if (eventInfo.active) {
        document.body.classList.add(eventInfo.theme);
        currentSeasonalIcon = eventInfo.icon;

        // Pokazujemy przycisk wyłączania efektów, bo to jest prawdziwe święto z kalendarza
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
    // Reset starego interwału przed uruchomieniem nowego (zabezpieczenie)
    if (particleInterval) {
        clearInterval(particleInterval);
    }

    if (document.body.classList.contains('effects-off')) return;

    particleInterval = setInterval(() => {
        // Dodatkowa bariera bezpieczeństwa wewnątrz pętli
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

    // Pobieramy przycisk, aby móc zmienić jego tekst
    const btn = document.getElementById('toggle-effects-btn');

    if (isOff) {
        // Zmieniamy napis na "Włącz efekty", bo właśnie zostały wyłączone
        if (btn) btn.innerText = "Włącz efekty";

        // 1. Wyłączamy stoper generujący nowe elementy
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = null;
        }
        // 2. Natychmiast kasujemy z ekranu cząsteczki, które zdążyły się pojawić
        document.querySelectorAll('.seasonal-particle').forEach(p => p.remove());
    } else {
        // Zmieniamy napis na "Wyłącz efekty", bo właśnie zostały włączone z powrotem
        if (btn) btn.innerText = "Wyłącz efekty";

        // 3. Jeśli włączono ponownie, odpalamy generator od nowa
        startParticles(currentSeasonalIcon);
    }
}

// Udostępniamy funkcję globalnie dla atrybutu onclick w HTML
window.toggleEffects = toggleEffects;

// Inicjalizacja przy pełnym załadowaniu
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        if (loader) loader.classList.add('loader-hidden');
    }, 1500);
    initSeasonalSystem();
});

/* ==========================================================================
   SYSTEM PODŚWIETLANIA AKTYWNEJ ZAKŁADKI W MENU (UX) - WERSJA Z DROPDOWNAMI
   ========================================================================== */
function highlightActiveNav() {
    // 1. Pobieramy aktualną ścieżkę podstrony oraz kotwicę/hash
    const currentPath = window.location.pathname.toLowerCase();
    const currentHash = window.location.hash.toLowerCase();

    // 2. Czyścimy stare podświetlenia ZE WSZYSTKICH głównych elementów menu
    const allLinks = ["nav-home", "nav-tworczosc", "nav-pc", "nav-o-mnie", "nav-kontakt", "nav-gallery", "nav-tools", "nav-socials", "nav-games"];
    allLinks.forEach(id => {
        const link = document.getElementById(id);
        if (link) {
            link.style.color = "";        // Przywraca domyślny kolor z CSS
            link.style.textShadow = "";   // Usuwa efekt poświaty/glow
        }
    });

    // 3. Sprawdzamy, gdzie dokładnie znajduje się użytkownik i podświetlamy odpowiedni element (lub rodzica)
    
    // --- GRUPA: GRY ---
    if (currentPath.includes("dino.html") || currentPath.includes("tetris.html") || currentPath.includes("shooter.html") || currentPath.includes("statki.html")) {
        setActiveLink("nav-games");
    } 
    // --- GRUPA: NARZĘDZIA ---
    else if (currentPath.includes("tools-rec.html") || currentPath.includes("tools-all.html") || currentPath.includes("linux.html")) {
        setActiveLink("nav-tools");
    } 
    // --- POZOSTAŁE JEDNOSTKOWE PODSTRONY ---
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
        // Kliknięcie Spotify przewija stronę główną, ale logicznie to element Sociali
        setActiveLink("nav-socials");
    } else if (currentPath === "/" || currentPath.includes("index.html") || currentHash === "#home" || currentHash === "") {
        // Domyślnie podświetlamy przycisk "Home", jeśli jesteśmy na stronie głównej bez konkretnego hasha
        setActiveLink("nav-home");
    }

    // Funkcja wewnętrzna wykonująca fizyczne podświetlenie neonem
    function setActiveLink(activeId) {
        const link = document.getElementById(activeId);
        if (link) {
            link.style.color = "var(--accent)"; // Zmienia kolor na neonowy niebieski
            link.style.textShadow = "0 0 10px var(--accent)"; // Dodaje piękny neonowy blask
            link.style.opacity = "1"; // Upewnia się, że element jest w pełni widoczny
        }
    }
}

// Nasłuchiwacz zdarzeń: reaguje na zmiany kotwic w adresie URL
window.addEventListener("hashchange", highlightActiveNav);