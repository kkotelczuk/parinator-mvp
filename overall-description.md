# Parinator

## Cel aplikacji

Parinator ma przyspieszyć i uporządkować proces parowania w drużynowych turniejach Warhammer 40k.

## Ustalenia produktowe (MVP)

- **Język interfejsu:** angielski.
- **Platforma:** wyłącznie aplikacja przeglądarkowa (bez natywnej aplikacji mobilnej w MVP).
- **Zespół:** jeden developer wspierany przez AI.
- **Priorytetyzacja:** wszystkie funkcje wymienione w zakresie MVP mają priorytet **P0** — muszą zostać dostarczone w pierwszym release.
- **Kryteria sukcesu (jakościowe, bez pełnej analityki na start):**
  - Gracz może ukończyć estymację **szybko i poprawnie** (przepływ bez zbędnych przeszkód).
  - Kapitan może przeprowadzić proces parowania z widocznym wsparciem w UI tak, aby **zmieścić się w ok. 30 minut** (cel orientacyjny).
  - Szersze metryki produktowe — do zbierania po starcie; w PRD/MVP nie zakładamy jeszcze twardych KPI poza powyższymi oczekiwaniami.
- **Pilotaż zamknięty:** MVP traktujemy jako **wewnętrzny / ograniczony** (bez ambicji „public produkt security” na tym etapie); nadal unikamy jawnego publikowania sekretów (np. PIN-ów) — patrz `accounts.md` poniżej.

## Role użytkowników

### Gracz

- Uzupełnia estymacje dla przeciwników w danej rundzie.
- Ocenia znaczenie pierwszeństwa (`Go 1st` / `Go 2nd`).
- Oznacza preferencje stołów.
- Opcjonalnie dodaje komentarz do danego pairingu (**MVP:** maks. **200 znaków**, **bez filtrów** treści).

### Kapitan

- Zakłada i konfiguruje turniej.
- Tworzy drużynę i zaprasza graczy (to jedyna ścieżka dołączenia).
- Korzysta z trybu parowania (symulator i live).
- Może również pełnić rolę gracza.
- **MVP:** w pilotażu jest **dokładnie jedno konto** z uprawnieniami kapitana (pozostałe konta to gracze).

## Segmenty aplikacji

Aplikacja ma dwa główne segmenty:

1. **Tryb estymowania** (dla graczy)
2. **Tryb parowania** (dla kapitana)

---

## 1) Tryb estymowania (gracz)

### Przepływ estymacji

1. Gracz wybiera aktywny turniej i rundę.
2. Wybiera przeciwnika, którego chce estymować.
3. Musi wejść w rozpiskę przeciwnika (kroku nie można pominąć).
4. Odpowiada na pytanie: czy pierwszeństwo ma znaczenie?
   - **Nie** -> jedna estymacja.
   - **Tak** -> dwie estymacje: `Go 1st` i `Go 2nd`.
5. Wybiera zakres estymacji (kolor).
6. Wybiera:
   - **Stoły mają znaczenie** -> przejście do wyboru stołów.
   - **Stoły nie mają znaczenia** -> powrót do dashboardu przeciwników.

### Skala kolorów estymacji (WTC)

Zakresy są celowo częściowo nakładające się. **Dostępność / czytelność:** przy każdym kolorze estymacji zawsze widoczna jest **etykieta tekstowa** (zakres lub opis); **najlepiej umieszczona bezpośrednio na elemencie koloru** (nie tylko w legendzie).

- Czerwony: `0-4`
- Pomarańczowy: `5-9`
- Żółty: `8-10`
- Zielony: `11-15`
- Ciemnozielony: `15-20`
- Fioletowy: `0-20` (flip, bardzo wysoka losowość)

### Wybór stołów

- Dla każdego stołu dostępne opcje:
  - Preferowany
  - Neutralny (domyślna)
  - Niepreferowany
- Gracz może zakończyć w dowolnym momencie i wrócić do dashboardu.
- Podczas wyboru stołów zawsze widoczna jest misja rundy.

### Ekrany (gracz)

1. **Dashboard turniejów**
   - Gracz może być w wielu turniejach jednocześnie.
   - W MVP pokazujemy tylko turnieje aktywne.
2. **Dashboard turnieju**
   - Lista rund z oznaczeniem: ukończone / nieukończone estymacje.
3. **Widok rundy**
   - Misja, deployment i lista przeciwników (`imię / armia`).
4. **Widok estymacji**
   - Główna funkcjonalność opisana powyżej.
5. **Profil gracza**
   - Na ten moment wyświetlenie maila.
   - **MVP — konta pilotażowe (`accounts.md`):** **6 kont** — **1 kapitan** i **5 graczy**; lista e-maili / identyfikatorów i PIN-ów w pliku `accounts.md` (przygotowywana przy budowie). **Nie ma możliwości rozszerzenia** o kolejnych użytkowników w tym pilotażu. Konta aktywowane przy wdrożeniu MVP.
   - **Bezpieczeństwo operacyjne:** `accounts.md` zawiera wrażliwe dane — **nie commitować do repozytorium publicznego**; trzymać poza Gitem lub w `.gitignore` (patrz plik `.gitignore` w projekcie).
   - **Po MVP (docelowo):** standardowe hasła oraz logowanie m.in. przez Apple, Google, e-mail; ewentualnie integracje typu MyWarhammer, Best Coast Pairings — do doprecyzowania.

### Wymagania UX/UI (gracz)

- Widoki estymacji projektowane mobile-first (orientacja pionowa).
- Po MVP: pełna aplikacja mobilna, dobre skalowanie na telefonach.
- Mapa stołu jako obraz z możliwością płynnego zoomu bez utraty jakości.
- Kolory estymacji: zawsze z **etykietą** (patrz skala kolorów).

---

## 2) Tryb parowania (kapitan)

W **MVP** symulator i parowanie live mają odzwierciedlać **proces WTC** (zgodnie z materiałem referencyjnym PDF), przy założeniu składu **5-osobowego**.

### Główny widok tabeli

- Dostępny tylko dla kapitana.
- Wiersze: zawodnicy własnej drużyny.
- Kolumny: przeciwnicy.
- W MVP układ jest stały; po MVP możliwe odwracanie osi.

### Zawartość komórki tabeli

- 1 kolor: gdy gracz uznał, że pierwszeństwo nie ma znaczenia.
- 2 kolory: gdy pierwszeństwo ma znaczenie (`Go 1st` po lewej).
- Przy prezentacji kolorów w tabeli obowiązuje ta sama zasada co u gracza: **zawsze etykieta** (najlepiej **na** kolorze / kafelku).
- Kliknięcie komórki otwiera modal z:
  - preferencjami stołów gracza,
  - informacją "stoły bez znaczenia" (jeśli dotyczy),
  - komentarzem gracza dla pary `gracz-przeciwnik` (jeśli dodany).

### Wymagania UX/UI (kapitan)

- Tabela musi być stale widoczna.
- Widok przeznaczony głównie dla orientacji poziomej (tablet i większe ekrany).

### Dwa tryby pracy kapitana

1. **Symulator parowania**
2. **Parowanie Live**

Dla **tej samej rundy** symulacje i tryb **live mogą i powinny współistnieć** (symulacje jako przygotowanie, live jako faktyczny przebieg).

#### Symulator parowania

- Przepływ typu wizard
- Kroki:
  1. Wybór defendera własnej drużyny.
  2. Wybór możliwych attackerów przeciwnika.
  3. Wybór defendera przeciwnika.
  4. Wybór naszych "dostawek" do ich defendera.
  5. Wybór finalnych par i zatwierdzenie.
  6. Dobór stołów dla każdej pary przed finalnym potwierdzeniem.
- Po zatwierdzeniu wybrane armie są usuwane z aktywnej tabeli.
- **MVP:** proces dla drużyny **5-osobowej** zgodnie z przepływem WTC; drużyny 8-osobowe — **po MVP** (lub odrębna iteracja zakresu).
- Każda symulacja zapisywana na liście; kapitan może oznaczać je jako lepsze/gorsze i sortować.
- Automatyczne symulacje: **po MVP**.
- Na końcu czytelne podsumowanie symulacji.

#### Parowanie Live

- Logika jak w symulatorze, ale używana do faktycznego procesu turniejowego.
- **Edycja w live (MVP):** po wejściu w tryb live kapitan może **dowolnie edytować wybrane opcje** aż do momentu **ostatecznego zatwierdzenia całego parowania i zamknięcia** tej sesji live. **Po zamknięciu edycja nie jest możliwa** (brak odblokowania w MVP).
- Po zakończeniu kapitan widzi tabelę końcową:
  - kto gra na kogo,
  - estymacja,
  - wybrany stół,
  - komentarze,
  - wynik po zakończeniu gry.
- W trakcie gier kapitan może zbierać bieżące estymacje od graczy; dane mają być widoczne w tabeli z timestampem (**wyświetlanym w strefie czasowej lokalnej przeglądarki**) oraz wybranym kolorem (z etykietą).
- **Wyniki gier:** wyłącznie kapitan wprowadza je **ręcznie** (brak integracji z zewnętrznymi systemami wyników w MVP).

### Widok Estymatora (dla kapitana podczas rundy)

- Kafelki kolorów: jak w reszcie UI — **etykieta zawsze widoczna**, najlepiej **na kafelku**.
- Widok bez tabeli, oparty o kafelki kolorów:
  - `0-2` czarny
  - `2-4` czerwony
  - `5-8` pomarańczowy
  - `9-11` żółty
  - `12-14` zielony
  - `15-17` jasnozielony
  - `17-20` błękitny
- Dodatkowy kafelek "czasomierz" zapisuje biały wpis z timestampem.
- Po każdym kliknięciu układ kafelków jest losowany ponownie.
- Kapitan wybiera gracza, który będzie wybierał kafelek.

---

## Zakładanie i konfiguracja turnieju (kapitan)

1. Kapitan wkleja link do turnieju (ChampionsHub lub Best Coast Pairings).
2. **Import rozpisek:** realizowany przez **scraping** strony źródłowej; dane zapisywane są w bazie. **Jeśli import się nie powiedzie**, kapitan może **wkleić dowolny tekst** z rozpiskami (**minimalne zabezpieczenia**, akceptowalne w **zamkniętym pilotażu**); parsowanie / normalizacja według specyfikacji technicznej (PRD/impl.).
3. Przy ponownym użyciu tego samego turnieju dane pobierane są z bazy, nie ze źródła zewnętrznego.
4. Kapitan ustawia na każdą rundę:
   - misję,
   - deployment,
   - stoły z bazy (kategorie: WTC / Alpine / GW oraz per deployment).
5. Opcjonalnie wybiera przeciwną drużynę dla każdej rundy.
6. Po zakończeniu setupu system generuje 6-cyfrowy kod dostępu.
7. Kapitan przekazuje kod graczom, określa czy sam gra oraz liczebność drużyny.
8. **Cykl kodu dołączenia:** po osiągnięciu limitu graczy w drużynie **kod jest usuwany** (unieważniany), a nie tylko „zablokowany”.
9. **Zmiana składu:** po usunięciu gracza przez kapitana (wraz z jego estymacjami) system generuje **zupełnie nowy kod**; limit dołączeń odpowiada **aktualnej liczbie wolnych miejsc** w drużynie.

### Zmiany w konfiguracji rundy (MVP)

- Kapitan **nie „uruchamia”** rundy jako osobnego zdarzenia — **uzupełnia i edytuje** konfigurację rundy (misja, deployment, przeciwnik itd.).
- **Brak powiadomień (push/in-app) do graczy** w MVP.
- **Niszczenie estymacji (MVP):** wyłącznie zmiana **przeciwnej drużyny** dla danej rundy powoduje usunięcie **wszystkich estymacji i komentarzy** graczy w tej rundzie — gracze muszą je wykonać ponownie. Zmiany misji, deploymentu, zestawu stołów itp. **same w sobie nie czyszczą** estymacji.

### Grafiki stołów

- Grafiki stołów są **wprowadzane na etapie tworzenia aplikacji** i przechowywane **w naszej bazie**.
- Każda grafika ma **pole z linkiem / atrybucją źródła** (proweniencja), aby ułatwić zgodność prawną i ewentualną weryfikację.

### Łączność (MVP)

- **Estymacje graczy:** wymagają **aktywnego połączenia online** (zapis i spójność danych).
- **Parowanie (kapitan) — offline:** cały przebieg parowania **zapisuje się lokalnie**; po odzyskaniu internetu dane są **wysyłane do backendu**. **Pierwszeństwo ma zawsze pamięć lokalna:** jeśli dane dla danego zakresu istnieją lokalnie, przy synchronizacji **nadpisują wartość na serwerze**, po czym **są automatycznie usuwane z lokalnej kopii** (lokalne „wygrywają”, potem czyszczone).

---

## Zakres MVP vs po MVP

### MVP (wszystko P0)

- Tryb estymowania gracza (**online**).
- Tryb parowania kapitana (tabela + podstawowy symulator + live); **przepływ zgodny z WTC dla drużyny 5-osobowej**; parowanie dopuszczalne także **offline**.
- Widok Estymatora (kafelki kolorów + timestampy).
- Aktywne turnieje na dashboardzie (bez historii).
- Konta pilotażowe: **`accounts.md`** — **6 kont** (1 kapitan, 5 graczy) + PIN; kod dołączenia do drużyny z zasadami usunięcia / regeneracji opisanymi wyżej.
- Import turnieju przez **scraping** + fallback **dowolny tekst** (pilotaż, minimalne security); cache rozpisek w bazie.
- Grafiki stołów w bazie z **linkiem źródła**.
- Wyniki gier: **tylko kapitan, ręcznie**.

### Po MVP

- Historia turniejów gracza.
- Możliwość odwracania osi tabeli parowań.
- Automatyczne symulacje parowań.
- Drużyny 8-osobowe (lub rozszerzenie formatu).
- Rozszerzenie kont: standardowe hasła, logowanie Apple / Google / e-mail, ewentualnie MyWarhammer / BCP.
- Powiadomienia dla graczy (jeśli potrzebne).
- Dalsze doprecyzowanie importu i synchronizacji danych z zewnętrznych serwisów.

## Materiał referencyjny PDF (dla analizy)

**Plik:** [`WTC-Pairings-Visualized-2022v6 (1).pdf`](./WTC-Pairings-Visualized-2022v6%20(1).pdf)

- Lokalizacja w repozytorium: katalog główny projektu (`parinator-poc`), nazwa dokładnie jak wyżej.
- Zawartość: wizualizacja procesu parowań WTC (2022, wersja dokumentu v6) — diagramy i przepływ uzupełniające opis trybu parowania w tym dokumencie.
- **Dla agentów:** przy analizie wymagań, UX symulatora/live parowania lub zgodności z konwencją WTC **wczytaj ten PDF** obok `overall-description.md` (narzędzie Read na ścieżce względnej `./WTC-Pairings-Visualized-2022v6 (1).pdf` od rootu workspace).

Jeśli pliku nie ma w folderze projektu, skopiuj go pod powyższą nazwą, żeby odnośnik i analiza były możliwe.

---

Dodatkowe źródła widzy o procesie parowania:
https://grimhammertactics.com/competitive-40k-how-to-prepare-for-warhammer-40k-teams-events/
