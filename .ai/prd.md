# Dokument wymagań produktu (PRD) - Parinator
## 1. Przegląd produktu

### 1.1 Cel produktu
Parinator to webowa aplikacja wspierająca drużynowe parowania Warhammer 40k. Celem jest skrócenie czasu podejmowania decyzji, uporządkowanie danych wejściowych od graczy i umożliwienie kapitanowi przeprowadzenia pełnego procesu parowania zgodnie z logiką WTC dla składu 5-osobowego.

### 1.2 Kontekst biznesowy
MVP jest zamkniętym pilotażem. Produkt ma udowodnić, że:
- gracze są w stanie szybko i poprawnie dostarczać estymacje matchupów,
- kapitan może poprowadzić parowanie live w czasie do 30 minut,
- dane są wystarczająco spójne, aby wspierać decyzje turniejowe bez arkuszy i improwizacji.

### 1.3 Użytkownicy i role
- Gracz:
  - wykonuje estymacje na poziomie przeciwnika i rundy,
  - określa wpływ pierwszeństwa (Go 1st / Go 2nd),
  - ustawia preferencje stołów,
  - opcjonalnie dodaje komentarz do pary gracz-przeciwnik (max 200 znaków).
- Kapitan:
  - konfiguruje turniej i rundy,
  - zarządza kodem dołączania i składem,
  - korzysta z tabeli, symulatora i trybu live,
  - wpisuje końcowe wyniki gier ręcznie,
  - w MVP istnieje dokładnie jedno konto z uprawnieniami kapitana.

### 1.4 Założenia MVP
- Platforma: tylko przeglądarka.
- Język interfejsu: angielski.
- Model kont pilotażowych: 6 kont z listy `accounts.md` (1 kapitan, 5 graczy), bez możliwości dodania nowych użytkowników.
- Estymacje graczy wymagają połączenia online.
- Parowanie kapitana może działać offline z późniejszą synchronizacją.
- Wszystkie funkcje MVP są P0.

## 2. Problem użytkownika

### 2.1 Problemy graczy
- Brak jednolitego sposobu przekazania estymacji dla wielu przeciwników i rund.
- Ryzyko niekompletnych danych (brak oceny pierwszeństwa, brak preferencji stołów).
- Presja czasu i chaos informacyjny podczas turnieju.

### 2.2 Problemy kapitana
- Trudność szybkiego porównywania matchupów całej drużyny.
- Brak centralnego widoku łączącego estymacje, stoły i komentarze.
- Wysokie ryzyko błędów przy ręcznym śledzeniu symulacji i finalnych decyzji.
- Potrzeba pracy w warunkach słabego internetu.

### 2.3 Skutek biznesowy braku rozwiązania
- Wolniejsze i mniej trafne decyzje paringowe.
- Brak powtarzalności procesu i niższa jakość przygotowania drużyny.
- Brak danych historycznych do poprawy decyzji w kolejnych turniejach.

## 3. Wymagania funkcjonalne

### 3.1 Dostęp i tożsamość
- FR-001: System umożliwia logowanie wyłącznie kontom z predefiniowanej listy `accounts.md` w MVP.
- FR-002: System wymaga PIN-u 6-cyfrowego dla każdego konta.
- FR-003: System przypisuje role na podstawie konta i egzekwuje autoryzację widoków (kapitan vs gracz).
- FR-004: Konto kapitana jest unikalne w pilotażu (dokładnie jedno konto z uprawnieniami kapitańskimi).

### 3.2 Dołączanie do drużyny i kod dostępu
- FR-005: Po konfiguracji turnieju system generuje 6-cyfrowy kod dołączenia.
- FR-006: Kod jest usuwany po osiągnięciu limitu graczy.
- FR-007: Po usunięciu gracza system generuje nowy kod, a limit odpowiada wolnym miejscom.
- FR-008: Jedyną ścieżką dołączenia gracza do drużyny jest kod od kapitana.

### 3.3 Konfiguracja turnieju i rund
- FR-009: Kapitan może utworzyć turniej na podstawie linku ChampionsHub lub Best Coast Pairings.
- FR-010: System pobiera rozpiski przez scraping i zapisuje je w bazie.
- FR-011: Dla ponownie użytego turnieju system korzysta z cache w bazie.
- FR-012: Jeśli scraping się nie powiedzie, kapitan może wkleić dowolny tekst jako fallback.
- FR-013: Kapitan konfiguruje rundy: misja, deployment, stoły, opcjonalnie drużyna przeciwna.

### 3.4 Estymacje gracza
- FR-014: Gracz widzi tylko aktywne turnieje.
- FR-015: Gracz widzi status ukończenia estymacji na poziomie rund.
- FR-016: W estymacji wymagane jest wejście w rozpiskę przeciwnika przed zapisaniem oceny.
- FR-017: Dla pytania o pierwszeństwo system wspiera:
  - jedną estymację, gdy pierwszeństwo bez znaczenia,
  - dwie estymacje (Go 1st, Go 2nd), gdy pierwszeństwo ma znaczenie.
- FR-018: System udostępnia kolorową skalę WTC z nakładającymi się zakresami.
- FR-019: Każdy kolor estymacji musi mieć widoczną etykietę tekstową, preferencyjnie na elemencie koloru.
- FR-020: Gracz może oznaczyć znaczenie stołów i uzupełnić preferencje per stół.
- FR-021: Gracz może zakończyć wybór stołów w dowolnym momencie i wrócić do dashboardu.
- FR-022: Komentarz gracza do pary gracz-przeciwnik ma limit 200 znaków.
- FR-023: Estymacje graczy mogą być zapisywane tylko online.

### 3.5 Tabela parowania kapitana
- FR-024: Kapitan ma dostęp do tabeli match-upów (wiersze: własna drużyna, kolumny: przeciwnicy).
- FR-025: Komórka tabeli pokazuje 1 lub 2 kolory zależnie od wpływu pierwszeństwa.
- FR-026: Kliknięcie komórki otwiera modal z preferencjami stołów, informacją o znaczeniu stołów i komentarzem.
- FR-027: Tabela kapitana ma być stale widoczna na docelowym układzie horyzontalnym.

### 3.6 Symulator parowania
- FR-028: System wspiera wizard parowania zgodny z procesem WTC dla 5-osobowej drużyny.
- FR-029: Po zatwierdzeniu kroku wybrane armie są usuwane z aktywnej tabeli.
- FR-030: Kapitan może zapisywać wiele symulacji, oznaczać je jako lepsze/gorsze i sortować.
- FR-031: System pokazuje czytelne podsumowanie każdej symulacji.

### 3.7 Parowanie live
- FR-032: Tryb live współistnieje z symulacjami w tej samej rundzie.
- FR-033: Po wejściu w live kapitan może edytować wybory do momentu finalnego zatwierdzenia.
- FR-034: Po finalnym zatwierdzeniu i zamknięciu parowania edycja jest zablokowana w MVP.
- FR-035: Po zakończeniu live system wyświetla finalną tabelę par: przeciwnik, estymacja, stół, komentarz, wynik.
- FR-036: Wyniki gier wpisuje wyłącznie kapitan, ręcznie.

### 3.8 Widok Estymatora
- FR-037: Widok Estymatora prezentuje kafelki kolorów z etykietami i kafelek czasomierza.
- FR-038: Każde kliknięcie kafelka zapisuje wpis z timestampem.
- FR-039: Po każdym kliknięciu układ kafelków jest losowany.
- FR-040: Kapitan wskazuje gracza, który wybiera kafelek.
- FR-041: Timestampy są prezentowane w lokalnej strefie czasowej przeglądarki.

### 3.9 Spójność danych i reguły resetu
- FR-042: Zmiana drużyny przeciwnej w rundzie usuwa wszystkie estymacje i komentarze graczy dla tej rundy.
- FR-043: Zmiana misji, deploymentu lub stołów nie usuwa automatycznie estymacji.

### 3.10 Tryb offline dla parowania kapitana
- FR-044: W trybie offline parowanie zapisuje pełny stan lokalnie.
- FR-045: Po odzyskaniu internetu system synchronizuje dane lokalne do backendu.
- FR-046: W konflikcie dane lokalne mają priorytet i nadpisują serwer.
- FR-047: Po skutecznej synchronizacji dane offline są usuwane lokalnie.

### 3.11 Zasoby stołów
- FR-048: Grafiki stołów są przechowywane w bazie aplikacji.
- FR-049: Każda grafika stołu ma metadane źródła (link/atrybucja).

## 4. Granice produktu

### 4.1 Zakres MVP
- Aplikacja webowa.
- Przepływ WTC dla 5-osobowego składu.
- Konta pilotażowe z `accounts.md`.
- Estymacje online, parowanie z obsługą offline.
- Import przez scraping z fallbackiem ręcznego wklejenia.
- Symulator, live i Estymator.
- Manualne wpisywanie wyników przez kapitana.

### 4.2 Poza zakresem MVP
- Natywna aplikacja mobilna.
- Publiczny onboarding nowych kont i samorejestracja.
- Automatyczne symulacje parowań.
- Historia turniejów gracza.
- Odwracanie osi tabeli.
- Wsparcie 8-osobowych składów.
- Integracje logowania Apple/Google/email/MyWarhammer/BCP.
- Powiadomienia push/in-app.
- Integracja z zewnętrznymi systemami wyników.

### 4.3 Ograniczenia i zależności
- Zespół: 1 developer + AI.
- Import zależy od stabilności źródeł zewnętrznych i zmian w ich strukturze.
- Jakość danych fallbacku zależy od jakości ręcznie wklejanego tekstu.
- Model bezpieczeństwa jest adekwatny do pilotażu zamkniętego, nie do szerokiego publicznego rolloutu.
- `accounts.md` z PIN-ami musi pozostać poza repozytorium publicznym.

### 4.4 Rekomendacje implementacyjne MVP (decyzje)
- Architektura MVP powinna być uproszczona: `Next.js + Supabase` jako domyślna baza aplikacji, bez wymogu osobnego backendu domenowego w pierwszej iteracji.
- `NestJS` jest opcjonalny na etapie MVP i powinien zostać dołączony dopiero, gdy wzrośnie złożoność integracji, obciążenie lub zakres logiki backendowej.
- Zarządzanie stanem po stronie klienta powinno zaczynać od lokalnego stanu + Context (oraz cache zapytań), a dedykowany globalny store należy wdrażać dopiero po pojawieniu się realnego problemu skalowania stanu.
- Scraping i import danych turniejowych powinny działać server-side jako zadania asynchroniczne z retry i fallbackiem ręcznym, bez rozbudowanej orkiestracji usług na starcie.
- Tryb offline dla kapitana powinien opierać się o lokalny magazyn danych (np. IndexedDB) oraz jawny mechanizm synchronizacji po odzyskaniu sieci, zgodny z regułą "local wins" z FR-046.
- Architektura MVP powinna być przygotowana do stopniowego rozszerzania (modułowość), ale bez wdrażania pełnej złożoności docelowej przed walidacją pilotażu.

## 5. Historyjki użytkowników

### US-001
- ID: US-001
- Tytuł: Logowanie kontem pilotażowym
- Opis: Jako użytkownik chcę zalogować się pinem do przypisanego konta, aby wejść do aplikacji i zobaczyć tylko właściwe funkcje.
- Kryteria akceptacji:
  - System przyjmuje tylko konta z listy pilotażowej.
  - PIN musi mieć dokładnie 6 cyfr.
  - Błędny PIN nie loguje użytkownika.
  - Po zalogowaniu użytkownik widzi widoki zgodne z rolą.

### US-002
- ID: US-002
- Tytuł: Autoryzacja roli kapitana
- Opis: Jako kapitan chcę mieć dostęp do widoków kapitańskich, aby prowadzić parowanie i administrację rundą.
- Kryteria akceptacji:
  - Tylko konto kapitana widzi tabelę parowania, symulator, live i konfigurację turnieju.
  - Konto gracza nie ma dostępu do ekranów kapitana.
  - Próba wejścia gracza na URL kapitański kończy się odmową dostępu.

### US-003
- ID: US-003
- Tytuł: Tworzenie turnieju z linku
- Opis: Jako kapitan chcę wkleić link do turnieju, aby szybko zainicjalizować dane wejściowe.
- Kryteria akceptacji:
  - System przyjmuje link do ChampionsHub lub Best Coast Pairings.
  - Po poprawnym imporcie tworzy rekord turnieju.
  - Kapitan może przejść do konfiguracji rund.

### US-004
- ID: US-004
- Tytuł: Fallback importu przez ręczne wklejenie
- Opis: Jako kapitan chcę wkleić dowolny tekst z rozpiskami, gdy scraping zawiedzie, aby nie zatrzymać procesu.
- Kryteria akceptacji:
  - Po błędzie scrapingu system udostępnia pole ręcznego wklejenia.
  - System zapisuje wklejony tekst i podejmuje parsowanie.
  - Kapitan dostaje informację o wyniku parsowania (sukces/częściowy sukces/błąd).

### US-005
- ID: US-005
- Tytuł: Reużycie cache turnieju
- Opis: Jako kapitan chcę ponownie użyć danych już zaimportowanego turnieju, aby uniknąć ponownego pobierania.
- Kryteria akceptacji:
  - Dla znanego turnieju system pobiera dane z bazy.
  - System nie wymaga ponownego scrapingu, jeśli cache jest dostępny.

### US-006
- ID: US-006
- Tytuł: Konfiguracja rundy przez kapitana
- Opis: Jako kapitan chcę ustawić misję, deployment, stoły i opcjonalnie przeciwną drużynę, aby przygotować rundę do estymacji i parowania.
- Kryteria akceptacji:
  - Każda runda ma pola misji, deploymentu i stołów.
  - Przeciwna drużyna może być ustawiona lub pusta.
  - Zmiany są zapisywane i widoczne dla graczy.

### US-007
- ID: US-007
- Tytuł: Generowanie kodu dołączania
- Opis: Jako kapitan chcę wygenerować kod dołączania, aby gracze mogli wejść do drużyny.
- Kryteria akceptacji:
  - Po zakończeniu konfiguracji turnieju system generuje 6-cyfrowy kod.
  - Kod jest widoczny dla kapitana.
  - Kod pozwala dołączyć tylko do właściwej drużyny i turnieju.

### US-008
- ID: US-008
- Tytuł: Dołączanie gracza kodem
- Opis: Jako gracz chcę dołączyć do drużyny kodem od kapitana, aby mieć dostęp do właściwych rund i przeciwników.
- Kryteria akceptacji:
  - Gracz może dołączyć wyłącznie przez poprawny aktywny kod.
  - Po dołączeniu gracz widzi aktywny turniej drużyny.
  - Niepoprawny lub nieaktywny kod jest odrzucany.

### US-009
- ID: US-009
- Tytuł: Usunięcie kodu po osiągnięciu limitu
- Opis: Jako kapitan chcę, by kod znikał po zapełnieniu składu, aby nikt dodatkowy nie dołączył.
- Kryteria akceptacji:
  - Po zajęciu wszystkich miejsc kod staje się nieważny.
  - Próba użycia starego kodu po zapełnieniu składu kończy się błędem.

### US-010
- ID: US-010
- Tytuł: Regeneracja kodu po usunięciu gracza
- Opis: Jako kapitan chcę otrzymać nowy kod po usunięciu gracza, aby uzupełnić skład.
- Kryteria akceptacji:
  - Usunięcie gracza generuje nowy kod.
  - Nowy kod ma limit równy liczbie wolnych miejsc.
  - Stary kod jest nieważny.

### US-011
- ID: US-011
- Tytuł: Dashboard aktywnych turniejów gracza
- Opis: Jako gracz chcę widzieć tylko aktywne turnieje, aby szybko wejść do bieżących zadań.
- Kryteria akceptacji:
  - Widok zawiera tylko turnieje aktywne.
  - Gracz może wejść do wybranego turnieju jednym kliknięciem.

### US-012
- ID: US-012
- Tytuł: Status estymacji na liście rund
- Opis: Jako gracz chcę widzieć, które rundy mam ukończone, aby zarządzać swoją pracą.
- Kryteria akceptacji:
  - Każda runda ma status ukończona/nieukończona.
  - Status aktualizuje się po zapisaniu estymacji.

### US-013
- ID: US-013
- Tytuł: Wymuszenie wejścia w rozpiskę przeciwnika
- Opis: Jako organizator procesu chcę wymagać otwarcia rozpiski przed estymacją, aby zwiększyć jakość danych.
- Kryteria akceptacji:
  - Bez otwarcia rozpiski nie można zapisać estymacji.
  - Po otwarciu rozpiski krok estymacji staje się aktywny.

### US-014
- ID: US-014
- Tytuł: Estymacja z obsługą pierwszeństwa
- Opis: Jako gracz chcę zaznaczyć wpływ pierwszeństwa i podać odpowiednią liczbę estymacji, aby odzwierciedlić realny matchup.
- Kryteria akceptacji:
  - Opcja "pierwszeństwo bez znaczenia" wymaga jednej estymacji.
  - Opcja "pierwszeństwo ma znaczenie" wymaga dwóch estymacji: Go 1st i Go 2nd.
  - System nie pozwala zapisać niekompletnego wariantu.

### US-015
- ID: US-015
- Tytuł: Oznaczanie preferencji stołów
- Opis: Jako gracz chcę oznaczać stoły jako preferowane/neutralne/niepreferowane, aby pomóc kapitanowi dobrać stół.
- Kryteria akceptacji:
  - Każdy stół ma 3 stany preferencji.
  - Stan domyślny to neutralny.
  - W trakcie wyboru stołów zawsze widoczna jest misja rundy.

### US-016
- ID: US-016
- Tytuł: Opcjonalny komentarz do pary
- Opis: Jako gracz chcę dodać krótki komentarz do matchupu, aby przekazać kontekst kapitanowi.
- Kryteria akceptacji:
  - Komentarz jest opcjonalny.
  - Długość komentarza nie przekracza 200 znaków.
  - Po zapisaniu komentarz jest widoczny w modalu komórki tabeli.

### US-017
- ID: US-017
- Tytuł: Prezentacja kolorów z etykietą
- Opis: Jako użytkownik chcę widzieć etykietę na kolorze estymacji, aby interpretacja była jednoznaczna.
- Kryteria akceptacji:
  - Każdy kolor ma etykietę tekstową.
  - Etykieta jest widoczna w estymacjach gracza, tabeli kapitana i Estymatorze.

### US-018
- ID: US-018
- Tytuł: Podgląd danych w komórce tabeli
- Opis: Jako kapitan chcę otworzyć szczegóły komórki, aby zobaczyć preferencje stołów i komentarz.
- Kryteria akceptacji:
  - Kliknięcie komórki otwiera modal.
  - Modal pokazuje preferencje stołów.
  - Modal pokazuje informację o znaczeniu stołów.
  - Modal pokazuje komentarz, jeśli istnieje.

### US-019
- ID: US-019
- Tytuł: Symulator parowania 5-osobowego
- Opis: Jako kapitan chcę przejść krokowy wizard WTC, aby wypracować najlepszy układ par.
- Kryteria akceptacji:
  - Wizard zawiera wszystkie kroki procesu WTC dla 5 osób.
  - Po zatwierdzeniu kroku wybrane armie znikają z aktywnej tabeli.
  - Proces kończy się kompletem par dla rundy.

### US-020
- ID: US-020
- Tytuł: Zarządzanie listą symulacji
- Opis: Jako kapitan chcę zapisywać i porównywać wiele symulacji, aby wybrać najlepszy wariant.
- Kryteria akceptacji:
  - Każda symulacja zapisuje się na liście.
  - Symulację można oznaczyć jako lepszą/gorszą.
  - Lista może być sortowana.

### US-021
- ID: US-021
- Tytuł: Współistnienie symulacji i live
- Opis: Jako kapitan chcę korzystać z symulacji i live dla tej samej rundy, aby przejść od planu do wykonania.
- Kryteria akceptacji:
  - Dla tej samej rundy istnieją jednocześnie dane symulacji i live.
  - Wejście do live nie usuwa historii symulacji.

### US-022
- ID: US-022
- Tytuł: Edycja live przed finalnym zamknięciem
- Opis: Jako kapitan chcę edytować wybory w live aż do finalnego zatwierdzenia, aby skorygować decyzje w czasie rzeczywistym.
- Kryteria akceptacji:
  - Przed finalnym zatwierdzeniem można zmieniać wybory live.
  - Po finalnym zatwierdzeniu edycja live jest zablokowana.
  - Brak funkcji odblokowania w MVP.

### US-023
- ID: US-023
- Tytuł: Finalna tabela po live
- Opis: Jako kapitan chcę po live zobaczyć finalny układ par, aby domknąć rundę operacyjnie.
- Kryteria akceptacji:
  - Tabela finalna pokazuje pary gracz-przeciwnik.
  - Dla każdej pary widoczna jest estymacja i wybrany stół.
  - Widoczny jest komentarz i wynik gry.

### US-024
- ID: US-024
- Tytuł: Ręczne wpisywanie wyników przez kapitana
- Opis: Jako kapitan chcę ręcznie wpisać wynik każdej gry, aby zamknąć rundę bez integracji z zewnętrznym systemem.
- Kryteria akceptacji:
  - Tylko kapitan może edytować wyniki.
  - Gracz nie ma prawa edycji wyników.
  - Zapisany wynik jest widoczny w tabeli końcowej.

### US-025
- ID: US-025
- Tytuł: Widok Estymatora z losowaniem układu
- Opis: Jako kapitan chcę zbierać szybkie estymacje kafelkami i po każdym kliknięciu losować układ, aby ograniczyć nawykowe kliknięcia.
- Kryteria akceptacji:
  - Widok zawiera kafelki zakresów i kafelek czasomierza.
  - Po kliknięciu zapisuje się wpis z timestampem.
  - Po kliknięciu układ kafelków się zmienia.

### US-026
- ID: US-026
- Tytuł: Lokalna strefa czasowa timestampów
- Opis: Jako kapitan chcę widzieć timestampy w czasie lokalnym urządzenia, aby szybciej interpretować przebieg rundy.
- Kryteria akceptacji:
  - Timestampy są wyświetlane w strefie przeglądarki użytkownika.
  - Format czasu jest spójny we wszystkich widokach MVP.

### US-027
- ID: US-027
- Tytuł: Reset estymacji po zmianie drużyny przeciwnej
- Opis: Jako kapitan chcę automatycznie czyścić estymacje po zmianie przeciwnika drużynowego, aby uniknąć nieadekwatnych danych.
- Kryteria akceptacji:
  - Zmiana drużyny przeciwnej usuwa wszystkie estymacje i komentarze rundy.
  - Użytkownicy widzą pusty stan estymacji po zmianie.

### US-028
- ID: US-028
- Tytuł: Brak resetu estymacji po zmianie misji/deploymentu/stołów
- Opis: Jako kapitan chcę zachować estymacje przy zmianach innych niż drużyna przeciwna, aby nie tracić pracy graczy.
- Kryteria akceptacji:
  - Zmiana misji nie usuwa estymacji.
  - Zmiana deploymentu nie usuwa estymacji.
  - Zmiana zestawu stołów nie usuwa estymacji.

### US-029
- ID: US-029
- Tytuł: Wymaganie online dla estymacji gracza
- Opis: Jako gracz chcę wiedzieć, że estymacje wymagają połączenia online, aby nie stracić danych.
- Kryteria akceptacji:
  - Brak internetu blokuje zapis estymacji.
  - System pokazuje czytelny komunikat o wymaganym połączeniu.
  - Po powrocie internetu gracz może zapisać estymację bez restartu sesji.

### US-030
- ID: US-030
- Tytuł: Offline parowania i synchronizacja lokalna
- Opis: Jako kapitan chcę prowadzić parowanie offline i zsynchronizować je później, aby działać mimo problemów z internetem.
- Kryteria akceptacji:
  - Offline zapisuje pełny stan parowania lokalnie.
  - Po odzyskaniu internetu dane lokalne synchronizują się z backendem.
  - W konflikcie lokalne dane nadpisują serwer.
  - Po sukcesie synchronizacji lokalna kopia jest automatycznie usuwana.

### US-031
- ID: US-031
- Tytuł: Zarządzanie grafikami stołów z atrybucją
- Opis: Jako operator produktu chcę przechowywać grafiki stołów z linkiem źródłowym, aby mieć kontrolę nad pochodzeniem materiałów.
- Kryteria akceptacji:
  - Każda grafika stołu w bazie ma pole linku źródłowego.
  - Brak linku źródłowego jest raportowany jako błąd danych administracyjnych.

### US-032
- ID: US-032
- Tytuł: Ochrona danych kont pilotażowych
- Opis: Jako właściciel produktu chcę, aby dane `accounts.md` nie trafiały do repozytorium publicznego, aby ograniczyć ryzyko ujawnienia PIN-ów.
- Kryteria akceptacji:
  - `accounts.md` jest ignorowany przez Git.
  - Repozytorium nie zawiera jawnych PIN-ów kont pilotażowych.

## 6. Metryki sukcesu

### 6.1 Metryki produktowe MVP
- MS-001: Czas przeprowadzenia parowania live przez kapitana (od wejścia w live do finalnego zatwierdzenia) <= 30 minut w co najmniej 80 procentach rund pilotażu.
- MS-002: Odsetek rund z kompletem estymacji graczy przed startem live >= 90 procent.
- MS-003: Mediana czasu wykonania estymacji jednego przeciwnika przez gracza <= 60 sekund.
- MS-004: Odsetek rund, w których kapitan wykonał co najmniej 1 symulację przed live >= 80 procent.

### 6.2 Metryki jakości i niezawodności
- MS-005: Skuteczność importu przez scraping >= 70 procent, przy 100 procent dostępności fallbacku ręcznego.
- MS-006: Skuteczność synchronizacji offline->online dla parowania >= 99 procent prób.
- MS-007: Liczba przypadków utraty danych estymacji lub parowania = 0 w pilotażu.
- MS-008: Odsetek poprawnie zablokowanych prób dostępu gracza do funkcji kapitana = 100 procent.

### 6.3 Metryki użyteczności
- MS-009: Co najmniej 80 procent użytkowników pilotażu deklaruje, że aplikacja przyspiesza proces w porównaniu z wcześniejszym sposobem pracy.
- MS-010: Co najmniej 80 procent użytkowników deklaruje, że etykiety na kolorach są czytelne i jednoznaczne.

### 6.4 Przegląd checklisty jakości PRD
- Czy każdą historię użytkownika można przetestować: tak, każda historia zawiera mierzalne kryteria akceptacji.
- Czy kryteria akceptacji są jasne i konkretne: tak, kryteria są zdefiniowane przez warunki wejścia, akcję i oczekiwany wynik.
- Czy mamy wystarczająco dużo historyjek użytkownika, aby zbudować w pełni funkcjonalną aplikację: tak, zakres obejmuje scenariusze podstawowe, alternatywne i skrajne dla gracza, kapitana oraz operacji pilotażu.
- Czy uwzględniono wymagania uwierzytelniania i autoryzacji: tak, obejmują je US-001, US-002 i US-032.
