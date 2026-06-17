# 🖥️ endixendi.pl — Oficjalna Strona Internetowa

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
* **Narzędzia (`tools-all.html` / `tools-rec.html`)** – Zestawienie programów, z których korzystam na co dzień do montażu, streamowania i grafiki (OBS, DaVinci Resolve, Photopea, Vectorpea) wraz z osadzoną playlistą moich poradników z YT.
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
│   │   ├── pc-mode.css         # Style dedykowane stronie pc-mode
│   │   ├── shooter.css       # Style dedykowane grze Shooter
│   │   ├── style.css         # Główny arkusz stylów strony
│   │   └── tetris.css        # Style dedykowane grze Tetris
│   │   └── tools.css         # Style dedykowane stronie tools-all
│   ├── images/               # Zasoby graficzne, ikony, kod QR
│   │   ├── gallery/          # Zdjęcia wyświetlane w galerii
│	│	│	└── ...
│   │   ├── game/          	  # Zdjęcia ikon gier w pc-mode
│	│	│	└── ...
│   │   ├── logo.png          # Zdjęcie mojego awatara
│   │   ├── logo-dc.png       # Logo serwera Discord
│   │   ├── logo-kolo.png     # Zdjęcie mojego awatara wersja koło
│   │   └── qr-mobile.webp    # Kod QR dla urządzeń mobilnych
│   ├── js/
│   │   ├── battleship.js     # Logika gry i AI bota w Statki
│   │   ├── dino.js           # Silnik gry Dino
│   │   ├── gallery.js        # Dynamiczne ładowanie siatki zdjęć
│   │   ├── pc-mode.js        # Sylnik gry pc-mode
│   │   ├── script.js         # Wspólna logika (efekty sezonowe, ładowanie menu)
│   │   ├── shooter.js        # Silnik gry Shooter
│   │   └── tetris.js         # Silnik gry Tetris
│   └── sounds/               # Efekty dźwiękowe i ścieżki dźwiękowe gier
│       ├── dino/
│       │   └── dino-bg.mp3   # Muzyka tła dla gry Dino
│       ├── global/           # Dźwięki współdzielone między grami
│       │   ├── drop.mp3
│       │   ├── explosion.mp3
│       │   ├── gameover-retro.mp3
│       │   ├── gameover-sad.mp3
│       │   ├── hit.mp3
│       │   ├── jump.mp3
│       │   ├── laser.mp3
│       │   ├── line-clear.mp3
│       │   ├── point.mp3
│       │   ├── rotate.mp3
│       │   └── success.mp3
│       ├── shooter/
│       │   └── shooter-bg.mp3 								# Muzyka tła dla gry Shooter
│       ├── statki/
│       │   └── battle-bg.mp3  								# Muzyka tła dla gry Statki
│       ├── system/
│       │   ├── bartosz.mp3									# Zapętlona muzyka tła sterowana mikserem w pc-mode
│       │   ├── microsoft-windows-xp-shutdown-sound.mp3		# Dźwięk sekwencji zamykania systemu pc-mode
│       │   └── windows-xp-startup.mp3  					# Dźwięk powitalny przy starcie systemu pc-mode
│       └── tetris/
│           └── tetris-bg.mp3  								# Muzyka tła dla gry Tetris
│
├── battleship.html           # Gra Statki
├── CNAME                     # Konfiguracja własnej domeny dla GitHub Pages
├── dino.html                 # Gra Dino
├── footer.html               # Wspólna stopka stron (ładowana dynamicznie)
├── gallery.html              # Galeria projektów
├── index.html                # Strona główna (Portfolio & PC Spec)
├── linux.html                # Strona Linux vs Windows
├── menu.html                 # Wspólne menu stron (ładowane dynamicznie)
├── pc-mode.html              # Symulator systemu operacyjnego
├── polityka.html     		  # Polityka Prywatności
├── README.md                 # Dokumentacja projektu
├── regulamin.html    		  # Regulamin Serwisu
├── shooter.html              # Gra Shooter
├── tetris.html               # Gra Tetris
├── tools-all.html            # Spis narzędzi online
└── tools-rec.html            # Spis narzędzi i poradniki YT
```
## 📺 Wspieraj moją twórczość!

Jeśli podoba Ci się to, co robię, i chcesz być na bieżąco z nowymi materiałami, zostaw suba na moim kanale YouTube! 

👉 **[Kliknij tutaj, aby zasubskrybować kanał Endixendi](https://www.youtube.com/c/Endixendi?sub_confirmation=1)** 🚀