# 🖥️ endixendi.pl — Oficjalna Strona Internetowa

Witaj w oficjalnym repozytorium strony **[endixendi.pl](https://endixendi.pl)**. To moje osobiste miejsce w sieci, w którym gromadzę swoją twórczość, autorskie gry przeglądarkowe, poradniki oraz informacje o sprzęcie i projektach związanych z grami i technologią.

---

## 👨‍💻 O mnie
Tworzę treści wideo od 2014 roku, zaczynając od kultowej serii z MTA na YouTube. Moja pasja do gamingu oraz technologii łączy się z wykształceniem informatycznym, co pozwala mi samodzielnie rozwijać ten projekt i dzielić się wiedzą z odbiorcami. Chcę tworzyć miejsce, w którym pasja do gier łączy ludzi z Polski i ze świata.

---

## 🕹️ Zawartość strony

Strona używa czystego JavaScriptu do dynamicznego wstrzykiwania powtarzalnych elementów (menu i stopka), co ułatwia zarządzanie projektem.

### 🎮 Gry przeglądarkowe
* **Dino Game (`dino.html`)** — zręcznościowa gra inspirowana klasykiem z Chrome. Skacz i kucaj kwadratowym dinozaurem, zbieraj power-upy (magnes, spowolnienie czasu, podwójne punkty, tarcza), odblokowuj skórki kolejnymi progami rekordu i zdobywaj osiągnięcia. Pauza, statystyki na ekranie Game Over, pełne sterowanie dotykowe.
* **Tetris (`tetris.html`)** — neonowa wersja klasyka z Hold/Next, poziomami, T-spinami, combo i Back-to-Back. Pięć trybów (*Maraton*, *Sprint 40 linii*, *Ultra 2 min*, *Zen*, *Wyzwanie*), skórki klocków odblokowywane łączną liczbą linii, osiągnięcia oraz sterowanie klawiaturą i dotykiem (przyciski oraz gesty, z auto-powtarzaniem ruchu).
* **Shooter Game (`shooter.html`)** — kosmiczna strzelanka z systemem przegrzewania dział i paskiem zdrowia. Trzy poziomy trudności i trzy statki do wyboru, combo, power-upy, bossowie co 5. falę, osiągnięcia, pauza oraz ustawienia (wstrząsy ekranu, sterowanie myszką, czułość dotyku). Sterowanie dotykowe suwakiem i przyciskiem strzału.
* **Statki — Bitwa Morska (`battleship.html`)** — gra planszowa z komputerem na czterech poziomach (*Łatwy*, *Normalny*, *Trudny*, *Cheater*) i w trzech wariantach zasad (klasyczne, bez dodatkowego ruchu, salwa). Ręczne rozstawianie floty, wykrywanie zatopień, oznaczanie pól wokół zatopionych statków, statystyki i osiągnięcia.
* **PC Mode (`pc-mode.html`)** — symulator systemu operacyjnego: okna z przeciąganiem, menu Start, Notatnik z zapisem, konsola poleceń, przeglądarka z mini-grą, mikser głośności i kalendarz.

> **Wspólne moduły gier:** przycisk pełnego ekranu i jego style współdzielone są przez `assets/css/games.css` (Dino, Tetris, Shooter), a obsługa trybu pełnoekranowego (Fullscreen API + fallback dla iOS) przez `assets/js/fullscreen.js` (wszystkie gry z przyciskiem pełnego ekranu, w tym Statki). Przycisk **„Wyzeruj rekord i osiągnięcia”** w sekcji Osiągnięcia każdej gry jest wstrzykiwany przez `assets/js/progress-reset.js` (patrz niżej).

#### 📱 Układ na telefonach
Każda gra ma osobne reguły dla widoku zwykłego i pełnoekranowego, w pionie i w poziomie. Telefon w poziomie jest rozpoznawany po **niskiej wysokości ekranu** (`max-height: 560px`), a nie po szerokości, ponieważ współczesne telefony w poziomie często mają ponad 900 px szerokości. Planszę zawsze liczy się z dostępnej wysokości i szerokości okna (`dvh`), z zachowaniem proporcji.

#### 🏆 Osiągnięcia i reset postępu
Dino, Tetris, Shooter i Statki mają taki sam wygląd listy osiągnięć (`#achievementsList`) i taki sam przycisk resetu. Reset usuwa rekordy, statystyki, osiągnięcia i wybraną skórkę danej gry (ustawienia, takie jak głośność, tryb czy poziom trudności, zostają), a następnie przeładowuje stronę.

### 📱 Informacje i multimedia
* **Strona główna (`index.html`)** — sekcja „O mnie”, pełna specyfikacja PC i peryferiów, odnośniki do social mediów, najnowsze filmy z YouTube, skróty do partnerów.
* **Media (`media.html`)** — widget profilu Instagram (Behold) oraz playlista Spotify.
* **Narzędzia (`tools-all.html` / `tools-rec.html`)** — zestawienie programów do montażu, streamowania i grafiki (OBS, DaVinci Resolve, Photopea, Vectorpea) z wyszukiwarką, filtrami kategorii i osadzoną playlistą poradników.
* **Linux vs Windows (`linux.html`)** — porównanie systemów i polecane dystrybucje dla graczy.
* **Galeria (`gallery.html`)** — dynamicznie ładowana siatka zdjęć, podgląd kinowy z miniaturami i lightbox (strzałki, Escape).
* **Dokumenty prawne** — `polityka.html` (polityka prywatności) i `regulamin.html`.

---

## 🛠️ Architektura i technologie

Projekt stawia na szybkość i lekkość, bez frameworków (Vanilla Tech Stack):

* **HTML5** — semantyczna struktura, atrybuty ARIA, `lang="pl"`.
* **CSS3** — responsywny design z klasami pomocniczymi (`.mt-12`, `.muted`, …) i komponentami. Kolory sterowane zmiennymi CSS (`--accent`, `--accent-2`, `--danger`, `--on-accent`), dzięki czemu motywy (czerwony, zielony, niebieski, sezonowe) działają w całym serwisie. Wyjątek: symulator PC Mode ma własną, stałą paletę.
* **JavaScript (ES6+)** — gry na `<canvas>` (Dino, Tetris, Shooter) i w DOM (Statki), ładowanie menu i stopki przez `fetch()`, wspólny moduł pełnego ekranu, Audio API oraz bezpieczny wrapper `localStorage`.
* **Dostępność** — `aria-expanded` w menu, obsługa klawiatury, `:focus-visible`, `prefers-reduced-motion`.

---

## 💾 Dane zapisywane w przeglądarce (LocalStorage)

Wszystko zostaje wyłącznie na urządzeniu użytkownika (szczegóły w `polityka.html`). Dane postępu w grach użytkownik może skasować przyciskiem „Wyzeruj rekord i osiągnięcia”:

| Klucz | Zawartość |
|---|---|
| `theme-cycle-index` | wybrany motyw kolorystyczny |
| `effects-disabled` | wyłączenie efektów sezonowych |
| `highScore`, `dinoStats`, `dinoAch`, `dinoSkin` | Dino: rekord, statystyki, osiągnięcia, skórka |
| `endixendi:tetris:highscore` | rekord Maratonu w Tetrisie |
| `endixendi:tetris:best:sprint` / `:ultra` / `:zen` / `:challenge` | najlepsze wyniki pozostałych trybów Tetrisa |
| `endixendi:tetris:stats`, `:ach`, `:skin`, `:mode` | Tetris: statystyki, osiągnięcia, skórka, ostatni tryb |
| `endixendi:shooter:highscore`, `:stats`, `:achievements`, `:settings` | Shooter: rekord, statystyki, osiągnięcia, ustawienia |
| `endixendi:battleship:stats`, `:ach` | Statki: statystyki i osiągnięcia |
| `endixendi:battleship:difficulty`, `:rules`, `:confirm` | Statki: ostatnio wybrany poziom, zasady i potwierdzanie strzału |
| `gamingOS_note` | treść Notatnika w PC Mode |

---

## 📂 Struktura projektu

```text
├── assets/
│   ├── css/
│   │   ├── battleship.css    # Style gry Statki
│   │   ├── dino.css          # Style gry Dino
│   │   ├── gallery.css       # Style galerii zdjęć
│   │   ├── games.css         # Wspólne style gier (przycisk pełnego ekranu, nakładki)
│   │   ├── linux.css         # Style strony Linux vs Windows
│   │   ├── pc-mode.css       # Style symulatora PC Mode
│   │   ├── shooter.css       # Style gry Shooter
│   │   ├── style.css         # Główny arkusz (zmienne, motywy, menu, stopka)
│   │   ├── tetris.css        # Style gry Tetris
│   │   └── tools.css         # Style stron narzędzi (tools-all, tools-rec)
│   ├── images/
│   │   ├── gallery/          # Zdjęcia galerii
│   │   ├── game/             # Ikony gier w PC Mode
│   │   ├── promos/           # Banery partnerów (strona główna)
│   │   ├── logo.png          # Awatar
│   │   ├── logo-dc.png       # Logo serwera Discord
│   │   ├── logo-kolo.png     # Awatar (wersja koło, favicon i loader)
│   │   └── qr-mobile.webp    # Kod QR dla urządzeń mobilnych
│   ├── js/
│   │   ├── battleship.js     # Logika gry i AI bota (Statki)
│   │   ├── dino.js           # Silnik gry Dino
│   │   ├── fullscreen.js     # Wspólna obsługa pełnego ekranu w grach
│   │   ├── gallery.js        # Siatka zdjęć, podgląd kinowy, lightbox
│   │   ├── pc-mode.js        # Silnik symulatora PC Mode
│   │   ├── script.js         # Wspólna logika: ładowanie menu/stopki, nawigacja, motywy, efekty sezonowe, panele
│   │   ├── shooter.js        # Silnik gry Shooter
│   │   ├── storage.js        # Bezpieczny wrapper localStorage (ładować jako pierwszy)
│   │   ├── tetris.js         # Silnik gry Tetris
│   │   └── tools.js          # Wyszukiwarka, filtr kategorii i licznik narzędzi
│   └── sounds/               # Efekty dźwiękowe i muzyka gier
│       ├── dino/ , global/ , shooter/ , statki/ , system/ , tetris/
│
├── 404.html                  # Własna strona błędu (GitHub Pages serwuje ją automatycznie)
├── battleship.html           # Gra Statki
├── CNAME                     # Własna domena dla GitHub Pages
├── dino.html                 # Gra Dino
├── footer.html               # Wspólna stopka (ładowana dynamicznie)
├── gallery.html              # Galeria
├── index.html                # Strona główna
├── LICENSE                   # Licencja (wszystkie prawa zastrzeżone)
├── linux.html                # Linux vs Windows
├── media.html                # Instagram i Spotify
├── menu.html                 # Wspólne menu (ładowane dynamicznie)
├── pc-mode.html              # Symulator systemu operacyjnego
├── polityka.html             # Polityka prywatności
├── regulamin.html            # Regulamin
├── robots.txt                # Reguły dla robotów (bez menu.html i footer.html)
├── shooter.html              # Gra Shooter
├── sitemap.xml               # Mapa strony dla wyszukiwarek
├── tetris.html               # Gra Tetris
├── tools-all.html            # Przydatne narzędzia
└── tools-rec.html            # Narzędzia do wideo i grafiki + poradniki YT
```

---

## 🎨 Źródła i Podziękowania (Resources)

Projekt wykorzystuje poniższe materiały od zewnętrznych twórców:

| Typ zasobu | Nazwa / Tytuł | Autor | Link |
| :--- | :--- | :--- | :--- |
| **Ikona** | YouTube TV macOS BigSur | Elias | [Zobacz](https://icon-icons.com/icon/youtube-tv-macos-bigsur/189526) |
| **Tło wideo** | The Ride (12 Hours, 4K) | VISUALDON | [Zobacz](https://youtu.be/pAoQXVAwp84) |
| **Muzyka** | HOME - Resonance | Electronic Gems | [Posłuchaj](https://youtu.be/8GW6sLrK40k) |

---

## ⚖️ Licencja i źródła zasobów

Kod, grafiki i teksty są własnością autora (patrz `LICENSE`). Zasoby zewnętrzne należą do ich twórców: muzyka i efekty z *Pixabay* oraz *YouTube Audio Library* (źródła podane na stronach gier), efekty systemowe PC Mode z *MyInstants*, ikony dystrybucji Linuksa z *Wikimedia Commons*.

---

## 📺 Wspieraj moją twórczość!

Jeśli podoba Ci się to, co robię, zostaw suba na moim kanale YouTube!

👉 **[Kliknij tutaj, aby zasubskrybować kanał Endixendi](https://www.youtube.com/c/Endixendi?sub_confirmation=1)** 🚀