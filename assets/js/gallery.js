/**
 * Galeria zdjęć z funkcją powiększania
 * @version 1.0
 */

/**
 * Inicjalizuje galerię po załadowaniu DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('.gallery-item img');

  /**
   * Dodaje obsługę kliknięcia do każdego obrazka
   */
  images.forEach(img => {
    img.addEventListener('click', () => {
      createOverlay(img);
    });
  });

  /**
   * Tworzy overlay z powiększonym obrazkiem
   * @param {HTMLImageElement} img - Element obrazka
   */
  function createOverlay(img) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'pointer';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `<img src="${img.src}" style="max-width:90%; max-height:90%; object-fit:contain;">`;
    document.body.appendChild(overlay);
    
    /**
     * Usuwa overlay po kliknięciu
     */
    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    /**
     * Obsługuje klawisz Escape do zamykania
     */
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };

    document.addEventListener('keydown', handleEscape);
  }
});