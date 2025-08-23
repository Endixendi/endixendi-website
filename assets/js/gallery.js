// gallery.js — powiększanie zdjęć po kliknięciu
document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('.gallery-item img');

  images.forEach(img => {
    img.addEventListener('click', () => {
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
      overlay.style.zIndex = 9999; // ważne, żeby było nad innymi elementami
      overlay.innerHTML = `<img src="${img.src}" style="max-width:90%; max-height:90%;">`;
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', () => overlay.remove());
    });
  });
});