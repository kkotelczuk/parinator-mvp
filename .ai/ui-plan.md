# Architektura UI dla Parinator

## 1. Przegląd struktury UI

Architektura UI jest oparta o asymetrię ról i kontekstu użycia: kapitan pracuje głównie na desktopie (wysoka gęstość danych, matrix, symulator, live), a gracze głównie na mobile (krótkie, sekwencyjne flow estymacji). UI jest podzielone na trzy warstwy:
- Warstwa dostępu i kontekstu (logowanie PIN, wybór aktywnej drużyny/członkostwa, autoryzacja roli).
- Warstwa operacyjna turnieju (setup, roster, kody dołączania, konfiguracja rund, matrix, symulacje, live, estymator).
- Warstwa historyczna i diagnostyczna (widoki read-only po lock/close, status synchronizacji, importy, audyt).

Kluczowe założenia UX:
- Priorytet szybkości decyzji i gęstości informacji dla kapitana (widok `Pairing Matrix` jako centrum dowodzenia).
- Mobile-first dla gracza: minimum kroków, jasne statusy ukończenia, szybki powrót do listy rund.
- Silna sygnalizacja stanów krytycznych: `Live`, `Offline`, `Syncing`, `Locked`, `Closed`, `Hard Reset`.

Kluczowe założenia dostępności:
- Wszystkie kolory estymacji zawsze mają etykietę tekstową (nie tylko kolor).
- Kontrast i czytelność w trybie ciemnym, czytelne stany focus, pełna obsługa klawiatury na desktopie.
- Komunikaty błędów i walidacji przekazywane także tekstowo (nie tylko ikoną/kolorem).

Kluczowe założenia bezpieczeństwa:
- Twarde rozdzielenie uprawnień kapitan/gracz na poziomie nawigacji i akcji.
- Brak ekspozycji danych spoza aktywnego kontekstu drużyny/członkostwa.
- Ochrona akcji destrukcyjnych (hard reset, finalize, close, revoke code) przez dodatkowe potwierdzenia.

### Kluczowe wymagania z PRD (wyodrębnienie)

- Dostęp i role: tylko konta pilotażowe + PIN 6-cyfrowy + ścisła autoryzacja widoków.
- Setup turnieju: import z linku + fallback manualny + cache + konfiguracja rund (nazwa, limit 200, jedna aktywna).
- Dołączanie: kod 6-cyfrowy z TTL, limitem użyć, regeneracją i unieważnianiem.
- Flow gracza: estymacje online, obowiązkowe otwarcie rozpiski, obsługa first-turn impact, preferencje stołów, komentarz <= 200.
- Flow kapitana: matrix z detalami komórki, symulator WTC, live z finalizacją, manualne wyniki.
- Spójność i niezawodność: hard reset rundy po zmianie przeciwnika, brak resetu przy zmianie misji/deploymentu/stołów, offline captain mode z `local wins`.
- Widoki historyczne: dane read-only po lock round / close tournament.

### Główne punkty końcowe API i ich cel

- `POST /auth/pin-login`, `POST /auth/context`: wejście do aplikacji i przełączanie kontekstu drużyny.
- `GET /tournaments`, `POST /tournaments`, `POST /tournaments/{id}/lock-setup`, `POST /tournaments/{id}/close`: cykl życia turnieju.
- `GET/PUT /tournaments/{id}/roster`: skład i sloty turniejowe.
- `GET/POST /tournaments/{id}/join-code*`, `POST /join-codes/redeem`: zarządzanie kodami i dołączaniem graczy.
- `GET/POST/PATCH /rounds*`, `POST /rounds/{id}/activate`, `POST /rounds/{id}/lock`: konfiguracja i status rund.
- `GET/PUT /rounds/{id}/estimations*`, `GET /rounds/{id}/estimation-status/me`: wprowadzanie i bramka ukończenia estymacji.
- `GET/PUT/DELETE /rounds/{id}/table-preferences*`: preferencje stołów gracza.
- `GET /rounds/{id}/matrix*`: agregat matrixa + detale komórki.
- `GET/POST/PATCH /rounds/{id}/pairing-runs*`, `PUT /pairing-runs/{id}/steps|assignments`, `POST /pairing-runs/{id}/finalize`, `GET /rounds/{id}/final-pairings`: symulator i live.
- `PATCH /pairing-assignments/{id}/result`: ręczne wpisywanie wyników.
- `POST/GET /rounds/{id}/estimator-sessions*`, `POST/GET /estimator-sessions/{id}/events`: widok estymatora kafelkowego.
- `POST/GET /rounds/{id}/offline-sync`: synchronizacja offline captain mode.
- `POST /imports/tournaments`, `POST /imports/tournaments/fallback`, `GET /import-runs*`: import i fallback.
- `POST /rounds/{id}/opponent-team`, `POST /rounds/{id}/hard-reset`: reset rundy.
- `GET /audit-events`: wgląd diagnostyczny i zgodność operacyjna.

## 2. Lista widoków

### 2.1 Widok logowania PIN
- Nazwa widoku: `PIN Login`
- Ścieżka widoku: `/login`
- Główny cel: Uwierzytelnienie konta pilotażowego i wejście do właściwego kontekstu.
- Kluczowe informacje do wyświetlenia: email/login, 6-polowy PIN (OTP style), status błędu prób logowania, status offline.
- Kluczowe komponenty widoku: formularz logowania, pola PIN, komunikaty błędów, przycisk logowania.
- UX, dostępność i względy bezpieczeństwa: auto-przechodzenie focus między polami PIN, wsparcie wklejania 6 cyfr, rate-limit feedback, brak ujawniania czy konto istnieje.

### 2.2 Dashboard kontekstu drużyny i turniejów
- Nazwa widoku: `Team & Tournament Dashboard`
- Ścieżka widoku: `/dashboard`
- Główny cel: Wybór aktywnej drużyny i wejście do aktywnych operacji lub archiwum.
- Kluczowe informacje do wyświetlenia: aktywna drużyna, lista turniejów (`active`/`closed`), role, sekcje `Active Operations` i `Tactical Archive`.
- Kluczowe komponenty widoku: przełącznik kontekstu członkostwa, lista kart turniejów, filtry statusu, skróty do ostatniej aktywnej rundy.
- UX, dostępność i względy bezpieczeństwa: czytelne etykiety kontekstu, brak mieszania danych między drużynami, klikalne stany z klawiatury.

### 2.3 Setup turnieju i import
- Nazwa widoku: `Tournament Setup`
- Ścieżka widoku: `/tournaments/new` oraz `/tournaments/{tournamentId}/setup`
- Główny cel: Utworzenie turnieju, import danych i przygotowanie rund.
- Kluczowe informacje do wyświetlenia: źródło importu, status importu, użycie cache, ostrzeżenia parsowania fallbacku.
- Kluczowe komponenty widoku: formularz źródła URL, modal fallback `Paste Raw Text`, status import run, przycisk `Lock Setup`.
- UX, dostępność i względy bezpieczeństwa: nieblokujący fallback przy błędzie scrapingu, jasne komunikaty `success/partial/error`, blokada zmian `team_size` po lock.

### 2.4 Zarządzanie składem i kodem dołączania
- Nazwa widoku: `Roster & Join Code`
- Ścieżka widoku: `/tournaments/{tournamentId}/roster`
- Główny cel: Ustalenie składu, slotów i bezpieczne dołączanie graczy.
- Kluczowe informacje do wyświetlenia: 5+ slotów, rola/isPlaying, aktywny kod, TTL, pozostałe użycia, status pełnego składu.
- Kluczowe komponenty widoku: siatka slotów (drag-and-drop ze swap), panel kodu join, akcje generate/revoke/regenerate.
- UX, dostępność i względy bezpieczeństwa: walidacja unikalności członków/slotów, wyraźny licznik TTL, ukrywanie kodu po wyczerpaniu miejsc.

### 2.5 Dołączanie gracza kodem
- Nazwa widoku: `Join by Code`
- Ścieżka widoku: `/join`
- Główny cel: Dołączenie do turnieju przez kod od kapitana.
- Kluczowe informacje do wyświetlenia: pole 6 cyfr, status walidacji, wynik dołączenia.
- Kluczowe komponenty widoku: input kodu, CTA `Join`, komunikaty `expired/exhausted/team full`.
- UX, dostępność i względy bezpieczeństwa: szybkie retry bez odświeżania, neutralne komunikaty o błędnym kodzie, ograniczenie prób.

### 2.6 Lista rund (gracz)
- Nazwa widoku: `Player Round List`
- Ścieżka widoku: `/tournaments/{tournamentId}/rounds`
- Główny cel: Pokazanie aktywnych rund i statusu ukończenia estymacji.
- Kluczowe informacje do wyświetlenia: nazwa rundy, status `completed/not completed`, aktywna runda na górze.
- Kluczowe komponenty widoku: lista kart rund, badge statusu, CTA `Continue estimation`.
- UX, dostępność i względy bezpieczeństwa: jednoznaczne statusy postępu, szybki powrót z wizarda, widoczność tylko danych kontekstu gracza.

### 2.7 Wizard estymacji gracza
- Nazwa widoku: `Matchup Estimation Wizard`
- Ścieżka widoku: `/rounds/{roundId}/estimations/wizard`
- Główny cel: Zebranie kompletu estymacji i preferencji stołów od gracza.
- Kluczowe informacje do wyświetlenia: przeciwnik, misja/deployment, stan `list checked`, first-turn impact, pola punktacji, komentarz.
- Kluczowe komponenty widoku: pełnoekranowy podgląd rozpiski z `scroll-to-bottom + Checked`, formularz punktacji, sekcja preferencji stołów, licznik znaków komentarza.
- UX, dostępność i względy bezpieczeństwa: blokada zapisu bez potwierdzenia przeczytania rozpiski, klawiatura numeryczna + wsparcie fizycznej klawiatury, komunikat o wymaganym online.

### 2.8 Matrix tylko-do-odczytu dla gracza
- Nazwa widoku: `Player Matrix (Read-Only Gate)`
- Ścieżka widoku: `/rounds/{roundId}/matrix`
- Główny cel: Wgląd w pełny matrix drużyny po ukończeniu własnych estymacji.
- Kluczowe informacje do wyświetlenia: agregat komórek matrixa, etykiety kolorów, status odblokowania (`completed`).
- Kluczowe komponenty widoku: tabela matrix, warstwa blur/gate przed ukończeniem, porada o orientacji ekranu.
- UX, dostępność i względy bezpieczeństwa: brak możliwości edycji, jasny komunikat warunku odblokowania, zachowanie czytelności na mobile.

### 2.9 Matrix kapitana + panel szczegółów komórki
- Nazwa widoku: `Captain Pairing Matrix`
- Ścieżka widoku: `/rounds/{roundId}/matrix/captain`
- Główny cel: Szybkie porównanie matchupów i decyzji dla całej rundy.
- Kluczowe informacje do wyświetlenia: 1/2 estymacje per komórka, podsumowania preferencji stołów, komentarz, status rundy, status sync.
- Kluczowe komponenty widoku: stała tabela matrix (horyzontalna), wysuwany side panel komórki (zamiast modala), toolbar z akcjami rundy.
- UX, dostępność i względy bezpieczeństwa: stała czytelność gęstego gridu, etykiety tekstowe w komórkach, blokada edycji przy `locked/closed`.

### 2.10 Dashboard symulacji
- Nazwa widoku: `Simulation Dashboard`
- Ścieżka widoku: `/rounds/{roundId}/simulations`
- Główny cel: Zarządzanie wieloma wariantami parowania.
- Kluczowe informacje do wyświetlenia: lista runów (`simulation`/`live`), ocena runu (`better/worse/neutral`), sortowanie, ostatnia aktywność.
- Kluczowe komponenty widoku: lista runów, filtry/sort, CTA `New Simulation`, CTA `Start Live`.
- UX, dostępność i względy bezpieczeństwa: jasne odróżnienie runów roboczych i finalnych, zachowanie historii symulacji po wejściu w live.

### 2.11 Wizard parowania (phase-aware)
- Nazwa widoku: `Pairing Simulator Wizard`
- Ścieżka widoku: `/pairing-runs/{pairingRunId}/wizard`
- Główny cel: Przeprowadzenie krokowego procesu WTC.
- Kluczowe informacje do wyświetlenia: aktualna faza (`defender_pick`, `attacker_selection`, ...), dostępne armie, przypisania, stoły.
- Kluczowe komponenty widoku: lewy panel matrix kontekstowy, panel decyzji fazy, timeline kroków, akcja `Recalibrate Phase`.
- UX, dostępność i względy bezpieczeństwa: redukcja błędów przez prowadzenie krokowe, autosave draftu, blokada przy konflikcie statusu rundy.

### 2.12 Tryb live (HUD)
- Nazwa widoku: `Live Pairing Mode`
- Ścieżka widoku: `/pairing-runs/{pairingRunId}/live`
- Główny cel: Prowadzenie parowania w czasie rzeczywistym z możliwością edycji do finalizacji.
- Kluczowe informacje do wyświetlenia: status `Live`, aktualne wybory, odliczanie/czas, stan sync online/offline.
- Kluczowe komponenty widoku: live HUD (neon green), panel szybkich korekt, podwójne potwierdzenie `Finalize`.
- UX, dostępność i względy bezpieczeństwa: silna sygnalizacja trybu krytycznego, podwójne potwierdzenie finalizacji, brak możliwości odblokowania finalu w MVP.

### 2.13 Widok finalnych par i wpisywania wyników
- Nazwa widoku: `Final Pairings & Results`
- Ścieżka widoku: `/rounds/{roundId}/final-pairings`
- Główny cel: Domknięcie rundy operacyjnie po live.
- Kluczowe informacje do wyświetlenia: para gracz-przeciwnik, estymacja, stół, komentarz, wynik 0..20.
- Kluczowe komponenty widoku: tabela końcowa, edytowalne pola wyników (tylko kapitan), akcja lock round.
- UX, dostępność i względy bezpieczeństwa: klawiatura numeryczna + desktop keyboard support, read-only dla graczy, walidacja zakresu wyników.

### 2.14 Widok estymatora kafelkowego
- Nazwa widoku: `Estimator Tile View`
- Ścieżka widoku: `/rounds/{roundId}/estimator`
- Główny cel: Szybkie zbieranie estymacji podczas dyskusji zespołu.
- Kluczowe informacje do wyświetlenia: aktywny gracz, wartość kafelka, event log z timestampami lokalnymi.
- Kluczowe komponenty widoku: losowana siatka kafelków, kafelek timera, side panel logu eventów.
- UX, dostępność i względy bezpieczeństwa: randomizacja układu po każdym kliknięciu, czytelne etykiety kolorów, chronologia zdarzeń.

### 2.15 Synchronizacja offline kapitana
- Nazwa widoku: `Offline Sync Center`
- Ścieżka widoku: globalny panel/drawer z każdego widoku kapitana
- Główny cel: Kontrola stanu offline/sync i odzyskiwania danych.
- Kluczowe informacje do wyświetlenia: status `Offline/Syncing/Up to date`, kolejka snapshotów, wynik ostatniej synchronizacji.
- Kluczowe komponenty widoku: ikona `Tactical Cloud`, lista snapshotów, akcja manualnego retry sync.
- UX, dostępność i względy bezpieczeństwa: czytelne stany bez utraty kontekstu, blokada akcji destrukcyjnych podczas synchronizacji, polityka `local wins`.

### 2.16 Historia, importy i audyt
- Nazwa widoku: `Diagnostics & History`
- Ścieżka widoku: `/tournaments/{tournamentId}/history` oraz `/diagnostics/imports`, `/diagnostics/audit`
- Główny cel: Wgląd w dane historyczne i diagnostyczne.
- Kluczowe informacje do wyświetlenia: import-runs, ostrzeżenia parsowania, eventy audytowe, zamknięte rundy/turnieje.
- Kluczowe komponenty widoku: tabele logów, filtry po typie zdarzeń, szczegóły zdarzenia.
- UX, dostępność i względy bezpieczeństwa: tryb read-only dla danych zamkniętych, filtrowanie po kontekście drużyny, brak ekspozycji danych poza uprawnieniami.

## 3. Mapa podróży użytkownika

### 3.1 Główny przypadek użycia (end-to-end)

1. Kapitan loguje się PIN-em i wybiera kontekst drużyny.
2. Tworzy turniej przez link importu; przy błędzie używa fallbacku `Paste Raw Text`.
3. Uzupełnia setup (roster, sloty, rundy, stoły, przeciwnik), generuje kod join z TTL.
4. Gracze logują się, dołączają kodem, widzą listę rund i statusy.
5. Gracz przechodzi wizard estymacji: otwarcie rozpiski -> punktacja -> preferencje stołów -> komentarz -> zapis online.
6. Po ukończeniu własnych estymacji gracz odblokowuje read-only matrix.
7. Kapitan analizuje matrix i szczegóły komórek, tworzy kilka symulacji i porównuje warianty.
8. Kapitan przechodzi do live, aktualizuje decyzje w czasie rzeczywistym, finalizuje parowania.
9. Kapitan wpisuje wyniki, zamyka rundę; dane rundy stają się read-only.
10. Po zamknięciu turnieju wszyscy członkowie mają dostęp do historii read-only.

### 3.2 Podróże alternatywne i przypadki brzegowe

- Brak internetu u gracza: zapis estymacji zablokowany + komunikat; po powrocie online możliwy zapis bez restartu.
- Brak internetu u kapitana: praca na lokalnym stanie (offline snapshot), późniejsza synchronizacja `local wins`.
- Kod join wygasł/wyczerpany: gracz dostaje błąd; kapitan regeneruje kod.
- Zmiana przeciwnika drużyny: UI wymusza potwierdzenie (wpisanie nazwy), po czym resetuje cały stan rundy.
- Runda lub turniej zablokowane/zamknięte: wszystkie widoki przechodzą do read-only z jasnym badge `Locked/Closed`.
- Trwająca synchronizacja: akcje destrukcyjne (np. hard reset) nieaktywne.

### 3.3 Główne punkty bólu użytkownika i odpowiedzi UI

- Presja czasu kapitana -> matrix zawsze dostępny + side panel detali bez opuszczania kontekstu.
- Chaotyczne dane graczy -> wizard z wymuszeniem otwarcia rozpiski i walidacją kompletności.
- Ryzyko błędnych decyzji w live -> odrębny HUD live + podwójna finalizacja.
- Słaby internet -> dedykowany status sync i jawny workflow offline.
- Nieczytelność kolorów -> etykiety tekstowe dla każdego koloru we wszystkich widokach.

### 3.4 Mapowanie historyjek użytkownika (US) do architektury UI

- US-001, US-002, US-032 -> `PIN Login`, `Team & Tournament Dashboard`, gating tras po roli.
- US-003, US-004, US-005, US-041 -> `Tournament Setup`, modal fallback, `Diagnostics & History`.
- US-006, US-033, US-043 -> `Tournament Setup`, `Roster & Join Code`, `Round Configuration`.
- US-007, US-008, US-009, US-010, US-038 -> `Roster & Join Code`, `Join by Code`.
- US-011, US-012 -> `Player Round List`.
- US-013, US-014, US-015, US-016, US-017, US-029, US-040 -> `Matchup Estimation Wizard`.
- US-018 -> `Captain Pairing Matrix` + side panel komórki.
- US-019, US-020, US-021 -> `Simulation Dashboard` + `Pairing Simulator Wizard`.
- US-022, US-023, US-024 -> `Live Pairing Mode` + `Final Pairings & Results`.
- US-025, US-026 -> `Estimator Tile View`.
- US-027, US-028, US-035 -> `Round Configuration` + potwierdzony `Hard Reset` flow.
- US-030 -> `Offline Sync Center`.
- US-031 -> `Table Assets` (sekcja konfiguracji stołów w setupie).
- US-034 -> `Final Pairings & Results` (akcja lock round).
- US-036 -> `Player Matrix (Read-Only Gate)`.
- US-037 -> `Team & Tournament Dashboard` (przełączanie kontekstu członkostw).
- US-039, US-042 -> `Diagnostics & History` + widoki closed tournament.

## 4. Układ i struktura nawigacji

### 4.1 Główna struktura tras

- Public:
  - `/login`
  - `/join`
- Private shared:
  - `/dashboard`
  - `/tournaments/{tournamentId}/history`
- Captain:
  - `/tournaments/new`
  - `/tournaments/{tournamentId}/setup`
  - `/tournaments/{tournamentId}/roster`
  - `/tournaments/{tournamentId}/rounds/{roundId}/matrix`
  - `/tournaments/{tournamentId}/rounds/{roundId}/simulations`
  - `/pairing-runs/{pairingRunId}/wizard`
  - `/pairing-runs/{pairingRunId}/live`
  - `/rounds/{roundId}/final-pairings`
  - `/rounds/{roundId}/estimator`
  - `/diagnostics/imports`, `/diagnostics/audit`
- Player:
  - `/tournaments/{tournamentId}/rounds`
  - `/rounds/{roundId}/estimations/wizard`
  - `/rounds/{roundId}/matrix` (read-only po bramce)

### 4.2 Wzorce nawigacyjne

- Hierarchia `Tournament -> Round` przez breadcrumb i sub-nav rund.
- Domyślny deep-link po wejściu w turniej: aktywna runda.
- Przełączanie drużyny wyłącznie z dashboardu (zmiana kontekstu JWT).
- Widoki krytyczne kapitana (`matrix`, `wizard`, `live`) mają stały pasek statusu sync.
- Przejścia destrukcyjne (hard reset, finalize, close) zawsze przez modal potwierdzenia.

### 4.3 Reguły kontroli dostępu w nawigacji

- Trasy kapitańskie niewidoczne i niedostępne dla gracza (UI + backend authorization).
- Gracz nigdy nie widzi kontrolek edycji wyników/symulacji/live.
- W stanie `locked/closed` te same trasy są dostępne tylko do odczytu.

## 5. Kluczowe komponenty

- `AuthPinForm`: logowanie PIN 6-cyfrowym kodem (OTP input, walidacja, błędy bezpieczeństwa).
- `ContextSwitcher`: aktywna drużyna i członkostwo; izolacja danych między kontekstami.
- `JoinCodePanel`: generowanie/odwołanie kodu, TTL, remaining uses, status pełności składu.
- `RoundListWithStatus`: lista rund z priorytetem aktywnej i badge ukończenia.
- `ListVerificationModal`: pełnoekranowa weryfikacja rozpiski z odblokowaniem estymacji.
- `EstimationForm`: first-turn impact, skale punktowe 0..20, komentarz <= 200, walidacja online.
- `TablePreferenceGrid`: preferencje `preferred/not_preferred/neutral` z czytelnymi etykietami.
- `PairingMatrixGrid`: centralny grid danych z etykietami kolorów i wariantem split-cell.
- `MatrixCellSidePanel`: preferencje stołów, komentarz, wpływ pierwszeństwa.
- `PairingRunList`: lista symulacji/live z oceną i sortowaniem.
- `PhaseAwareWizard`: renderowanie kroków WTC, timeline, `Recalibrate Phase`.
- `LiveHudBar`: status live, sygnalizacja krytyczna, kontrola finalizacji.
- `FinalPairingsTable`: końcowa tabela par z bezpieczną edycją wyników.
- `EstimatorTileBoard`: losowana siatka kafelków i log zdarzeń z lokalnym czasem.
- `SyncStatusCloud`: globalny wskaźnik `Offline/Syncing/Up to date` i kolejki snapshotów.
- `LockStateOverlay`: wspólny wzorzec read-only dla round locked / tournament closed.
- `ImportFallbackPanel`: ręczny import i prezentacja warningów parsowania.
- `AuditAndImportLogTable`: diagnostyka operacyjna i historia działań.

### 5.1 Mapowanie wymagań FR na elementy UI

- FR-001..004 -> `AuthPinForm`, routing per role, guardy nawigacyjne.
- FR-005..008a -> `JoinCodePanel`, `Join by Code`, walidacje TTL/użyć.
- FR-009..013b -> `Tournament Setup`, `RoundListWithStatus`, formularz rund i aktywacji.
- FR-014..023 -> `Player Round List`, `ListVerificationModal`, `EstimationForm`, `TablePreferenceGrid`.
- FR-024..027 -> `PairingMatrixGrid`, `MatrixCellSidePanel`, układ horyzontalny matrixa.
- FR-028..031 -> `PhaseAwareWizard`, `PairingRunList`, widok podsumowań symulacji.
- FR-032..036 -> `LiveHudBar`, `FinalPairingsTable`, kontrola edycji do finalizacji.
- FR-037..041 -> `EstimatorTileBoard`, `event log`, lokalna strefa czasowa.
- FR-042..043 -> `HardResetConfirmationModal`, reguły zachowania estymacji przy zmianach konfiguracji.
- FR-044..047 -> `SyncStatusCloud`, `Offline Sync Center`, workflow synchronizacji `local wins`.
- FR-048..049 -> moduł wyboru/zarządzania assetami stołów z metadanymi źródła.

### 5.2 Stany błędów i wyjątków (wspólne)

- `401/403` -> ekran/bramka dostępu z opcją powrotu do dashboardu.
- `409 ROUND_LOCKED` -> przejście komponentów do read-only + komunikat przy próbie zapisu.
- `409 LIVE_FINAL_ALREADY_EXISTS` -> zablokowanie ponownej finalizacji i przekierowanie do final pairings.
- `422 PARSING_FAILED` -> fallback importu z listą błędów i możliwością ponownego wklejenia.
- `CODE_EXPIRED_OR_EXHAUSTED` -> jasna informacja dla gracza + CTA dla kapitana do regeneracji.
- Konflikty sync/offline -> status `Syncing` + blokada akcji destrukcyjnych + retry.
