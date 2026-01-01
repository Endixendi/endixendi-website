/**
 * Galeria zdjęć
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. LISTA PLIKÓW
    // Nazwa pliku bez rozszerzenia (zamiast spacji używaj _) będzie opisem pod zdjęciem
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

    // 2. GENEROWANIE GALERII
    imageFiles.forEach(fileName => {
        // Tworzenie czytelnego opisu z nazwy pliku
        const cleanName = fileName.split('.')[0]       // Usuwa .jpg / .png
            .replace(/_/g, ' ')                        // Zamienia _ na spację
            .replace(/-/g, ' ');                       // Zamienia - na spację
        
        // Pierwsza litera wielka (opcjonalnie)
        const description = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

        // Tworzenie elementu galerii
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
		galleryItem.innerHTML = `
		<div class="img-loader"></div> <img src="assets/images/gallery/${fileName}" alt="${description}" loading="lazy" style="opacity: 0; transition: opacity 0.5s ease;" onload="this.style.opacity='1'">
			<p class="gallery-caption">${description}</p>
		`;		
		

        // Obsługa kliknięcia (powiększenie)
        galleryItem.querySelector('img').addEventListener('click', function() {
            createOverlay(this);
        });

        galleryContainer.appendChild(galleryItem);
    });

    /**
     * Funkcja powiększania obrazka (Overlay)
     */
    function createOverlay(img) {
        const overlay = document.createElement('div');
        
        // Stylizacja overlay przez JS (aby nie zmieniać gallery.css)
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        const fullImg = document.createElement('img');
        fullImg.src = img.src;
        Object.assign(fullImg.style, {
            maxWidth: '90%',
            maxHeight: '90%',
            objectFit: 'contain',
            borderRadius: '5px',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)'
        });

        overlay.appendChild(fullImg);
        document.body.appendChild(overlay);

        // Animacja pojawienia się
        setTimeout(() => overlay.style.opacity = '1', 10);

        // Zamykanie
        const closeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
            document.removeEventListener('keydown', handleEsc);
        };

        overlay.addEventListener('click', closeOverlay);

        const handleEsc = (e) => {
            if (e.key === 'Escape') closeOverlay();
        };
        document.addEventListener('keydown', handleEsc);
    }
});