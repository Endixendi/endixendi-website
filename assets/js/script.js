/**
 * Główny skrypt strony Endixendi
 * Ładuje częściowe szablony (menu, stopka), obsługuje nawigację, motywy,
 * efekty sezonowe i panele skrótów. Wymaga wcześniej załadowanego storage.js.
 */
(function () {
  'use strict';

  /* =========================
     Stałe i stan
     ========================= */
  const MENU_PATH = 'menu.html';
  const FOOTER_PATH = 'footer.html';
  const MOBILE_BP = 1200;              // poniżej: menu hamburger
  const PANELS_BP = 1450;              // powyżej: boczne panele skrótów (mieszczą się obok treści)
  const MIN_LOADER_MS = 150;
  const MAX_LOADER_MS = 3000;

  const GAME_PAGES = ['dino', 'tetris', 'shooter', 'battleship', 'pc-mode'];
  const TOOL_PAGES = ['tools-rec', 'tools-all', 'linux'];

  const MANUAL_THEMES = ['theme-red', 'theme-green', 'theme-blue'];
  const SEASONAL_THEMES = [
    'theme-birthday', 'theme-new', 'theme-winter', 'theme-spring',
    'theme-summer', 'theme-autumn', 'theme-patriotic', 'theme-youtube'
  ];
  const THEME_CYCLE = [
    { cls: '', text: 'Styl: Kalendarz' },
    { cls: 'theme-red', text: 'Styl: Czerwony' },
    { cls: 'theme-green', text: 'Styl: Zielony' },
    { cls: 'theme-blue', text: 'Styl: Niebieski' }
  ];

  const state = { particleInterval: null, seasonalIcon: '😎' };

  /* =========================
     Pomocnicze
     ========================= */
  const $ = (id) => document.getElementById(id);
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // "/index.html" == "/", "/dino.html" == "/dino"
  function normalizePath(path) {
    return path.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '').replace(/\/+$/, '') || '/';
  }

  function currentPage() {
    return normalizePath(window.location.pathname).split('/').pop().toLowerCase(); // '' = strona główna
  }

  /* =========================
     Ładowanie partiali (menu + stopka)
     ========================= */
  function loadHTML(targetId, path) {
    const target = $(targetId);
    if (!target) return Promise.resolve();

    return fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(`Fetch ${path} failed: ${response.status}`);
        return response.text();
      })
      .then((html) => { target.innerHTML = html; })
      .catch((error) => { console.error('Błąd ładowania:', path, error); });
  }

  function loadPartials() {
    return Promise.all([
      loadHTML('menu-placeholder', MENU_PATH).then(() => {
        initMenuToggle();
        highlightActiveNav();
      }),
      loadHTML('footer-placeholder', FOOTER_PATH).then(() => {
        const yr = $('footer-year');
        if (yr) yr.textContent = String(new Date().getFullYear());
        updateFloatingTopBtn();
      })
    ]);
  }

  function hideLoader() {
    const loader = $('loader');
    if (loader) loader.classList.add('loader-hidden');
  }

  /* =========================
     Pływający przycisk "Wróć na górę"
     ========================= */
  function updateFloatingTopBtn() {
    const btn = $('js-floating-top');
    if (!btn) return;

    // Strona z własnym przyciskiem (tools-all.html) - nie dublujemy
    if ($('back-to-top-btn')) {
      btn.classList.remove('show');
      btn.style.display = 'none';
      return;
    }

    btn.style.display = '';
    btn.classList.toggle('show', window.scrollY > 300);
  }

  function initFloatingTopBtn() {
    window.addEventListener('scroll', updateFloatingTopBtn, { passive: true });
    window.addEventListener('resize', updateFloatingTopBtn, { passive: true });
    updateFloatingTopBtn();
  }

  /* =========================
     Menu: hamburger, dropdowny, dostępność
     ========================= */
  function closeDropdowns() {
    document.querySelectorAll('.dropdown.open').forEach((drop) => {
      drop.classList.remove('open');
      const btn = drop.querySelector('.dropbtn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function setMenuOpen(open) {
    const toggle = $('menu-toggle');
    const nav = $('main-nav');
    if (!toggle || !nav) return;

    nav.classList.toggle('show', open);
    toggle.textContent = open ? '✕' : '☰';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu nawigacji' : 'Otwórz menu nawigacji');
    if (!open) closeDropdowns();
  }

  function initMenuToggle() {
    const toggle = $('menu-toggle');
    const nav = $('main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.innerWidth > MOBILE_BP) return;
      setMenuOpen(!nav.classList.contains('show'));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= MOBILE_BP) setMenuOpen(false);
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BP) setMenuOpen(false);
    });

    setMenuOpen(false);
  }

  function initMenuGlobalHandlers() {
    // Dropdowny na mobile: klik rozwija/zwija grupę
    document.addEventListener('click', (e) => {
      const dropBtn = e.target.closest('.dropbtn');

      if (dropBtn && window.innerWidth <= MOBILE_BP) {
        e.preventDefault();
        const parent = dropBtn.closest('.dropdown');
        if (!parent) return;
        const willOpen = !parent.classList.contains('open');
        closeDropdowns();
        parent.classList.toggle('open', willOpen);
        dropBtn.setAttribute('aria-expanded', String(willOpen));
        return;
      }

      // Klik poza nagłówkiem zamyka menu mobilne
      const nav = $('main-nav');
      if (nav && nav.classList.contains('show') && !e.target.closest('header')) {
        setMenuOpen(false);
      }
    });

    // Escape zamyka menu
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const nav = $('main-nav');
      if (nav && nav.classList.contains('show')) {
        setMenuOpen(false);
        const toggle = $('menu-toggle');
        if (toggle) toggle.focus();
      }
      closeDropdowns();
    });

    // Desktop: aria-expanded zgodne z hoverem / fokusem
    const syncDesktop = (e, expanded) => {
      if (window.innerWidth <= MOBILE_BP || !e.target.closest) return;
      const drop = e.target.closest('.dropdown');
      if (!drop) return;
      if (!expanded && drop.contains(e.relatedTarget)) return;
      const btn = drop.querySelector('.dropbtn');
      if (btn) btn.setAttribute('aria-expanded', String(expanded));
    };
    ['mouseover', 'focusin'].forEach((t) => document.addEventListener(t, (e) => syncDesktop(e, true)));
    ['mouseout', 'focusout'].forEach((t) => document.addEventListener(t, (e) => syncDesktop(e, false)));
  }

  /* =========================
     Przekierowania i Donate
     ========================= */
  function checkForRedirects() {
    const shouldRedirect = (
      location.hash === '#social' ||
      location.hash === '#media' ||
      location.pathname.endsWith('/social')
    );
    if (shouldRedirect) window.location.replace('https://linktr.ee/endixendi');
  }

  function initDonateButton() {
    const donateBtn = $('donate-btn');
    if (donateBtn && !donateBtn.dataset.bound) {
      donateBtn.addEventListener('click', () => {
        window.open('https://tipply.pl/@endixendi', '_blank', 'noopener');
      });
      donateBtn.dataset.bound = 'true';
    }
  }

  /* =========================
     Smooth scroll (linki #kotwice na tej samej stronie)
     ========================= */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const trigger = e.target.closest('a, [data-scroll]');
      if (!trigger) return;

      let hash = trigger.getAttribute('data-scroll');

      if (!hash && trigger.tagName === 'A') {
        const href = trigger.getAttribute('href');
        if (!href || !href.includes('#')) return;

        let url;
        try {
          url = new URL(href, window.location.href);
        } catch (error) {
          return;
        }
        if (url.origin !== window.location.origin) return;
        if (normalizePath(url.pathname) !== normalizePath(window.location.pathname)) return;
        hash = url.hash;
      }

      if (!hash || hash === '#') return;

      let id;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch (error) {
        return;
      }

      const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
      const target = $(id);

      if (!target) {
        if (id === 'top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior });
        }
        return;
      }

      e.preventDefault();
      target.scrollIntoView({ behavior, block: 'start' });
      history.pushState(null, '', hash);
      highlightActiveNav(hash);

      if (window.innerWidth <= MOBILE_BP) setMenuOpen(false);
    });
  }

  /* =========================
     Podświetlanie aktywnej zakładki w menu
     ========================= */
  function highlightActiveNav(overrideHash) {
    const page = currentPage();
    const hash = (typeof overrideHash === 'string' ? overrideHash : window.location.hash).toLowerCase();

    const ids = [
      'nav-home',
      'nav-o-mnie',
      'nav-kontakt',
      'nav-creative',
      'nav-profile',
      'nav-tools',
      'nav-games',
      'nav-socials'
    ];

    ids.forEach((id) => {
      const el = $(id);
      if (el) {
        el.classList.remove('active');
        el.removeAttribute('aria-current');
      }
    });

    let activeId = null;

    if (GAME_PAGES.includes(page)) activeId = 'nav-games';
    else if (TOOL_PAGES.includes(page)) activeId = 'nav-tools';
    else if (page === 'gallery' || page === 'media') activeId = 'nav-creative';
    else if (page === '' || page === 'index') {
      if (hash === '#o-mnie') activeId = 'nav-o-mnie';
      else if (hash === '#kontakt') activeId = 'nav-kontakt';
      else if (hash === '#tworczosc') activeId = 'nav-creative';
      else if (hash === '#pc') activeId = 'nav-tools';
      else activeId = 'nav-home';
    }

    const active = activeId && $(activeId);
    if (active) {
      active.classList.add('active');
      if (active.tagName === 'A') active.setAttribute('aria-current', 'page');
    }
  }

  /* =========================
     Motywy: ręczne i sezonowe
     ========================= */
  function initThemeSystem() {
    let index = parseInt(store.get('theme-cycle-index', '0'), 10);
    if (isNaN(index) || index < 0 || index >= THEME_CYCLE.length) index = 0;

    const themeBtn = $('red-theme-btn');

    const applyManualTheme = (i) => {
      document.body.classList.remove(...MANUAL_THEMES, ...SEASONAL_THEMES);
      if (THEME_CYCLE[i].cls) document.body.classList.add(THEME_CYCLE[i].cls);
      store.set('theme-cycle-index', i);
      if (themeBtn) themeBtn.textContent = THEME_CYCLE[(i + 1) % THEME_CYCLE.length].text;
    };

    if (index > 0) {
      applyManualTheme(index);
      initSeasonalSystem(); // wyłącza cząsteczki przy ręcznym motywie
    } else {
      const special = initSeasonalSystem();
      if (!special) applyManualTheme(0);
      else if (themeBtn) themeBtn.textContent = THEME_CYCLE[1].text;
    }

    if (themeBtn && !themeBtn.dataset.bound) {
      themeBtn.addEventListener('click', () => {
        index = (index + 1) % THEME_CYCLE.length;

        if (index === 0) {
          store.set('theme-cycle-index', 0);
          document.body.classList.remove(...MANUAL_THEMES);
          const special = initSeasonalSystem();
          if (!special) applyManualTheme(0);
          else themeBtn.textContent = THEME_CYCLE[1].text;
        } else {
          applyManualTheme(index);
          initSeasonalSystem();
        }
        highlightActiveNav();
      });
      themeBtn.dataset.bound = 'true';
    }
  }

  /* =========================
     Efekty sezonowe
     ========================= */
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
    if (state.particleInterval) {
      clearInterval(state.particleInterval);
      state.particleInterval = null;
    }
    document.querySelectorAll('.seasonal-particle').forEach((p) => p.remove());
  }

  function startParticles(icon) {
    stopParticles();

    // Bez cząsteczek w grach / PC Mode i przy ograniczonym ruchu w systemie
    if (GAME_PAGES.includes(currentPage()) || prefersReducedMotion()) return;
    if (document.body.classList.contains('effects-off')) return;

    state.particleInterval = setInterval(() => {
      if (document.hidden) return;
      if (document.body.classList.contains('effects-off')) {
        stopParticles();
        return;
      }

      const p = document.createElement('div');
      p.className = 'seasonal-particle';
      p.textContent = icon;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = (Math.random() * 3 + 2) + 's';
      p.style.fontSize = (Math.random() * 15 + 10) + 'px';
      document.body.appendChild(p);

      setTimeout(() => p.remove(), 5000);
    }, 400);
  }

  function getSeasonalEvent(now) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;

    const easter = getEaster(year);
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const sameDay = (a, b) => a.toDateString() === b.toDateString();

    const fixed = {
      '07.06': ['theme-birthday', '🎁'], '01.01': ['theme-new', '🎆'], '06.01': ['theme-winter', '👑'],
      '01.05': ['theme-patriotic', '🛠️'], '03.05': ['theme-patriotic', '🇵🇱'], '07.07': ['theme-youtube', '🎬'],
      '15.08': ['theme-patriotic', '🎖️'], '01.11': ['theme-autumn', '🕯️'], '11.11': ['theme-patriotic', '🇵🇱'],
      '24.12': ['theme-winter', '🎄'], '25.12': ['theme-winter', '🎅'], '26.12': ['theme-winter', '🎅'],
      '21.03': ['theme-spring', '🌱'], '21.06': ['theme-summer', '☀️'], '23.09': ['theme-autumn', '🍂'],
      '21.12': ['theme-winter', '❄️']
    };

    if (fixed[dateStr]) return { theme: fixed[dateStr][0], icon: fixed[dateStr][1] };
    if (sameDay(now, easter)) return { theme: 'theme-spring', icon: '🐣' };
    if (sameDay(now, addDays(easter, 1))) return { theme: 'theme-spring', icon: '💧' };
    if (sameDay(now, addDays(easter, 49))) return { theme: 'theme-spring', icon: '🌿' };
    if (sameDay(now, addDays(easter, 60))) return { theme: 'theme-spring', icon: '🌸' };
    return null;
  }

  // Zwraca true, jeśli dziś trwa wydarzenie sezonowe
  function initSeasonalSystem() {
    const manualIndex = parseInt(store.get('theme-cycle-index', '0'), 10);
    const toggleBtn = $('toggle-effects-btn');

    // Ręcznie wybrany kolor ma pierwszeństwo przed kalendarzem
    if (manualIndex > 0) {
      stopParticles();
      if (toggleBtn) toggleBtn.style.display = 'none';
      return false;
    }

    const event = getSeasonalEvent(new Date());

    if (!event) {
      if (toggleBtn) toggleBtn.style.display = 'none';
      stopParticles();
      return false;
    }

    document.body.classList.remove(...MANUAL_THEMES, ...SEASONAL_THEMES);
    document.body.classList.add(event.theme);
    state.seasonalIcon = event.icon;

    if (toggleBtn) toggleBtn.style.display = 'block';

    if (store.get('effects-disabled') === 'true') {
      document.body.classList.add('effects-off');
      if (toggleBtn) toggleBtn.textContent = 'Włącz efekty';
      stopParticles();
    } else {
      document.body.classList.remove('effects-off');
      if (toggleBtn) toggleBtn.textContent = 'Wyłącz efekty';
      startParticles(state.seasonalIcon);
    }

    return true;
  }

  function toggleEffects() {
    const isOff = document.body.classList.toggle('effects-off');
    store.set('effects-disabled', isOff);

    const btn = $('toggle-effects-btn');
    if (btn) btn.textContent = isOff ? 'Włącz efekty' : 'Wyłącz efekty';

    if (isOff) stopParticles();
    else startParticles(state.seasonalIcon);
  }

  /* =========================
     Panele skrótów (strona główna)
     ========================= */
  function initSitePanels() {
    const leftPanel = $('navigation-left-panel');
    const rightPanel = $('navigation-right-panel');
    const mobilePanel = $('mobile-sticky-footer');
    const ids = ['goldsaver', 'dc', 'instant', 'tipply', 'cs'];
    const pick = () => ids[Math.floor(Math.random() * ids.length)];

    if (leftPanel && rightPanel && window.innerWidth > PANELS_BP) {
      const left = pick();
      let right = pick();
      while (right === left) right = pick();

      const l = leftPanel.querySelector(`.shortcut-item[data-id="${left}"]`);
      const r = rightPanel.querySelector(`.shortcut-item[data-id="${right}"]`);
      if (l) l.classList.add('is-active');
      if (r) r.classList.add('is-active');

      leftPanel.style.display = 'block';
      rightPanel.style.display = 'block';
    }

    if (mobilePanel && window.innerWidth <= MOBILE_BP) {
      setTimeout(() => {
        const m = mobilePanel.querySelector(`.shortcut-item[data-id="${pick()}"]`);
        if (m) m.classList.add('is-active');
        mobilePanel.classList.add('is-open');
      }, 50);
    }
  }

  function dismissPanel(elementId) {
    const target = $(elementId);
    if (target) target.style.setProperty('display', 'none', 'important');
  }

  /* =========================
     Inicjalizacja
     ========================= */
  function init() {
    const started = performance.now();

    // Loader znika dopiero po załadowaniu menu i stopki (z limitem czasu)
    setTimeout(hideLoader, MAX_LOADER_MS);
    loadPartials().finally(() => {
      const left = Math.max(0, MIN_LOADER_MS - (performance.now() - started));
      setTimeout(hideLoader, left);
    });

    checkForRedirects();
    initDonateButton();
    initSmoothScroll();
    initFloatingTopBtn();
    initMenuGlobalHandlers();
    initThemeSystem();
    initSitePanels();

    window.addEventListener('hashchange', () => {
      checkForRedirects();
      highlightActiveNav();
    });
  }

  // Funkcje wywoływane z atrybutów onclick w HTML
  window.toggleEffects = toggleEffects;
  window.dismissPanel = dismissPanel;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();