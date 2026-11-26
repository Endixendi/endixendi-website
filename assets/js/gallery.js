document.addEventListener('DOMContentLoaded', () => {
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
        'Siewy_na_polu.webp',
		'Gospodarz_i_jego_maszyna.webp',
		'Piękne_prasowanie_trawy.webp',
		'Polski_zestaw.webp',
		'Sprzedaż_zrębek.webp',
		'Talerzowanie_na_dwa_zestawy.webp',
		'Zetor_i_Ursus.webp',
		'Żniwa_na_Solku.webp',
		'Bizon_w_drodze.webp',
		'Bizon_w_drodze_wiosna.webp',
		'John_i_Słonecznik.webp',
		'Major_i_Ursus.webp',
		'Opryski_na_chwasty.webp',
		'Siewy_pola.webp',
		'Ursus_c360.webp',
		'W_drodze_na_pole.webp',
		'Zestaw_pod_siewnik.webp',
		'Zimowa_sprzedaż.webp',
		'Zbiory_topoli.webp'
    ];

    function buildGallerySrc(fileName) {
        return encodeURI(`assets/images/gallery/${fileName}`);
    }

    function formatCaption(fileName) {
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const cleanName = baseName.replace(/_/g, ' ').replace(/-/g, ' ');
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // ==========================================================================
    // 1. GENEROWANIE PIERWSZEJ GALERII (Z NAZWAMI I ODLICZANIEM LOADERÓW)
    // ==========================================================================
    const galleryContainer = document.getElementById('dynamic-gallery');
    if (galleryContainer) {
        imageFiles.forEach(fileName => {
            const description = formatCaption(fileName);

            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';

            const loader = document.createElement('div');
            loader.className = 'img-loader';

            const img = document.createElement('img');
            img.src = buildGallerySrc(fileName);
            img.alt = description;
            img.loading = 'lazy';
            img.style.opacity = '0';

            const caption = document.createElement('p');
            caption.className = 'gallery-caption';
            caption.textContent = description;

            const handleImageLoad = () => {
                img.style.opacity = '1';
                loader.style.display = 'none';
            };

            const handleImageError = () => {
                img.style.opacity = '0.4';
                loader.style.display = 'none';
            };

            if (img.complete) {
                if (img.naturalWidth > 0) {
                    handleImageLoad();
                } else {
                    handleImageError();
                }
            } else {
                img.addEventListener('load', handleImageLoad, { once: true });
                img.addEventListener('error', handleImageError, { once: true });
            }

            img.tabIndex = 0;
            img.setAttribute('role', 'button');
            img.addEventListener('click', function () {
                createOverlay(this);
            });
            img.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    createOverlay(this);
                }
            });

            galleryItem.appendChild(loader);
            galleryItem.appendChild(img);
            galleryItem.appendChild(caption);
            galleryContainer.appendChild(galleryItem);
        });
    }

    // ==========================================================================
    // 2. GENEROWANIE DRUGIEJ GALERII (KINOWEJ - BEZ PODPISÓW + SLIDER)
    // ==========================================================================
    const cinemaContainer = document.getElementById('cinema-gallery-container');
    if (cinemaContainer && imageFiles.length > 0) {
        let currentIndex = 0;
        let swapTimer = null;

        cinemaContainer.innerHTML = `
            <div class="cinema-display">
                <button type="button" class="cinema-arrow prev" aria-label="Poprzednie zdjęcie">&#10094;</button>
                <img src="${buildGallerySrc(imageFiles[0])}" alt="${formatCaption(imageFiles[0])}" id="cinema-main-img">
                <button type="button" class="cinema-arrow next" aria-label="Następne zdjęcie">&#10095;</button>
            </div>
            <div class="cinema-thumbnails mt-16" id="cinema-thumbs-box"></div>
        `;

        const mainImg = document.getElementById('cinema-main-img');
        const thumbsBox = document.getElementById('cinema-thumbs-box');
        const arrowPrev = cinemaContainer.querySelector('.cinema-arrow.prev');
        const arrowNext = cinemaContainer.querySelector('.cinema-arrow.next');

        imageFiles.forEach((fileName, index) => {
            const thumb = document.createElement('img');
            thumb.src = buildGallerySrc(fileName);
            thumb.alt = formatCaption(fileName);
            thumb.className = 'cinema-thumb';
            thumb.tabIndex = 0;
            thumb.setAttribute('role', 'button');
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    currentIndex = index;
                    updateCinemaGallery();
                }
            });
            if (index === 0) thumb.classList.add('active');

            thumb.addEventListener('click', () => {
                currentIndex = index;
                updateCinemaGallery();
            });

            thumbsBox.appendChild(thumb);
        });

        function updateCinemaGallery() {
            if (!mainImg || !thumbsBox) return;

            if (swapTimer) {
                clearTimeout(swapTimer);
                swapTimer = null;
            }

            const selectedFile = imageFiles[currentIndex];
            mainImg.style.opacity = '0.3';
            swapTimer = setTimeout(() => {
                mainImg.src = buildGallerySrc(selectedFile);
                mainImg.alt = formatCaption(selectedFile);
                mainImg.style.opacity = '1';
                swapTimer = null;
            }, 120);

            const thumbs = thumbsBox.querySelectorAll('.cinema-thumb');
            thumbs.forEach((thumb, index) => {
                if (index === currentIndex) {
                    thumb.classList.add('active');
                    // Przewija tylko pasek miniatur (scrollIntoView przewijałby też całą stronę)
                    thumbsBox.scrollTo({
                        left: thumb.offsetLeft - (thumbsBox.clientWidth - thumb.offsetWidth) / 2,
                        behavior: 'smooth'
                    });
                } else {
                    thumb.classList.remove('active');
                }
            });
        }

        if (arrowPrev) {
            arrowPrev.addEventListener('click', () => {
                currentIndex = (currentIndex === 0) ? imageFiles.length - 1 : currentIndex - 1;
                updateCinemaGallery();
            });
        }

        if (arrowNext) {
            arrowNext.addEventListener('click', () => {
                currentIndex = (currentIndex === imageFiles.length - 1) ? 0 : currentIndex + 1;
                updateCinemaGallery();
            });
        }

        if (mainImg) {
            mainImg.addEventListener('click', function () {
                createOverlay(this);
            });
        }
    }

    // ==========================================================================
    // 3. WSPÓLNY MODAL / OVERLAY (POWIĘKSZANIE ZDJĘĆ NA CAŁY EKRAN)
    // ==========================================================================
    function createOverlay(img) {
        if (!img || !img.src) return;

        const existingOverlay = document.getElementById('gallery-lightbox-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'gallery-lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Podgląd zdjęcia (strzałki zmieniają zdjęcie, Escape zamyka)');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', zIndex: '10000',
            opacity: '0', transition: 'opacity 0.3s ease'
        });

        const fullImg = document.createElement('img');
        fullImg.src = img.src;
        fullImg.alt = img.alt || 'Podgląd zdjęcia';
        Object.assign(fullImg.style, {
            maxWidth: '90%', maxHeight: '90%', objectFit: 'contain',
            borderRadius: '8px', boxShadow: '0 0 40px rgba(0,0,0,0.6)'
        });

        overlay.appendChild(fullImg);
        document.body.appendChild(overlay);

        const fadeInTimer = setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        let isClosing = false;
        const closeOverlay = () => {
            if (isClosing) return;
            isClosing = true;
            clearTimeout(fadeInTimer);
            document.removeEventListener('keydown', handleEsc);
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        };

        const sources = imageFiles.map(buildGallerySrc);
        let overlayIndex = sources.findIndex(src => img.src.endsWith(src));

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeOverlay();
            } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && overlayIndex !== -1) {
                const step = e.key === 'ArrowRight' ? 1 : -1;
                overlayIndex = (overlayIndex + step + sources.length) % sources.length;
                fullImg.src = sources[overlayIndex];
                fullImg.alt = formatCaption(imageFiles[overlayIndex]);
            }
        };

        overlay.addEventListener('click', closeOverlay);
        document.addEventListener('keydown', handleEsc);
    }
});