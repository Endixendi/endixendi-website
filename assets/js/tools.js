/**
 * Podstrona narzędzi: wyszukiwarka, filtr kategorii, licznik, przycisk "do góry".
 * Wyszukiwarka i filtr kategorii działają razem (jeden wspólny stan).
 */
const toolsState = { category: 'all', query: '' };

document.addEventListener('DOMContentLoaded', () => {
    updateToolsCount();
    setupBackToTopButton();
});

// Normalizacja tekstu: małe litery, bez polskich znaków diakrytycznych
function normalizeText(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ł/g, 'l');
}

function updateToolsCount() {
    const totalCards = document.querySelectorAll('.tool-card').length;
    const counterEl = document.getElementById('tools-counter');
    if (counterEl) counterEl.textContent = totalCards;
}

// Stosuje jednocześnie filtr kategorii i frazę z wyszukiwarki
function applyToolFilters() {
    const sections = document.querySelectorAll('.tool-category');
    const noResultsEl = document.getElementById('no-results');
    const { category, query } = toolsState;

    let visibleTotal = 0;

    sections.forEach(section => {
        const inCategory = category === 'all' || section.id === category;
        let visibleInSection = 0;

        section.querySelectorAll('.tool-card').forEach(card => {
            const title = card.querySelector('h3')?.textContent || '';
            const desc = card.querySelector('.tool-card-desc')?.textContent || '';
            const matches = !query || normalizeText(title + ' ' + desc).includes(query);

            card.style.display = matches ? '' : 'none';
            if (matches) visibleInSection++;
        });

        const showSection = inCategory && (!query || visibleInSection > 0);
        section.style.display = showSection ? '' : 'none';
        if (showSection) visibleTotal += visibleInSection;
    });

    if (noResultsEl) {
        noResultsEl.style.display = (query && visibleTotal === 0) ? 'block' : 'none';
    }
}

// Wywoływane z pola wyszukiwania (oninput)
function filterTools() {
    const searchInput = document.getElementById('tool-search-input');
    toolsState.query = searchInput ? normalizeText(searchInput.value.trim()) : '';
    applyToolFilters();
}

// Wywoływane z przycisków kategorii
function filterCategory(catId, btnElement) {
    toolsState.category = catId;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    applyToolFilters();
}

// Przycisk "Back to Top" (dublujący pływający przycisk ze stopki ukrywa script.js)
function setupBackToTopButton() {
    const btn = document.getElementById('back-to-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
}

function scrollToTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
