# Plan implementacji widoku Team & Tournament Dashboard

## 1. Przegląd
Widok `Team & Tournament Dashboard` służy do pracy na aktywnym kontekście członkostwa (drużyna + rola) oraz do wejścia w aktywne i historyczne turnieje. Celem biznesowym jest szybkie przejście użytkownika (kapitan/gracz) do właściwych działań, bez mieszania danych między drużynami i z poprawnym gatingiem uprawnień.

## 2. Routing widoku
- Główna ścieżka: `/dashboard`.
- Dostęp: tylko użytkownik zalogowany (`PIN login` zakończony sukcesem).
- Zachowanie wejścia:
  - brak sesji -> redirect do `/login`,
  - sesja jest, ale brak aktywnego kontekstu (`activeTeamId`, `activeMembershipId`) -> wymuszenie wyboru kontekstu na dashboardzie,
  - sesja i kontekst obecne -> render pełnego widoku.

## 3. Struktura komponentów
```text
DashboardPage (/dashboard)
└── TeamTournamentDashboardView
    ├── DashboardHeader
    │   ├── MembershipContextSwitcher
    │   └── RoleBadge
    ├── DashboardFilters
    │   ├── TournamentStatusTabs
    │   └── TeamScopeInfo
    ├── ActiveOperationsSection
    │   └── TournamentCardList
    │       └── TournamentCard
    ├── TacticalArchiveSection
    │   └── TournamentCardList
    │       └── TournamentCard
    └── DashboardStateOverlay
        ├── LoadingState
        ├── EmptyState
        └── ErrorState
```

## 4. Szczegóły komponentów
### DashboardPage
- Opis komponentu: komponent trasy App Router odpowiedzialny za inicjalne pobranie danych sesji i render kontenera dashboardu.
- Główne elementy: kontener strony (`main`), osadzenie `TeamTournamentDashboardView`.
- Obsługiwane interakcje: brak bezpośrednich interakcji (warstwa kompozycji).
- Obsługiwana walidacja:
  - wymagana aktywna sesja użytkownika,
  - obsługa braku aktywnego kontekstu członkostwa.
- Typy: `UserMeDto`, `AuthContextResponseDto`.
- Propsy: brak (komponent routingu).

### TeamTournamentDashboardView
- Opis komponentu: główny kontener logiki widoku; spina kontekst członkostwa, pobieranie list turniejów, sekcje aktywne/archiwalne oraz stany ładowania i błędów.
- Główne elementy: wrapper layout (`section`), `DashboardHeader`, `DashboardFilters`, sekcje list i overlay stanu.
- Obsługiwane interakcje:
  - zmiana kontekstu członkostwa,
  - zmiana filtra statusu turniejów,
  - kliknięcie karty turnieju (nawigacja do szczegółu turnieju/ostatniej aktywnej rundy).
- Obsługiwana walidacja:
  - filtrowanie turniejów tylko dla aktywnego `teamId`,
  - separacja turniejów na `active` i `closed`,
  - brak renderowania akcji kapitańskich dla roli `player`.
- Typy: `DashboardViewModel`, `DashboardFiltersState`, `TournamentSummaryDto[]`, `AvailableMembershipDto[]`.
- Propsy:
  - `initialUser: UserMeDto`,
  - `initialContext: AuthContextResponseDto | null`,
  - `initialMemberships: AvailableMembershipDto[]`.

### DashboardHeader
- Opis komponentu: prezentacja nagłówka widoku i aktualnego kontekstu drużyny/roli.
- Główne elementy: `header`, tytuł, `MembershipContextSwitcher`, `RoleBadge`.
- Obsługiwane interakcje: przekazanie zdarzenia `onContextChange`.
- Obsługiwana walidacja:
  - etykieta roli i drużyny musi odpowiadać aktywnemu kontekstowi.
- Typy: `MembershipOptionViewModel`, `ActiveContextViewModel`.
- Propsy:
  - `activeContext: ActiveContextViewModel`,
  - `membershipOptions: MembershipOptionViewModel[]`,
  - `onContextChange: (payload: ChangeContextAction) => Promise<void>`,
  - `isPending: boolean`.

### MembershipContextSwitcher
- Opis komponentu: kontrolka wyboru aktywnego członkostwa (team + rola), wywołująca przełączenie kontekstu sesji.
- Główne elementy: `label`, `select`/`combobox`, opcje członkostw.
- Obsługiwane interakcje:
  - `change` -> wywołanie akcji `POST /auth/context`.
- Obsługiwana walidacja:
  - wybrana opcja musi zawierać `teamId` i `membershipId`,
  - blokada wielokrotnego submitu podczas requestu (`isPending`),
  - odrzucenie pustego wyboru.
- Typy: `AvailableMembershipDto`, `ChangeContextCommandVm`.
- Propsy:
  - `value: string`,
  - `options: MembershipOptionViewModel[]`,
  - `disabled: boolean`,
  - `onChange: (value: string) => void`.

### DashboardFilters
- Opis komponentu: kontrolki filtrowania i podsumowanie zakresu danych.
- Główne elementy: zakładki statusu (`active`, `closed`, `all`), opis aktywnej drużyny.
- Obsługiwane interakcje: kliknięcie zakładki filtra statusu.
- Obsługiwana walidacja:
  - dozwolone tylko wartości filtra z unii typów,
  - reset paginacji po zmianie filtra.
- Typy: `TournamentStatusFilter`, `DashboardFiltersState`.
- Propsy:
  - `filters: DashboardFiltersState`,
  - `onFiltersChange: (next: DashboardFiltersState) => void`.

### ActiveOperationsSection
- Opis komponentu: sekcja z turniejami aktywnymi (`status=active`) i CTA do bieżących operacji.
- Główne elementy: `section`, nagłówek, `TournamentCardList`.
- Obsługiwane interakcje: kliknięcie karty.
- Obsługiwana walidacja:
  - pokazuje wyłącznie turnieje aktywne.
- Typy: `TournamentCardViewModel[]`.
- Propsy:
  - `items: TournamentCardViewModel[]`,
  - `onOpenTournament: (tournamentId: string) => void`.

### TacticalArchiveSection
- Opis komponentu: sekcja historii i zamkniętych turniejów (`status=closed`) w trybie operacyjnie read-only.
- Główne elementy: `section`, nagłówek, `TournamentCardList`.
- Obsługiwane interakcje: wejście do historii turnieju.
- Obsługiwana walidacja:
  - pokazuje wyłącznie turnieje zamknięte.
- Typy: `TournamentCardViewModel[]`.
- Propsy:
  - `items: TournamentCardViewModel[]`,
  - `onOpenTournamentHistory: (tournamentId: string) => void`.

### TournamentCardList
- Opis komponentu: generyczna lista kart turniejów.
- Główne elementy: lista (`ul`), elementy (`li`) z `TournamentCard`.
- Obsługiwane interakcje: delegowanie kliknięcia z karty.
- Obsługiwana walidacja:
  - render empty state przy pustej tablicy.
- Typy: `TournamentCardViewModel[]`.
- Propsy:
  - `items: TournamentCardViewModel[]`,
  - `emptyTitle: string`,
  - `emptyDescription: string`,
  - `onSelect: (item: TournamentCardViewModel) => void`.

### TournamentCard
- Opis komponentu: pojedyncza karta turnieju z kluczowymi metadanymi i kontekstowym CTA.
- Główne elementy: `article`, nazwa, badge statusu, meta (`teamSize`, `setupLockedAt`), przycisk akcji.
- Obsługiwane interakcje: kliknięcie karty / Enter / Space.
- Obsługiwana walidacja:
  - spójne mapowanie statusu turnieju do badge,
  - właściwe CTA zależne od statusu i roli.
- Typy: `TournamentCardViewModel`.
- Propsy:
  - `item: TournamentCardViewModel`,
  - `onSelect: (item: TournamentCardViewModel) => void`.

### DashboardStateOverlay
- Opis komponentu: wspólna warstwa dla stanów asynchronicznych.
- Główne elementy: `LoadingState`, `ErrorState`, `EmptyState`.
- Obsługiwane interakcje: `retry` przy błędzie.
- Obsługiwana walidacja:
  - priorytety stanów: loading > error > empty > content.
- Typy: `DashboardAsyncState`.
- Propsy:
  - `state: DashboardAsyncState`,
  - `onRetry: () => void`.

## 5. Typy
### DTO z backendu (używane bezpośrednio)
- `AvailableMembershipDto` (auth login): `membershipId`, `teamId`, `role`, `isPlaying`.
- `AuthContextCommand`: `teamId`, `membershipId` (request do zmiany kontekstu).
- `AuthContextResponseDto`: `activeTeamId`, `activeMembershipId`, `role`.
- `PaginatedListDto<TournamentSummaryDto>`:
  - `data[]`: `id`, `name`, `status`, `teamSize`, `setupLockedAt`,
  - `pagination`: `page`, `pageSize`, `total`, `totalPages`.
- `TeamListItemDto`: `id`, `name`, `createdAt`.
- `ApiErrorDto`: zunifikowany format błędów (`error.code`, `error.message`, `error.details`).

### Proponowane ViewModel i typy UI
- `type TournamentStatusFilter = "all" | "active" | "closed"`.
- `type DashboardFiltersState = { status: TournamentStatusFilter; page: number; pageSize: number; sort: "name" | "-name" | "createdAt" | "-createdAt" }`.
- `type MembershipOptionViewModel = { optionId: string; label: string; teamId: string; membershipId: string; role: "captain" | "player"; isPlaying: boolean }`.
- `type ActiveContextViewModel = { teamId: string; teamName: string; membershipId: string; role: "captain" | "player" }`.
- `type TournamentCardViewModel = { id: string; name: string; status: "active" | "closed"; teamSize: number; setupLockedAt: string | null; primaryActionLabel: string; isReadOnly: boolean }`.
- `type DashboardViewModel = { activeContext: ActiveContextViewModel | null; membershipOptions: MembershipOptionViewModel[]; activeOperations: TournamentCardViewModel[]; tacticalArchive: TournamentCardViewModel[] }`.
- `type ChangeContextAction = { teamId: string; membershipId: string }`.
- `type DashboardAsyncState = { isLoading: boolean; error: ApiErrorDto | null; isEmpty: boolean }`.

## 6. Zarządzanie stanem
- Podejście zgodne ze stackiem MVP: lokalny stan + cache zapytań (bez globalnego store).
- Rekomendowany custom hook: `use-dashboard-context`.
  - Odpowiedzialności:
    - trzymanie aktywnego kontekstu (`activeContext`),
    - trzymanie filtrów listy (`DashboardFiltersState`),
    - pobieranie i mapowanie zespołów + turniejów do VM,
    - akcja `changeContext()` z optymistyczną blokadą UI.
  - Zwracane wartości:
    - `viewModel`, `asyncState`, `filters`,
    - `actions`: `changeContext`, `changeFilters`, `refresh`.
- Dodatkowy hook pomocniczy: `use-tournaments-query` (lub analogiczny) do pobierania listy turniejów zależnie od `teamId` i filtra statusu.
- Invalidacje cache:
  - po `POST /auth/context` należy odświeżyć `GET /tournaments` i ewentualnie `GET /teams`.

## 7. Integracja API
- `GET /teams`
  - cel: pobranie nazw i listy drużyn dostępnych dla użytkownika,
  - query: `page`, `pageSize`, `sort`, opcjonalnie `filter[activeOnly]=true`,
  - response: `PaginatedListDto<TeamListItemDto>`.
- `GET /tournaments`
  - cel: lista turniejów w aktywnym kontekście drużyny,
  - query:
    - `filter[teamId]=activeTeamId`,
    - `filter[status]=active|closed` (lub brak dla `all`),
    - `page`, `pageSize`, `sort`,
  - response: `PaginatedListDto<TournamentSummaryDto>`.
- `POST /auth/context`
  - cel: przełączenie aktywnego członkostwa,
  - request: `AuthContextCommand`,
  - response: `AuthContextResponseDto`.
- (Opcjonalnie przy SSR bootstrapie) `GET /users/me`
  - cel: dane użytkownika do nagłówka i warunku autoryzacji.

## 8. Interakcje użytkownika
- Użytkownik otwiera `/dashboard`:
  - widzi aktualny kontekst drużyny i listy turniejów.
- Użytkownik zmienia kontekst członkostwa:
  - UI blokuje kontrolkę przełącznika,
  - backend zapisuje aktywny kontekst,
  - lista turniejów odświeża się dla nowego `teamId`.
- Użytkownik przełącza filtr statusu:
  - aktualizacja listy bez pełnego przeładowania strony.
- Użytkownik klika kartę aktywnego turnieju:
  - przejście do dalszego ekranu operacyjnego (szczegół turnieju/active round flow).
- Użytkownik klika kartę zamkniętego turnieju:
  - przejście do widoku historycznego (read-only).
- Użytkownik `player` próbuje wejść w elementy kapitańskie:
  - elementy niedostępne lub ukryte zgodnie z gatingiem roli.

## 9. Warunki i walidacja
- Walidacja kontekstu:
  - `teamId` i `membershipId` muszą tworzyć poprawną parę z listy `availableMemberships`.
- Warunki API:
  - `401 UNAUTHORIZED`: brak/wygaśnięta sesja -> redirect do `/login`.
  - `403 FORBIDDEN`: próba dostępu poza zakresem drużyny/roli -> komunikat + bezpieczny fallback.
  - `400 VALIDATION_ERROR`: błędne parametry requestu -> komunikat przy kontrolce filtra/przełącznika.
- Warunki domenowe widoku:
  - dane tylko dla aktywnego kontekstu drużyny (brak miksowania),
  - sekcja `Active Operations` = turnieje `status=active`,
  - sekcja `Tactical Archive` = turnieje `status=closed`.
- Warunki bezpieczeństwa:
  - brak eksponowania danych kont pilotażowych (US-032),
  - gating UI po roli (US-002) + weryfikacja backendowa.

## 10. Obsługa błędów
- Błędy sieciowe (`5xx`, timeout):
  - `ErrorState` z CTA `Spróbuj ponownie`.
- Błędy autoryzacji (`401`, `403`):
  - `401`: wylogowanie/redirect do loginu,
  - `403`: ekran odmowy dostępu lub toast + powrót do bezpiecznej sekcji.
- Błędy walidacyjne (`400`):
  - komunikat przy polu/akcji, bez utraty stanu ekranu.
- Puste dane:
  - brak turniejów aktywnych lub archiwalnych -> dedykowane `EmptyState`.
- Konflikty stanu po zmianie kontekstu:
  - anulowanie poprzednich requestów i przyjęcie tylko ostatniej odpowiedzi (ochrona przed race condition).

## 11. Kroki implementacji
1. Dodać trasę i kontener widoku `dashboard` (`/dashboard`) w `apps/web` zgodnie z App Router.
2. Utworzyć moduł funkcjonalny `features/dashboard` z plikami: komponenty, hooki, mapery VM, typy.
3. Zdefiniować typy UI (`DashboardViewModel`, `DashboardFiltersState`, `TournamentCardViewModel`, itd.) i mapery z DTO.
4. Zaimplementować warstwę API klienta dla `GET /teams`, `GET /tournaments`, `POST /auth/context` z pełnym typowaniem.
5. Zaimplementować `use-dashboard-context` (pobieranie danych, zmiana kontekstu, filtry, stany async, retry).
6. Zbudować komponenty prezentacyjne: nagłówek, przełącznik kontekstu, filtry, sekcje, listy i karty.
7. Dodać routing akcji z kart turniejów do docelowych ekranów operacyjnych/historii.
8. Dodać gating roli i bezpieczne fallbacki UI dla braku uprawnień (US-002).
9. Dodać obsługę stanów błędów, empty state i loading state.
10. Uzupełnić testy:
    - testy hooka (`zmiana kontekstu`, `filtrowanie`, `obsługa błędu`),
    - testy komponentowe (`render sekcji`, `stany async`, `dostępność klawiaturą`),
    - test E2E dla ścieżki: login -> dashboard -> zmiana kontekstu -> wejście do turnieju.
11. Przeprowadzić weryfikację końcową zgodności z PRD (US-002, US-032) i checklistą bezpieczeństwa danych pilotażowych.
