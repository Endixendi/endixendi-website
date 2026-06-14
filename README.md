# 🦖 endixendi.pl — Oficjalna Strona Internetowa

Witaj w oficjalnym repozytorium strony **endixendi.pl**. Jest to moje osobiste miejsce w sieci, w którym gromadzę swoją twórczość, autorskie gry przeglądarkowe, poradniki oraz informacje o sprzęcie i projektach związanych z grami oraz technologią.

---

## 👨‍💻 O mnie
Tworzę treści wideo od 2014 roku, zaczynając od kultowej serii z MTA na YouTube. Moja pasja do gamingu oraz technologii łączy się z wykształceniem informatycznym, co pozwala mi samodzielnie rozwijać ten projekt i dzielić się wiedzą z odbiorcami. Chcę tworzyć miejsce, w którym pasja do gier łączy ludzi z Polski i ze świata.

---

## 🕹️ Zawartość strony (Moduły)

Strona wykorzystuje czysty JavaScript do dynamicznego wstrzykiwania powtarzalnych elementów strukturalnych (takich jak menu i stopka), co ułatwia zarządzanie całym projektem.

### 🎮 Sekcja Gier Przeglądarkowych
* **Dino Game (`dino.html`)** – Klasyczna zręcznościowa gra inspirowana kultowym projektem z Chrome. Skacz kwadratowym dinozaurem przez przeszkody, kontroluj głośność audio i bij rekordy (również na telefonie z dedykowanym sterowaniem dotykowym).
* **Tetris (`tetris.html`)** – Przeglądarkowa wersja retro klasyka z systemem Hold/Next, punktacją, poziomami trudności oraz pełnym sterowaniem mobilnym i klawiaturowym.
* **Shooter Game (`shooter.html`)** – Dynamiczna strzelanka kosmiczna. Broń się przed wrogimi statkami, uważaj na pasek zdrowia oraz temperaturę dział (system przegrzewania broni!).
* **Statki — Bitwa Morska (`statki.html`)** – Strategiczna gra planszowa w neonowym wydaniu. Zmierz się z komputerem na trzech poziomach trudności: *Łatwy*, *Trudny* oraz... *Cheater*.

### 📱 Informacje i Multimedia
* **Strona Główna (`index.html`)** – Centrum dowodzenia. Zawiera sekcję "O mnie", pełną specyfikację mojego PC oraz urządzeń peryferyjnych, odnośniki do social media, widgety Instagrama i Spotify oraz najnowsze filmy z YouTube.
* **Narzędzia (`tools.html`)** – Zestawienie programów, z których korzystam na co dzień do montażu, streamowania i grafiki (OBS, DaVinci Resolve, Photopea, Vectorpea) wraz z osadzoną playlistą moich poradników z YT.
* **Galeria (`gallery.html`)** – Przestrzeń z dynamicznie ładowaną siatką zdjęć, gdzie prezentuję wybrane projekty, screenshoty oraz inspiracje.

---

## 🛠️ Architektura i Technologie

Projekt stawia na szybkość działania, lekkość i brak ciężkich frameworków (Vanilla Tech Stack):

* **HTML5** – Semantyczna struktura dokumentów dostosowana do standardów dostępności (Aria-labels).
* **CSS3** – Nowoczesny, responsywny design (**Mobile First**) oparty na autorskim systemie klas narzędziowych (Utility-first CSS) wspierany efektami neonowymi i sezonowymi.
* **JavaScript (ES6+)** – Logika gier oparta na obiektach `<canvas>` asynchroniczne modularne ładowanie komponentów HTML oraz obsługa API audio dla efektów dźwiękowych i muzyki w tle.

---

## 📂 Struktura Projektu

```text
├── assets/
│   ├── css/
│   │   ├── battleship.css    # Style dedykowane grze Statki
│   │   ├── dino.css          # Style dedykowane grze Dino
│   │   ├── gallery.css       # Style dedykowane galerii zdjęć
│   │   ├── linux.css         # Style dedykowane stronie linux
│   │   ├── shooter.css       # Style dedykowane grze Shooter
│   │   ├── style.css         # Główny arkusz stylów strony
│   │   ├── tools.css         # Style dedykowane stronie tools-all
│   │   └── tetris.css        # Style dedykowane grze Tetris
│   ├── images/               # Zasoby graficzne, ikony, kod QR
│   │   ├── gallery/          # Zdjęcia wyświetlane w galerii
│   │   ├── 1.png             # Zdjęcie mojego awatara wersja 1
│   │   ├── 2.png             # Zdjęcie mojego awatara wersja 2
│   │   ├── 3.png             # Zdjęcie mojego awatara wersja 3
│   │   ├── 4.png             # Zdjęcie mojego awatara wersja 4
│   │   ├── ECv2.png          # Logo serwera Discord
│   │   ├── baner.jpg         # Baner z mojego kanału YouTube
│   │   ├── kolo.png          # Zdjęcie mojego awatara wersja koło
│   │   └── qr-mobile.webp    # Kod QR dla urządzeń mobilnych
│   ├── js/
│   │   ├── battleship.js     # Logika gry i AI bota w Statki
│   │   ├── dino.js           # Silnik gry Dino
│   │   ├── gallery.js        # Dynamiczne ładowanie siatki zdjęć
│   │   ├── script.js         # Wspólna logika (efekty sezonowe, ładowanie menu)
│   │   ├── shooter.js        # Silnik gry Shooter
│   │   └── tetris.js         # Silnik gry Tetris
│   └── sounds/               # Efekty dźwiękowe i ścieżki dźwiękowe gier
│       ├── dino/
│       │   └── dino-bg.webm  # Muzyka tła dla gry Dino
│       ├── global/           # Dźwięki współdzielone między grami
│       │   ├── drop.webm
│       │   ├── explosion.webm
│       │   ├── gameover-retro.webm
│       │   ├── gameover-sad.webm
│       │   ├── hit.webm
│       │   ├── jump.webm
│       │   ├── laser.webm
│       │   ├── line-clear.webm
│       │   ├── point.webm
│       │   ├── rotate.webm
│       │   └── success.webm
│       ├── shooter/
│       │   └── shooter-bg.webm # Muzyka tła dla gry Shooter
│       ├── statki/
│       │   └── battle-bg.webm  # Muzyka tła dla gry Statki
│       └── tertis/
│           └── tetris-bg.webm  # Muzyka tła dla gry Tetris
│
├── CNAME                     # Konfiguracja własnej domeny dla GitHub Pages
├── README.md                 # Dokumentacja projektu
├── dino.html                 # Gra Dino
├── footer.html               # Wspólna stopka stron (ładowana dynamicznie)
├── gallery.html              # Galeria projektów
├── index.html                # Strona główna (Portfolio & PC Spec)
├── linux.html                # Strona Linux vs Windows
├── menu.html                 # Wspólne menu stron (ładowane dynamicznie)
├── shooter.html              # Gra Shooter
├── statki.html               # Gra Statki
├── tetris.html               # Gra Tetris
├── tools-rec.html            # Spis narzędzi i poradniki YT
└── tools-all.html            # Spis narzędzi online
```
## 📺 Wspieraj moją twórczość!

Jeśli podoba Ci się to, co robię, i chcesz być na bieżąco z nowymi materiałami, zostaw suba na moim kanale YouTube! 

👉 **[Kliknij tutaj, aby zasubskrybować kanał Endixendi](https://www.youtube.com/c/Endixendi?sub_confirmation=1)** 🚀
