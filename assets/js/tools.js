document.addEventListener("DOMContentLoaded", () => {
    updateToolsCount();
    setupBackToTopButton();
});

// Funkcja aktualizująca całkowitą liczbę dostępnych narzędzi w nagłówku
function updateToolsCount() {
    const totalCards = document.querySelectorAll('.tool-card').length;
    const counterEl = document.getElementById('tools-counter');
    if (counterEl) {
        counterEl.textContent = totalCards;
    }
}

// Glówna funkcja filtrująca narzędzia w czasie rzeczywistym
function filterTools() {
    const input = document.getElementById('tool-search-input').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    const sections = document.querySelectorAll('.tool-category');
    const noResultsEl = document.getElementById('no-results');

    let hasAnyVisibleCards = false;

    // Filtrowanie poszczególnych kart
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('.tool-card-desc').textContent.toLowerCase();

        if (title.includes(input) || desc.includes(input)) {
            card.style.display = ""; // Przywraca domyślny styl
            hasAnyVisibleCards = true;
        } else {
            card.style.display = "none";
        }
    });

    // Ukrywanie/pokazywanie sekcji bez pasujących kart
    sections.forEach(section => {
        const visibleCards = Array.from(section.querySelectorAll('.tool-card'))
                                  .filter(card => card.style.display !== 'none');

        if (visibleCards.length === 0 && input !== '') {
            section.style.display = 'none';
        } else {
            section.style.display = ''; // Domyślny styl z CSS
        }
    });

    // Komunikat o braku wyników
    if (noResultsEl) {
        if (!hasAnyVisibleCards && input !== '') {
            noResultsEl.style.display = 'block';
        } else {
            noResultsEl.style.display = 'none';
        }
    }
}

// Obsługa szybkiego filtrowania za pomocą przycisków kategorii
function filterCategory(catId, btnElement) {
    const sections = document.querySelectorAll('.tool-category');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // 1. Resetuj klasę 'active' ze wszystkich przycisków
    filterButtons.forEach(btn => btn.classList.remove('active'));

    // 2. Dodaj 'active' TYLKO do klikniętego przycisku
    if (btnElement) {
        btnElement.classList.add('active');
    }

    // 3. Czyszczenie pola wyszukiwania
    const searchInput = document.getElementById('tool-search-input');
    if (searchInput) searchInput.value = '';

    const noResultsEl = document.getElementById('no-results');
    if (noResultsEl) noResultsEl.style.display = 'none';

    // 4. Pokazywanie/Ukrywanie odpowiednich sekcji i kart
    sections.forEach(section => {
        if (catId === 'all' || section.id === catId) {
            section.style.display = ''; // Pokazuje sekcję
            // Pokazuje wszystkie karty w tej sekcji
            section.querySelectorAll('.tool-card').forEach(card => card.style.display = '');
        } else {
            section.style.display = 'none'; // Ukrywa sekcję
        }
    });
}

// Logika przycisku 'Back to Top'
function setupBackToTopButton() {
    const btn = document.getElementById('back-to-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}