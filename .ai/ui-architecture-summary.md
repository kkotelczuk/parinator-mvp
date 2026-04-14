<conversation_summary>
<decisions>
1.  **Struktura nawigacji:** Zastosowanie breadcrumbów dla hierarchii Turniej -> Runda. Domyślny widok po wejściu w turniej to "Active Round". Przełączanie drużyn odbywa się przez Dashboard.
2.  **Widok Matrix dla graczy:** Wyłącznie do odczytu (read-only), bez interakcji. Wyświetlana porada dotycząca rotacji urządzenia do pionu (portrait) dla lepszej czytelności.
3.  **Bramka ukończenia estymacji:** Widok matrixa dla gracza jest rozmyty (blurred) do momentu ukończenia własnych estymacji (weryfikacja przez `/estimation-status/me`).
4.  **Import turnieju:** W przypadku błędu scrapingu, UI oferuje sekcję "Paste Raw Text" wewnątrz modala importu.
5.  **Status synchronizacji:** Implementacja ikony "Tactical Cloud" informującej kapitana o stanie synchronizacji "Offline / Syncing / Up to date". Synchronizacja blokuje akcje destrukcyjne (Hard Reset).
6.  **Tryb Live:** Wyraźna sygnalizacja wizualna (Neon Green), odrębny HUD i podwójne potwierczenie finalizacji parowania.
7.  **Panel boczny (Side Panel):** Szczegóły komórki matrixa (preferencje stołów, komentarze) otwierane w wysuwanym panelu bocznym zamiast modala.
8.  **Hard Reset:** Wyzwalany przez modal wymagający wpisania nazwy przeciwnika. Reset dotyczy tylko konkretnej rundy, a nie całego turnieju.
9.  **Wprowadzanie wyników i punktów:** Użycie standardowej klawiatury numerycznej (z pełnym wsparciem klawiatury fizycznej na desktopie).
10. **Logowanie:** Interfejs typu OTP (6 osobnych pól) dla kodu PIN.
11. **Roster:** Zarządzanie składem (5 slotów) przez Drag-and-Drop z logiką zamiany miejsc (swap) i walidacją unikalności.
12. **Weryfikacja rozpisek:** Rozpiska przeciwnika otwierana jako modal pełnoekranowy; zamknięcie i odblokowanie estymacji możliwe dopiero po przewinięciu do dołu i kliknięciu "Checked".
13. **Galeria stołów:** Grupowanie według paczek (WTC, GW, Alpine) i filtrowanie według typu Deploymentu. Możliwość łączenia różnych paczek w jednej rundzie.
14. **Zarządzanie stanem rundy:** Blokada edycji ("Locked State") sygnalizowana wizualnie (znak wodny/zmiana kolorystyki na szarości). Możliwość "Recalibrate Phase" w wizardzie parowania bez resetu całego przebiegu.
15. **Dashboard:** Podział na "Active Operations" i "Tactical Archive" (zwinięte domyślnie).
</decisions>

<matched_recommendations>
1.  **Architektura "Midnight Matrix":** Brutalistyczny interfejs HUD, 0px border-radius, wysoka gęstość danych, Space Grotesk dla nagłówków, Inter dla danych.
2.  **Strategia Mobile-First dla Graczy:** Uproszczone przepływy estymacji na mobile, przy zachowaniu pełnego Matrixa na desktopie dla Kapitana.
3.  **Wizard parowania:** Implementacja "Phase-Aware Wizard" mapującego kroki API (`defender_pick`, `attacker_selection`) na dedykowane komponenty UI.
4.  **Offline Captain Mode:** Wykorzystanie IndexedDB do persystencji stanów wizardów ("Draft Run") i jawny proces synchronizacji "Local Wins".
5.  **Integracja API:** Caching przez SWR/TanStack Query dla punktu końcowego `/matrix` z natychmiastową rewalidacją po synchronizacji offline.
6.  **Bezpieczeństwo RLS:** UI ściśle egzekwuje uprawnienia zwracane przez JWT (Captain vs Player) – np. ukrywanie przycisków edycji wyników dla graczy.
</matched_recommendations>

<ui_architecture_planning_summary>
**a. Główne wymagania dotyczące architektury UI:**
System musi wspierać ekstremalną gęstość danych (Technical Density) przy zachowaniu czytelności na urządzeniach mobilnych. Kluczowym elementem jest asymetria ról: Kapitan zarządza procesem na Desktopie (Matrix, Simulator), podczas gdy Gracze dostarczają dane przez Mobile (Wizard). Estetyka "Tactical HUD" (Midnight Matrix) narzuca brak zaokrągleń i wysokokontrastowe sygnały funkcyjne.

**b. Kluczowe widoki i przepływy:**
*   **Dashboard:** Centralny węzeł z podziałem na aktywne operacje i archiwum.
*   **Estimation Wizard (Player):** Krytyczny przepływ mobilny wymuszający weryfikację rozpisek (scroll-to-bottom) przed wprowadzeniem punktów (klawiatura numeryczna).
*   **Pairing Matrix (Captain/Player):** Główny widok danych z Side Panelem dla detali. Dla graczy widok zablokowany do czasu ukończenia zadań.
*   **Pairing Simulator/Live (Captain):** Wizard krokowy (WTC 5-man) z automatycznym zapisem stanu ("Draft Run").

**c. Strategia integracji z API i zarządzania stanem:**
*   **State:** Reaktywne zarządzanie stanem przez TanStack Query (SWR).
*   **Offline:** IndexedDB do przechowywania snapshotów parowania w trybie offline. Mechanizm "Local Wins" przy re-neksji.
*   **API Context:** Dynamiczne przełączanie kontekstu drużyny/członkostwa wpływa na globalny stan filtrowania danych.

**d. Responsywność, dostępność i bezpieczeństwo:**
*   **Responsywność:** Matrix optymalizowany pod Desktop; na Mobile porada o rotacji ekranu.
*   **Bezpieczeństwo:** PIN-input (OTP style), setup lock (Setup Verification step), ochrona przed destrukcyjnymi akcjami (Hard Reset modal).
*   **Dostępność:** FR-019 (etykiety tekstowe na kolorach) zapewnia czytelność niezależnie od rozróżniania barw.

**e. Estetyka:**
Wykorzystanie systemu "Midnight Matrix" – ciemne tło (#0e0e0e), akcenty Steel Blue i sygnały Neon Green dla trybu Live.
</ui_architecture_planning_summary>

<qa_history>
### Batch 1: Core Flows & Matrix
*   **Q: Transition between Tournament/Round?** -> **Decision:** Breadcrumbs/Sub-nav; default to Active Round.
*   **Q: Mobile Matrix for Players?** -> **Decision:** Read-only Matrix with vertical orientation advice.
*   **Q: Estimation Gate UI?** -> **Decision:** Blurred view for unfinished tasks.
*   **Q: Scraping failure fallback?** -> **Decision:** "Paste Raw Text" section in import modal.
*   **Q: Sync Status communication?** -> **Decision:** "Tactical Cloud" icon (Offline/Syncing/Up to date).
*   **Q: Live vs Simulation visual?** -> **Decision:** Neon Green HUD overlay for Live mode.
*   **Q: Matrix Cell interaction?** -> **Decision:** Side Panel (Drawer) instead of Modal.
*   **Q: Hard Reset UX?** -> **Decision:** Modal requiring typing current opponent's name; scoped to round.
*   **Q: Performance optimization?** -> **Decision:** SWR/TanStack Query with auto-revalidation.

### Batch 2: Roster & Entry Details
*   **Q: Team Switching?** -> **Decision:** Managed via Dashboard context switch.
*   **Q: PIN Login UI?** -> **Decision:** 6 discrete OTP-style numeric boxes.
*   **Q: Roster Slot Assignment?** -> **Decision:** Drag-and-Drop grid with swap logic.
*   **Q: Dynamic Phase Rendering?** -> **Decision:** Phase-Aware Wizard mapping steps to UI templates.
*   **Q: Estimator Live Feed?** -> **Decision:** Real-time Side Panel log.
*   **Q: List verification (FR-016)?** -> **Decision:** Full-page modal, scroll-to-bottom + check button to unlock.
*   **Q: Score entry method?** -> **Decision:** Standard numeric keyboard.
*   **Q: Setup Lock prevention?** -> **Decision:** Dedicated "Setup Verification" step before locking.
*   **Q: Table Asset selection?** -> **Decision:** Gallery with Deployment filters and Pack selection (WTC/GW/Alpine).

### Batch 3: Reliability & Refinement
*   **Q: Wizard persistence?** -> **Decision:** Automatically save draft runs on browser close.
*   **Q: Desktop score entry UX?** -> **Decision:** Physical keyboard support + fallback keypad.
*   **Q: Destructive actions during sync?** -> **Decision:** Block "Hard Reset" while synchronization is active.
*   **Q: Locked round visual?** -> **Decision:** Muted Grey visual signature and read-only labels.
*   **Q: Wizard Undo/Phase Reset?** -> **Decision:** "Recalibrate Phase" button for current step.
*   **Q: Dashboard Prioritization?** -> **Decision:** Split into "Active Operations" and "Tactical Archive".
</qa_history>

<unresolved_issues>
1.  Brak szczegółowego projektu wizualnego "Split-Cells" (diagonale CSS) w widoku Matrixa na małych ekranach.
2.  Konieczność doprecyzowania zachowania UI w momencie, gdy dwóch kapitanów próbowałoby edytować parowanie (mimo założenia MVP o jednym koncie kapitana, plan API musi przewidzieć blokady optymistyczne).
3.  Szczegółowa obsługa błędów parsowania "Paste Raw Text" – jak bardzo granularne powinny być ostrzeżenia dla kapitana.
</unresolved_issues>
</conversation_summary>
