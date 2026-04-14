# Plan implementacji widoku Tournament Setup

## 1. Przegląd
Widok `Tournament Setup` odpowiada za uruchomienie całego procesu turniejowego po stronie kapitana: import danych turnieju ze wspieranego źródła, obsługę fallbacku przez ręczne wklejenie tekstu, konfigurację metadanych turnieju oraz przygotowanie rund do dalszej pracy zespołu. Widok musi wspierać dwa tryby pracy: utworzenie nowego turnieju z poziomu `/tournaments/new` oraz edycję już utworzonego turnieju pod `/tournaments/{tournamentId}/setup`.

Plan powinien realizować przede wszystkim cele z `US-003`, `US-004`, `US-005` i `US-041`, ale jednocześnie domknąć wymagania setupowe z PRD dotyczące `teamSize`, blokady setupu, konfiguracji rund, jednej rundy aktywnej oraz limitu 200 rund. Z perspektywy UX widok ma umożliwiać kapitanowi szybkie przejście od wklejenia linku do gotowego, spójnego setupu, bez wymuszania ręcznej pracy tam, gdzie backend potrafi użyć cache lub importu automatycznego.

## 2. Routing widoku
- Główne ścieżki:
  - `/tournaments/new` dla utworzenia nowego turnieju.
  - `/tournaments/[tournamentId]/setup` dla kontynuacji i edycji setupu istniejącego turnieju.
- Dostęp: tylko zalogowany użytkownik z aktywnym kontekstem członkostwa `captain`.
- Zachowanie routingu:
  - brak sesji -> redirect do `/login`,
  - brak aktywnego kontekstu drużyny -> redirect do `/dashboard`,
  - rola `player` -> ekran odmowy dostępu lub redirect do `/dashboard`,
  - po udanym imporcie w trybie `new` -> przejście do `/tournaments/[tournamentId]/setup`,
  - po udanym `lock-setup` -> rekomendowane przekierowanie do `/tournaments/[tournamentId]/roster`.
- Implementacja w App Router:
  - `apps/web/app/tournaments/new/page.tsx`,
  - `apps/web/app/tournaments/[tournamentId]/setup/page.tsx`.

## 3. Struktura komponentów
```text
TournamentSetupPage
└── TournamentSetupView
    ├── SetupHeader
    ├── ImportSourceForm
    ├── ImportStatusPanel
    ├── ImportFallbackModal
    ├── TournamentMetadataSection
    ├── ImportedDataSummary
    ├── RoundSetupSection
    │   ├── RoundList
    │   ├── RoundEditorCard
    │   └── RoundTablesEditor
    ├── SetupReadinessChecklist
    └── LockSetupBar
```

## 4. Szczegóły komponentów
### TournamentSetupPage
- Opis komponentu: komponent trasy odpowiedzialny za pobranie danych bootstrapujących i rozróżnienie trybu `create` oraz `edit`.
- Główne elementy: kontener strony (`main`), render `TournamentSetupView`.
- Obsługiwane zdarzenia:
  - wejście na trasę,
  - SSR bootstrap danych dla istniejącego `tournamentId`.
- Warunki walidacji:
  - użytkownik musi mieć aktywną sesję,
  - użytkownik musi mieć aktywne członkostwo `captain`,
  - w trybie `edit` przekazany `tournamentId` musi istnieć i należeć do aktywnej drużyny.
- Typy: `TournamentDetailDto`, `RoundSummaryDto`, `AuthContextResponseDto`, `AvailableMembershipDto`.
- Propsy:
  - brak dla komponentu routingu.

### TournamentSetupView
- Opis komponentu: główny kontener logiki widoku, spinający import, konfigurację turnieju, rundy, checklistę gotowości i blokadę setupu.
- Główne elementy: wrapper `section`, `SetupHeader`, sekcje formularzowe, stany ładowania/błędu, `LockSetupBar`.
- Obsługiwane zdarzenia:
  - submit importu URL,
  - otwarcie i submit fallbacku,
  - zmiana metadanych turnieju,
  - dodanie/edycja/usunięcie rundy,
  - zapis stołów rundy,
  - aktywacja rundy,
  - finalne `lock setup`.
- Warunki walidacji:
  - `teamSize >= 5`,
  - `teamSize` nie może być edytowany po `setupLockedAt`,
  - nie wolno pokazywać akcji edycji po `setupLockedAt`,
  - lista rund nie może przekroczyć 200 pozycji,
  - w danym turnieju może istnieć maksymalnie jedna runda `isActive=true`.
- Typy: `TournamentSetupViewModel`, `SetupAsyncState`, `SetupReadinessViewModel`.
- Propsy:
  - `mode: TournamentSetupMode`,
  - `initialTournament: TournamentDetailDto | null`,
  - `initialRounds: RoundSummaryDto[]`,
  - `activeTeamId: string`,
  - `activeMembershipId: string`.

### SetupHeader
- Opis komponentu: nagłówek widoku pokazujący tryb pracy, nazwę turnieju, źródło importu i stan blokady setupu.
- Główne elementy: `header`, tytuł widoku, badge trybu (`new` / `edit`), badge `Locked`, meta źródła.
- Obsługiwane zdarzenia:
  - kliknięcie `Back to dashboard`,
  - kliknięcie `Go to roster` po locku.
- Warunki walidacji:
  - poprawna prezentacja `sourceType`, `sourceUrl`, `setupLockedAt`,
  - nie pokazywać CTA zależnych od locku, jeśli turniej nie istnieje.
- Typy: `TournamentHeaderViewModel`.
- Propsy:
  - `header: TournamentHeaderViewModel`,
  - `onBack: () => void`,
  - `onOpenRoster: () => void`.

### ImportSourceForm
- Opis komponentu: formularz inicjujący import turnieju z URL lub wejście w tryb użycia istniejącego cache.
- Główne elementy: `form`, pole `tournamentName`, pole `teamSize`, `radio/select` dla `sourceType`, pole URL, przycisk `Import tournament`.
- Obsługiwane zdarzenia:
  - wpisanie nazwy turnieju,
  - wybór typu źródła,
  - wpisanie URL,
  - submit formularza,
  - kliknięcie `Use pasted text instead` przy błędzie importu.
- Warunki walidacji:
  - `name`: wymagane, niepuste, max 120 znaków,
  - `teamSize`: liczba całkowita >= 5,
  - `sourceType`: tylko `champions_hub` lub `best_coast_pairings` w ścieżce URL,
  - `sourceUrl`: wymagany i poprawny URL dla importu automatycznego,
  - brak możliwości edycji `teamSize` po locku.
- Typy: `ImportSourceFormValues`, `CreateTournamentCommand`, `ImportTournamentCommand`.
- Propsy:
  - `defaultValues: ImportSourceFormValues`,
  - `isSubmitting: boolean`,
  - `isLocked: boolean`,
  - `onSubmit: (values: ImportSourceFormValues) => Promise<void>`,
  - `onOpenFallback: () => void`.

### ImportStatusPanel
- Opis komponentu: panel statusu importu pokazujący wynik scrapingu, użycie cache i ostrzeżenia.
- Główne elementy: `section`, badge statusu (`success`, `partial_success`, `error`, `pending`), znacznik `usedCache`, lista warningów, komunikaty diagnostyczne.
- Obsługiwane zdarzenia:
  - kliknięcie `Retry import`,
  - kliknięcie `Open fallback`.
- Warunki walidacji:
  - `usedCache` pokazywać tylko dla odpowiedzi `POST /imports/tournaments`,
  - warningi pokazywać tylko dla statusu `partial_success`,
  - przy statusie błędu udostępnić CTA do fallbacku.
- Typy: `ImportRunStateViewModel`, `ImportTournamentAcceptedResponseDto`, `ImportTournamentFallbackResponseDto`.
- Propsy:
  - `state: ImportRunStateViewModel | null`,
  - `onRetry: () => Promise<void>`,
  - `onOpenFallback: () => void`.

### ImportFallbackModal
- Opis komponentu: modal uruchamiany po nieudanym scrapingu lub ręcznie przez kapitana, pozwalający wkleić surowy tekst do parsowania.
- Główne elementy: `dialog`, `textarea`, opcjonalne pole `sourceUrl`, licznik znaków, przycisk `Parse pasted text`.
- Obsługiwane zdarzenia:
  - otwarcie/zamknięcie modala,
  - wpisanie surowego tekstu,
  - submit fallbacku.
- Warunki walidacji:
  - `rawText`: wymagane, nie może być pustym stringiem po `trim`,
  - `teamId`: zawsze przekazywany z aktywnego kontekstu i nieedytowalny,
  - `sourceUrl`: opcjonalne, ale jeśli podane, musi być poprawnym URL.
- Typy: `ImportFallbackFormValues`, `ImportTournamentFallbackCommand`.
- Propsy:
  - `isOpen: boolean`,
  - `defaultSourceUrl: string`,
  - `isSubmitting: boolean`,
  - `onClose: () => void`,
  - `onSubmit: (values: ImportFallbackFormValues) => Promise<void>`.

### TournamentMetadataSection
- Opis komponentu: sekcja odpowiedzialna za edycję podstawowych metadanych już utworzonego turnieju.
- Główne elementy: pola formularza dla `name`, read-only dla `teamSize`, informacje o `sourceType` i `sourceUrl`.
- Obsługiwane zdarzenia:
  - edycja nazwy,
  - zapis zmian.
- Warunki walidacji:
  - nazwa wymagana i ograniczona do 120 znaków,
  - `teamSize` tylko do odczytu po utworzeniu setupu i szczególnie po `lock-setup`,
  - gdy `setupLockedAt !== null`, cały formularz przechodzi w read-only.
- Typy: `TournamentMetadataFormValues`, `PatchTournamentCommand`, `TournamentDto`.
- Propsy:
  - `tournament: TournamentDto`,
  - `isSaving: boolean`,
  - `isLocked: boolean`,
  - `onSave: (values: TournamentMetadataFormValues) => Promise<void>`.

### ImportedDataSummary
- Opis komponentu: sekcja podsumowująca rezultat importu, aby kapitan mógł szybko ocenić kompletność danych wejściowych.
- Główne elementy: karty statystyczne z liczbą wykrytych przeciwników, źródłem danych, statusem cache, listą ostrzeżeń i braków.
- Obsługiwane zdarzenia:
  - przejście do konkretnej rundy lub sekcji konfiguracji,
  - rozwinięcie listy warningów.
- Warunki walidacji:
  - panel pokazuje się dopiero po utworzeniu turnieju lub udanym imporcie,
  - warningi muszą być prezentowane tekstowo, nie tylko kolorem.
- Typy: `ImportedDataSummaryViewModel`.
- Propsy:
  - `summary: ImportedDataSummaryViewModel | null`.

### RoundSetupSection
- Opis komponentu: sekcja zarządzająca listą rund i ich konfiguracją.
- Główne elementy: nagłówek sekcji, lista rund, CTA `Add round`, widok szczegółów wybranej rundy.
- Obsługiwane zdarzenia:
  - dodanie nowej rundy,
  - wybór rundy do edycji,
  - zapis zmian w rundzie,
  - aktywacja rundy.
- Warunki walidacji:
  - nie można dodać więcej niż 200 rund,
  - każda runda musi mieć niepusty `displayName`,
  - `roundNumber` i `sortOrder` powinny być unikalne w obrębie turnieju,
  - aktywacja nowej rundy powinna zdejmować aktywność z poprzedniej.
- Typy: `RoundDraftViewModel[]`, `RoundSummaryDto`, `RoundDto`, `CreateRoundCommand`, `PatchRoundCommand`.
- Propsy:
  - `rounds: RoundDraftViewModel[]`,
  - `selectedRoundId: string | null`,
  - `isLocked: boolean`,
  - `onSelectRound: (roundId: string) => void`,
  - `onCreateRound: () => Promise<void>`,
  - `onSaveRound: (roundId: string, values: RoundFormValues) => Promise<void>`,
  - `onActivateRound: (roundId: string) => Promise<void>`.

### RoundList
- Opis komponentu: lista skrótów rund w kolejności zgodnej z MVP.
- Główne elementy: `aside`, lista przycisków/kart z nazwą rundy, statusem `editable/locked` i badge `Active`.
- Obsługiwane zdarzenia:
  - wybór rundy do edycji,
  - kliknięcie `Set active`.
- Warunki walidacji:
  - aktywna runda zawsze na górze listy,
  - pozostałe rundy sortowane od najnowszej do najstarszej,
  - niedostępność akcji aktywacji przy `setupLockedAt` lub `round.status=locked`.
- Typy: `RoundListItemViewModel`.
- Propsy:
  - `items: RoundListItemViewModel[]`,
  - `selectedRoundId: string | null`,
  - `isLocked: boolean`,
  - `onSelect: (roundId: string) => void`,
  - `onActivate: (roundId: string) => Promise<void>`.

### RoundEditorCard
- Opis komponentu: formularz pojedynczej rundy z misją, deploymentem, przeciwną drużyną oraz flagą aktywności.
- Główne elementy: `form`, pola `displayName`, `roundNumber`, `mission`, `deployment`, `opponentTeamName`, checkbox/toggle `isActive`, przycisk zapisu.
- Obsługiwane zdarzenia:
  - edycja pól rundy,
  - zapis rundy,
  - aktywacja rundy.
- Warunki walidacji:
  - `displayName` wymagane,
  - `roundNumber` wymagane, dodatnie, unikalne,
  - `mission` wymagane,
  - `deployment` wymagane,
  - `opponentTeamName` opcjonalne,
  - zmiana `opponentTeamName` w przyszłych iteracjach musi być oznaczona jako potencjalnie destrukcyjna, bo backend może wykonać hard reset danych rundy.
- Typy: `RoundFormValues`, `CreateRoundCommand`, `PatchRoundCommand`, `RoundDto`.
- Propsy:
  - `round: RoundDraftViewModel | null`,
  - `isLocked: boolean`,
  - `onSave: (values: RoundFormValues) => Promise<void>`,
  - `onActivate: (roundId: string) => Promise<void>`.

### RoundTablesEditor
- Opis komponentu: edytor pełnego zestawu stołów dla wybranej rundy.
- Główne elementy: lista wierszy stołów, pola `tableNo`, `tableName`, selektor `imageAssetId`, podgląd grafiki i źródła, przycisk `Save tables`.
- Obsługiwane zdarzenia:
  - dodanie/usunięcie stołu,
  - edycja danych stołu,
  - wybór assetu stołu,
  - zapis całej kolekcji stołów.
- Warunki walidacji:
  - `tableNo` wymagane, dodatnie, unikalne w rundzie,
  - `tableName` wymagane,
  - `imageAssetId` opcjonalne technicznie, ale rekomendowane dla spójności UX,
  - zapis ma podmieniać cały zestaw stołów atomowo.
- Typy: `RoundTableDraftViewModel[]`, `RoundTableDto`, `RoundTableInput`, `PutRoundTablesCommand`, `TableAssetDto`.
- Propsy:
  - `roundId: string`,
  - `items: RoundTableDraftViewModel[]`,
  - `availableAssets: TableAssetDto[]`,
  - `isSaving: boolean`,
  - `isLocked: boolean`,
  - `onSave: (values: RoundTableDraftViewModel[]) => Promise<void>`.

### SetupReadinessChecklist
- Opis komponentu: lista warunków niezbędnych do zablokowania setupu.
- Główne elementy: `section`, lista statusów z ikonami/badge, opis braków, CTA prowadzące do niekompletnej sekcji.
- Obsługiwane zdarzenia:
  - kliknięcie elementu checklisty w celu przejścia do sekcji z błędem.
- Warunki walidacji:
  - turniej musi istnieć,
  - import musi zakończyć się co najmniej `success` albo `partial_success`,
  - musi istnieć co najmniej jedna runda,
  - wszystkie rundy muszą mieć `displayName`, `mission`, `deployment`,
  - musi istnieć dokładnie jedna aktywna runda,
  - setup nie może być już zablokowany.
- Typy: `SetupReadinessViewModel`, `SetupBlockingIssue`.
- Propsy:
  - `readiness: SetupReadinessViewModel`,
  - `onFocusIssue: (issueId: string) => void`.

### LockSetupBar
- Opis komponentu: pasek kończący setup i wywołujący `POST /tournaments/{tournamentId}/lock-setup`.
- Główne elementy: podsumowanie gotowości, przycisk `Lock setup`, tekst ostrzegawczy o nieodwracalności blokady, ewentualny modal potwierdzenia.
- Obsługiwane zdarzenia:
  - kliknięcie `Lock setup`,
  - potwierdzenie akcji.
- Warunki walidacji:
  - przycisk aktywny tylko gdy `readiness.canLock === true`,
  - brak możliwości ponownego wywołania po sukcesie,
  - przy konflikcie `SETUP_ALREADY_LOCKED` UI powinno zsynchronizować się z backendem i przejść w read-only.
- Typy: `LockSetupResponseDto`, `SetupReadinessViewModel`, `ApiErrorDto`.
- Propsy:
  - `tournamentId: string`,
  - `canLock: boolean`,
  - `isSubmitting: boolean`,
  - `isLocked: boolean`,
  - `blockingIssues: SetupBlockingIssue[]`,
  - `onLock: () => Promise<void>`.

## 5. Typy
### DTO z backendu używane bezpośrednio
- `CreateTournamentCommand`
  - `name: string`
  - `teamId: string`
  - `teamSize: number`
  - `sourceType?: "champions_hub" | "best_coast_pairings" | "manual_fallback" | null`
  - `sourceUrl?: string | null`
- `TournamentDto`
  - `id: string`
  - `name: string`
  - `status: "active" | "closed"`
  - `teamId: string`
  - `teamSize: number`
  - `setupLockedAt: string | null`
  - `closedAt: string | null`
  - `sourceType: string | null`
  - `sourceUrl: string | null`
  - `createdByMembershipId: string`
  - `createdAt: string`
  - `updatedAt: string`
- `TournamentDetailDto`
  - pola z `TournamentDto`
  - `roundCount: number`
  - `activeRoundId: string | null`
- `PatchTournamentCommand`
  - `name?: string`
  - `status?: "active" | "closed"`
- `ImportTournamentCommand`
  - `sourceType: string`
  - `sourceUrl: string`
  - `teamId: string`
- `ImportTournamentAcceptedResponseDto`
  - `importRunId: string`
  - `status: string`
  - `usedCache: boolean`
  - `tournamentId: string`
- `ImportTournamentFallbackCommand`
  - `teamId: string`
  - `sourceUrl?: string | null`
  - `rawText: string`
- `ImportTournamentFallbackResponseDto`
  - `importRunId: string`
  - `status: string`
  - `tournamentId: string`
  - `warnings: string[]`
- `RoundSummaryDto`
  - `id: string`
  - `roundNumber: number`
  - `displayName: string`
  - `status: "editable" | "locked"`
  - `isActive: boolean`
  - `sortOrder: number`
- `RoundDto`
  - `id: string`
  - `tournamentId: string`
  - `roundNumber: number`
  - `displayName: string`
  - `mission: string`
  - `deployment: string`
  - `opponentTeamName: string | null`
  - `isActive: boolean`
  - `sortOrder: number`
  - `status: "editable" | "locked"`
  - `lockedAt: string | null`
  - `lockedByMembershipId: string | null`
  - `createdAt: string`
  - `updatedAt: string`
- `CreateRoundCommand`
  - `roundNumber: number`
  - `displayName: string`
  - `mission: string`
  - `deployment: string`
  - `opponentTeamName: string | null`
  - `isActive: boolean`
  - `sortOrder: number`
- `PatchRoundCommand`
  - `displayName?: string`
  - `mission?: string`
  - `deployment?: string`
  - `opponentTeamName?: string | null`
  - `isActive?: boolean`
  - `sortOrder?: number`
- `RoundTableInput`
  - `tableNo: number`
  - `tableName: string`
  - `imageAssetId: string | null`
- `PutRoundTablesCommand`
  - `tables: RoundTableInput[]`
- `TableAssetDto`
  - `id: string`
  - `label: string`
  - `imageUrl: string`
  - `sourceUrl: string`
  - `sourceAttribution: string`
  - `createdAt: string`
- `ApiErrorDto`
  - `error.code: string`
  - `error.message: string`
  - `error.details: Record<string, Json | undefined>`

### Nowe typy ViewModel i typy formularzy
- `type TournamentSetupMode = "create" | "edit"`
- `type ImportSourceTypeOption = "champions_hub" | "best_coast_pairings"`
- `type ImportSourceFormValues = { name: string; teamSize: number; sourceType: ImportSourceTypeOption; sourceUrl: string }`
- `type ImportFallbackFormValues = { sourceUrl: string; rawText: string }`
- `type TournamentMetadataFormValues = { name: string }`
- `type RoundFormValues = { roundId?: string; roundNumber: number; displayName: string; mission: string; deployment: string; opponentTeamName: string; isActive: boolean; sortOrder: number }`
- `type RoundTableDraftViewModel = { clientId: string; tableNo: number; tableName: string; imageAssetId: string | null; imagePreviewUrl: string | null; sourceAttribution: string | null }`
- `type RoundDraftViewModel = { id: string; roundNumber: number; displayName: string; mission: string; deployment: string; opponentTeamName: string; isActive: boolean; sortOrder: number; status: "editable" | "locked"; tables: RoundTableDraftViewModel[]; isDirty: boolean }`
- `type ImportRunStateViewModel = { importRunId: string; status: "idle" | "pending" | "success" | "partial_success" | "error"; usedCache: boolean; warnings: string[]; sourceType: string | null; sourceUrl: string | null; lastUpdatedAt: string | null }`
- `type ImportedDataSummaryViewModel = { sourceLabel: string; usedCache: boolean; warningCount: number; opponentCountLabel: string; tableAssetsCoverageLabel: string }`
- `type TournamentHeaderViewModel = { title: string; mode: TournamentSetupMode; tournamentName: string | null; setupLockedAt: string | null; sourceTypeLabel: string | null; sourceUrl: string | null }`
- `type RoundListItemViewModel = { id: string; label: string; subtitle: string; isActive: boolean; status: "editable" | "locked"; hasMissingFields: boolean }`
- `type SetupBlockingIssue = { id: string; label: string; description: string; severity: "error" | "warning"; targetSection: "import" | "metadata" | "rounds" | "lock" }`
- `type SetupReadinessViewModel = { canLock: boolean; issues: SetupBlockingIssue[]; hasTournament: boolean; hasImportResult: boolean; hasAnyRound: boolean; hasExactlyOneActiveRound: boolean; hasRoundsReadyForPlayers: boolean }`
- `type SetupAsyncState = { isBootstrapping: boolean; isImporting: boolean; isSavingTournament: boolean; isSavingRound: boolean; isSavingTables: boolean; isLocking: boolean; error: ApiErrorDto["error"] | null }`
- `type TournamentSetupViewModel = { header: TournamentHeaderViewModel; importState: ImportRunStateViewModel | null; summary: ImportedDataSummaryViewModel | null; rounds: RoundDraftViewModel[]; selectedRoundId: string | null; readiness: SetupReadinessViewModel }`

## 6. Zarządzanie stanem
- Zgodnie ze stackiem MVP należy użyć podejścia `lokalny stan + React Context + query cache`, bez wprowadzania globalnego store dla tego widoku.
- Rekomendowana struktura:
  - komponent strony jako Server Component do bootstrapu danych dostępnych przy wejściu na trasę,
  - `TournamentSetupView` jako Client Component z hookami i interakcjami,
  - `React Hook Form + Zod` dla formularzy importu, fallbacku, metadanych i rund.
- Główny custom hook: `use-tournament-setup`.
  - Odpowiedzialności:
    - rozróżnienie trybu `create/edit`,
    - trzymanie `TournamentSetupViewModel`,
    - zarządzanie lokalnym wyborem rundy,
    - wyliczanie checklisty gotowości,
    - koordynacja mutacji i invalidacji cache,
    - mapowanie błędów API do komunikatów UI.
  - Zwracane dane:
    - `viewModel`,
    - `asyncState`,
    - `actions.importFromUrl`,
    - `actions.importFromFallback`,
    - `actions.saveTournamentMetadata`,
    - `actions.createRound`,
    - `actions.saveRound`,
    - `actions.saveRoundTables`,
    - `actions.activateRound`,
    - `actions.lockSetup`,
    - `actions.selectRound`,
    - `actions.refresh`.
- Hook pomocniczy: `use-import-tournament`.
  - Cel: zamknięcie logiki `POST /imports/tournaments` i `POST /imports/tournaments/fallback`.
  - Stan: `isPending`, `lastResult`, `lastError`.
- Hook pomocniczy: `use-round-editor-state`.
  - Cel: przechowanie lokalnych draftów tabel i formularza aktualnie wybranej rundy.
  - Stan: `selectedRoundId`, `dirtyRoundIds`, `draftTablesByRoundId`.
- Cache zapytań do utrzymania:
  - `tournament-detail`,
  - `tournament-rounds`,
  - `round-detail`,
  - `round-tables`,
  - `table-assets`.
- Invalidacje cache:
  - po imporcie -> `tournament-detail`, `tournament-rounds`,
  - po zapisie metadanych -> `tournament-detail`,
  - po zapisie/utworzeniu/aktywacji rundy -> `tournament-rounds` i `round-detail`,
  - po zapisie stołów -> `round-tables`,
  - po `lock-setup` -> wszystkie query związane z turniejem oraz ewentualny redirect.

## 7. Integracja API
### Główne wywołania dla trybu `create`
- `POST /imports/tournaments`
  - request: `ImportTournamentCommand`
  - response: `ImportTournamentAcceptedResponseDto`
  - zastosowanie:
    - start importu z URL,
    - obsługa globalnego cache (`usedCache=true`),
    - uzyskanie `tournamentId` bez ręcznego tworzenia dodatkowego rekordu po stronie frontendu.
- `POST /imports/tournaments/fallback`
  - request: `ImportTournamentFallbackCommand`
  - response: `ImportTournamentFallbackResponseDto`
  - zastosowanie:
    - fallback po błędzie scrapingu,
    - prezentacja statusu `success/partial_success/error`,
    - pokazanie warningów parsowania.

### Główne wywołania dla trybu `edit`
- `GET /tournaments/{tournamentId}`
  - response: `TournamentDetailDto`
  - zastosowanie: bootstrap danych turnieju, `setupLockedAt`, `roundCount`, `activeRoundId`.
- `PATCH /tournaments/{tournamentId}`
  - request: `PatchTournamentCommand`
  - response: `TournamentDto`
  - zastosowanie: aktualizacja nazwy turnieju.
- `GET /tournaments/{tournamentId}/rounds`
  - response: `PaginatedListDto<RoundSummaryDto>`
  - zastosowanie: lista rund w kolejności dashboardowej.
- `POST /tournaments/{tournamentId}/rounds`
  - request: `CreateRoundCommand`
  - response: `RoundDto`
  - zastosowanie: tworzenie nowych rund.
- `GET /rounds/{roundId}`
  - response: `RoundDto`
  - zastosowanie: dociąganie szczegółów edytowanej rundy.
- `PATCH /rounds/{roundId}`
  - request: `PatchRoundCommand`
  - response: `RoundDto`
  - zastosowanie: edycja istniejącej rundy.
- `POST /rounds/{roundId}/activate`
  - request: `{}`
  - response: `ActivateRoundResponseDto`
  - zastosowanie: ustawienie dokładnie jednej aktywnej rundy.
- `GET /rounds/{roundId}/tables`
  - response: lista `RoundTableDto`
  - zastosowanie: bootstrap zestawu stołów danej rundy.
- `PUT /rounds/{roundId}/tables`
  - request: `PutRoundTablesCommand`
  - response: `PutRoundTablesResponseDto`
  - zastosowanie: atomowa podmiana pełnego zestawu stołów.
- `GET /table-assets`
  - response: `PaginatedListDto<TableAssetDto>`
  - zastosowanie: źródło danych dla selektora obrazków stołów.
- `POST /tournaments/{tournamentId}/lock-setup`
  - request: `{}`
  - response: `LockSetupResponseDto`
  - zastosowanie: zamrożenie setupu i przejście do kolejnego etapu flow.

### Sekwencja frontendowa
1. Kapitan otwiera `/tournaments/new`.
2. Formularz `ImportSourceForm` wysyła `POST /imports/tournaments`.
3. Po sukcesie frontend zapisuje `tournamentId` i przechodzi na `/tournaments/[tournamentId]/setup`.
4. Jeśli backend zwróci błąd scrapingu, UI otwiera `ImportFallbackModal`.
5. W trybie `edit` frontend pobiera szczegóły turnieju, rundy i stoły aktywnej/wybranej rundy.
6. Zmiany rund są zapisywane inkrementalnie przez `POST` i `PATCH`.
7. Gdy checklista jest kompletna, frontend wywołuje `POST /tournaments/{tournamentId}/lock-setup`.

## 8. Interakcje użytkownika
- Kapitan wpisuje link do turnieju i wybiera typ źródła.
  - Oczekiwany wynik: backend rozpoczyna import lub zwraca wynik z cache; UI pokazuje status i tworzy turniej.
- Kapitan trafia na duplikat importu.
  - Oczekiwany wynik: UI pokazuje, że użyto cache (`usedCache=true`) i nie wymaga powtórnego scrapingu.
- Kapitan otrzymuje częściowy sukces importu.
  - Oczekiwany wynik: UI pokazuje warningi, ale umożliwia przejście do konfiguracji rund.
- Kapitan dostaje błąd scrapingu.
  - Oczekiwany wynik: UI pokazuje `ImportFallbackModal` z możliwością wklejenia surowego tekstu.
- Kapitan zapisuje nazwę turnieju.
  - Oczekiwany wynik: nazwa odświeża nagłówek i pozostaje zsynchronizowana z backendem.
- Kapitan dodaje rundę.
  - Oczekiwany wynik: nowa runda pojawia się na liście, dostaje `roundNumber` i `sortOrder`, a edytor przechodzi na jej szczegóły.
- Kapitan oznacza rundę jako aktywną.
  - Oczekiwany wynik: poprzednia aktywna runda traci status aktywnej, lista odświeża kolejność.
- Kapitan edytuje stoły rundy.
  - Oczekiwany wynik: cały zestaw stołów zapisuje się atomowo i wraca w spójnej kolejności.
- Kapitan klika `Lock setup`.
  - Oczekiwany wynik: widok przechodzi w read-only, a użytkownik może przejść do `Roster & Join Code`.

## 9. Warunki i walidacja
- Walidacja formularza importu:
  - `name` jest wymagane i nie może być pustym stringiem.
  - `teamSize` musi być liczbą całkowitą większą lub równą 5.
  - `sourceType` dla automatycznego importu musi należeć do wspieranej listy.
  - `sourceUrl` musi być poprawnym URL i nie może być pusty.
- Walidacja fallbacku:
  - `rawText` wymagane,
  - `sourceUrl` opcjonalne, ale gdy występuje musi być poprawnym URL.
- Walidacja metadanych turnieju:
  - `teamSize` nie może być modyfikowany po `setupLockedAt`,
  - po `setupLockedAt` widok ma blokować wszystkie kontrolki setupowe.
- Walidacja rund:
  - `displayName` wymagane,
  - `roundNumber` wymagane, dodatnie, unikalne,
  - `mission` wymagane,
  - `deployment` wymagane,
  - liczba rund <= 200,
  - dokładnie jedna aktywna runda przed `lock-setup`.
- Walidacja stołów:
  - `tableNo` wymagane, dodatnie, unikalne w obrębie rundy,
  - `tableName` wymagane.
- Walidacja gotowości przed `lock-setup`:
  - turniej istnieje,
  - import zakończony wynikiem używalnym dla setupu,
  - istnieje co najmniej jedna runda,
  - żadna runda nie ma brakujących pól krytycznych,
  - istnieje jedna aktywna runda,
  - brak nierozwiązanych błędów zapisu.

## 10. Obsługa błędów
- `400 VALIDATION_ERROR`
  - pokazać błędy przy konkretnych polach formularza,
  - nie resetować lokalnych danych formularza.
- `403 FORBIDDEN`
  - ukryć mutacje, pokazać odmowę dostępu i bezpieczny redirect do `/dashboard`.
- `404 TOURNAMENT_NOT_FOUND` lub `404 ROUND_NOT_FOUND`
  - pokazać stan błędu z CTA `Wróć do dashboardu`.
- `409 TEAM_SIZE_IMMUTABLE_AFTER_SETUP_LOCK`
  - zsynchronizować stan turnieju z backendem i przejść w read-only.
- `409 SETUP_ALREADY_LOCKED`
  - odświeżyć szczegóły turnieju, zablokować formularze i przekierować do kolejnego etapu.
- `409 ROUND_LIMIT_REACHED`
  - zablokować przycisk `Add round` i pokazać jasny komunikat o limicie 200.
- `409 DUPLICATE_ROUND_NUMBER` lub `409 DUPLICATE_SORT_ORDER`
  - oznaczyć konflikt w formularzu rundy i nie tracić draftu.
- `409 ACTIVE_ROUND_ALREADY_EXISTS`
  - odświeżyć listę rund i wymusić ponowny wybór aktywnej rundy.
- `422 UNSUPPORTED_SOURCE`
  - komunikat tekstowy o niewspieranym źródle, bez otwierania fallbacku automatycznie.
- `502 SCRAPING_FAILED`
  - pokazać status błędu i od razu udostępnić `ImportFallbackModal`.
- Błędy sieciowe lub timeout:
  - stan `ErrorState` z CTA `Spróbuj ponownie`,
  - zachować lokalne drafty formularzy.

## 11. Kroki implementacji
1. Dodać nowe trasy App Router dla `/tournaments/new` i `/tournaments/[tournamentId]/setup`.
2. Utworzyć moduł `apps/web/src/features/tournament-setup` z podziałem na `components`, `hooks`, `api`, `mappers`, `schemas`, `types`.
3. Zdefiniować schematy `Zod` dla:
   - formularza importu URL,
   - formularza fallbacku,
   - metadanych turnieju,
   - formularza rundy,
   - formularza stołów.
4. Zaimplementować warstwę klienta API dla:
   - `POST /imports/tournaments`,
   - `POST /imports/tournaments/fallback`,
   - `GET /tournaments/{id}`,
   - `PATCH /tournaments/{id}`,
   - `GET /tournaments/{id}/rounds`,
   - `POST /tournaments/{id}/rounds`,
   - `GET /rounds/{id}`,
   - `PATCH /rounds/{id}`,
   - `POST /rounds/{id}/activate`,
   - `GET /rounds/{id}/tables`,
   - `PUT /rounds/{id}/tables`,
   - `GET /table-assets`,
   - `POST /tournaments/{id}/lock-setup`.
5. Zbudować mapery DTO -> ViewModel, w szczególności dla statusu importu, listy rund, checklisty gotowości i headera.
6. Zaimplementować `use-tournament-setup` jako główny hook orkiestrujący widok.
7. Zbudować komponenty importowe: `ImportSourceForm`, `ImportStatusPanel`, `ImportFallbackModal`.
8. Zbudować komponenty konfiguracji: `TournamentMetadataSection`, `RoundSetupSection`, `RoundList`, `RoundEditorCard`, `RoundTablesEditor`.
9. Zaimplementować `SetupReadinessChecklist` oraz `LockSetupBar` z logiką wyliczania warunków blokujących.
10. Dodać stan read-only po `setupLockedAt` dla całego widoku.
11. Dodać testy jednostkowe i komponentowe:
   - walidacja formularza importu,
   - przejście import -> fallback,
   - render warningów `partial_success`,
   - blokada `teamSize` po locku,
   - wyliczanie checklisty gotowości,
   - aktywacja dokładnie jednej rundy,
   - obsługa błędów `409` i `502`.
12. Dodać test E2E dla ścieżki:
   - captain login -> `/tournaments/new` -> import URL -> wejście do `/setup` -> dodanie rundy -> zapis stołów -> `lock-setup`.
13. Na końcu wykonać weryfikację zgodności z PRD i user stories:
   - `US-003`: tworzenie turnieju z linku,
   - `US-004`: fallback ręcznego importu,
   - `US-005`: reużycie cache,
   - `US-041`: globalna deduplikacja importu,
   - oraz wymaganiami setupu z `FR-009` do `FR-013b`.
