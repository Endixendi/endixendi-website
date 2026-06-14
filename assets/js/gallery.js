document.addEventListener('DOMContentLoaded', () => {
    // Wspólna baza plików graficznych z Twojego folderu assets/images/gallery/
    const imageFiles = [
        'Orka_pola.webp',
        'Żniwa_pełną_parą.webp',		
        'Massey_Ferguson_+_Samasz.webp',
        'Przejazd_przy_ulu.webp',
        'Sprzęt_do_obornika.webp',
        'Sprzedajemy_belki_kiszonki.webp',
        'Żniwa_pszenicy.webp',
        'Głęboszowanie_pola.webp',
        'Samozbierająca_w_akcj_z_trawą.webp',
        'Samozbierająca_w_akcj_ze_słomą.webp',
        'Talerzowanie_pola.webp',
        'Siewy_na_polu.webp'
    ];

    // ==========================================================================
    // 1. GENEROWANIE PIERWSZEJ GALERII (Z NAZWAMI I ODLICZANIEM LOADERÓW)
    // ==========================================================================
    const galleryContainer = document.getElementById('dynamic-gallery');
    if (galleryContainer) {
        imageFiles.forEach(fileName => {
            const cleanName = fileName.split('.')[0].replace(/_/g, ' ').replace(/-/g, ' ');
            const description = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            galleryItem.innerHTML = `
                <div class="img-loader"></div>
                <img src="assets/images/gallery/${fileName}" 
                     alt="${description}" 
                     loading="lazy" 
                     style="opacity: 0; transition: opacity 0.8s ease;">
                <p class="gallery-caption">${description}</p>
            `;

            const img = galleryItem.querySelector('img');
            const loader = galleryItem.querySelector('.img-loader');

            const handleImageLoad = () => {
                img.style.opacity = '1';
                if (loader) loader.style.display = 'none';
            };

            if (img.complete) {
                handleImageLoad();
            } else {
                img.onload = handleImageLoad;
            }

            img.addEventListener('click', function() {
                createOverlay(this);
            });

            galleryContainer.appendChild(galleryItem);
        });
    }

    // ==========================================================================
    // 2. GENEROWANIE DRUGIEJ GALERII (KINOWEJ - BEZ PODPISÓW + SLIDER)
    // ==========================================================================
    const cinemaContainer = document.getElementById('cinema-gallery-container');
    if (cinemaContainer && imageFiles.length > 0) {
        let currentIndex = 0;

        // Budowa czystej struktury slidera
        cinemaContainer.innerHTML = `
            <div class="cinema-display">
                <button class="cinema-arrow prev">&#10094;</button>
                <img src="assets/images/gallery/${imageFiles[0]}" alt="Podgląd kinowy" id="cinema-main-img">
                <button class="cinema-arrow next">&#10095;</button>
            </div>
            <div class="cinema-thumbnails mt-16" id="cinema-thumbs-box"></div>
        `;

        const mainImg = document.getElementById('cinema-main-img');
        const thumbsBox = document.getElementById('cinema-thumbs-box');
        const arrowPrev = cinemaContainer.querySelector('.cinema-arrow.prev');
        const arrowNext = cinemaContainer.querySelector('.cinema-arrow.next');

        // Generowanie miniaturek pod spodem bez napisów
        imageFiles.forEach((fileName, index) => {
            const thumb = document.createElement('img');
            thumb.src = `assets/images/gallery/${fileName}`;
            thumb.className = 'cinema-thumb';
            if (index === 0) thumb.classList.add('active');

            thumb.addEventListener('click', () => {
                currentIndex = index;
                updateCinemaGallery();
            });

            thumbsBox.appendChild(thumb);
        });

        // Funkcja synchronizująca duże zdjęcie z miniaturami
        function updateCinemaGallery() {
            mainImg.style.opacity = '0.3'; 
            setTimeout(() => {
                mainImg.src = `assets/images/gallery/${imageFiles[currentIndex]}`;
                mainImg.style.opacity = '1';
            }, 120);

            const thumbs = thumbsBox.querySelectorAll('.cinema-thumb');
            thumbs.forEach((thumb, index) => {
                if (index === currentIndex) {
                    thumb.classList.add('active');
                    // Środkowanie miniatury na pasku jeśli przewijamy dalej
                    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    thumb.classList.remove('active');
                }
            });
        }

        // Obsługa strzałek nawigacji
        arrowPrev.addEventListener('click', () => {
            currentIndex = (currentIndex === 0) ? imageFiles.length - 1 : currentIndex - 1;
            updateCinemaGallery();
        });

        arrowNext.addEventListener('click', () => {
            currentIndex = (currentIndex === imageFiles.length - 1) ? 0 : currentIndex + 1;
            updateCinemaGallery();
        });

        // Otwieranie pełnego ekranu po kliknięciu w główne zdjęcie kinowe
        mainImg.addEventListener('click', function() {
            createOverlay(this);
        });
    }

    // ==========================================================================
    // 3. WSPÓLNY MODAL / OVERLAY (POWIĘKSZANIE ZDJĘĆ NA CAŁY EKRAN)
    // ==========================================================================
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

        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        const closeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
            document.removeEventListener('keydown', handleEsc);
        };

        const handleEsc = (e) => { 
            if (e.key === 'Escape') {
                closeOverlay(); 
            }
        };

        overlay.addEventListener('click', closeOverlay);
        document.addEventListener('keydown', handleEsc);
    }
});