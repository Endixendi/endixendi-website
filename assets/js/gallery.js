document.addEventListener('DOMContentLoaded', () => {
    const imageFiles = [
        'Massey_Ferguson_+_Samasz.webp',
        'Żniwa_pełną_parą.webp',
        'Przejazd_przy_ulu.webp',
        'Orka_pola.webp',
        'Sprzęt_do_obornika.webp',
        'Sprzedajemy_belki_kiszonki.webp',
        'Żniwa_pszenicy.webp',
        'Głęboszowanie_pola.webp',
        'Samozbierająca_w_akcj_z_trawą.webp',
        'Samozbierająca_w_akcj_ze_słomą.webp',
        'Talerzowanie_pola.webp',
        'Siewy_na_polu.webp'
    ];

    const galleryContainer = document.getElementById('dynamic-gallery');
    if (!galleryContainer) return;

    imageFiles.forEach(fileName => {
        const cleanName = fileName.split('.')[0].replace(/_/g, ' ').replace(/-/g, ' ');
        const description = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        // Obrazek z obsługą płynnego wejścia (opacity)
        galleryItem.innerHTML = `
            <div class="img-loader"></div>
            <img src="assets/images/gallery/${fileName}" 
                 alt="${description}" 
                 loading="lazy" 
                 style="opacity: 0; transition: opacity 0.8s ease;">
            <p class="gallery-caption">${description}</p>
        `;

        const img = galleryItem.querySelector('img');

        // Gdy obrazek się załaduje, ustawiamy opacity na 1
        img.onload = () => {
            img.style.opacity = '1';
        };

        // Obsługa kliknięcia (Overlay)
        img.addEventListener('click', function() {
            createOverlay(this);
        });

        galleryContainer.appendChild(galleryItem);
    });

    function createOverlay(img) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', zIndex: '10000',
            opacity: '0', transition: 'opacity 0.3s ease'
        });

        const fullImg = document.createElement('img');
        fullImg.src = img.src;
        Object.assign(fullImg.style, {
            maxWidth: '90%', maxHeight: '90%', objectFit: 'contain',
            borderRadius: '8px', boxShadow: '0 0 40px rgba(0,0,0,0.6)'
        });

        overlay.appendChild(fullImg);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.style.opacity = '1', 10);

        const closeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
            document.removeEventListener('keydown', handleEsc);
        };

        overlay.addEventListener('click', closeOverlay);
        const handleEsc = (e) => { if (e.key === 'Escape') closeOverlay(); };
        document.addEventListener('keydown', handleEsc);
    }
});