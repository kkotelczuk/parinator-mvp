# API Endpoint Implementation Plan: 2.6 Rounds and Round Configuration

## 1. Przegląd punktu końcowego

Moduł **Rounds** obsługuje cykl życia rund w turnieju: tworzenie, listowanie, edycję, aktywację, zmianę kolejności i blokowanie. Dostęp wymaga JWT; mutacje ograniczone do roli `captain`. Runda może być `editable` lub `locked` — po zablokowaniu jest read-only.

Endpointy (7):

| # | Metoda | URL | Rola |
|---|--------|-----|------|
| 1 | GET | `/tournaments/:tournamentId/rounds` | any member |
| 2 | POST | `/tournaments/:tournamentId/rounds` | captain |
| 3 | GET | `/rounds/:roundId` | any member |
| 4 | PATCH | `/rounds/:roundId` | captain |
| 5 | POST | `/rounds/:roundId/activate` | captain |
| 6 | POST | `/rounds/:roundId/reorder` | captain |
| 7 | POST | `/rounds/:roundId/lock` | captain |

Architektura kontrolerów (wzorzec z `join-codes`):
- `TournamentRoundsController` (`@Controller('tournaments')`) — endpointy 1–2
- `RoundsController` (`@Controller('rounds')`) — endpointy 3–7
- Wspólny `RoundsService`

## 2. Szczegóły żądania

### GET /tournaments/:tournamentId/rounds
- Path: `tournamentId` UUID
- Query: `page`, `pageSize`, `sort`, `filter[status]`, `filter[isActive]`
- Sort values: `roundNumber`, `-roundNumber`, `sortOrder`, `-sortOrder`, `createdAt`, `-createdAt`

### POST /tournaments/:tournamentId/rounds
- Path: `tournamentId` UUID
- Body: `{ roundNumber, displayName, mission, deployment, opponentTeamName?, isActive, sortOrder }`
- `roundNumber` 1–200, `sortOrder` 1–200, `displayName` non-empty

### GET /rounds/:roundId
- Path: `roundId` UUID

### PATCH /rounds/:roundId
- Path: `roundId` UUID
- Body: `{ displayName?, mission?, deployment?, opponentTeamName?, isActive?, sortOrder? }`
- At least one field required

### POST /rounds/:roundId/activate
- Path: `roundId` UUID
- Body: `{}` (empty)

### POST /rounds/:roundId/reorder
- Path: `roundId` UUID
- Body: `{ sortOrder }` — integer 1–200

### POST /rounds/:roundId/lock
- Path: `roundId` UUID
- Body: `{}` (empty)

## 3. Wykorzystywane typy

Istniejące w `packages/schema/src/types.ts`:
- `RoundSummaryDto`, `RoundDto`
- `CreateRoundCommand`, `PatchRoundCommand`
- `ActivateRoundResponseDto`, `ReorderRoundCommand`, `ReorderRoundResponseDto`
- `LockRoundResponseDto`
- `PaginatedListDto<T>`, `PaginationDto`

Nowe Zod schemas w `packages/schema/src/index.ts`:
- `createRoundSchema`
- `patchRoundSchema`
- `roundsListQuerySchema`
- `reorderRoundSchema`

## 4. Szczegóły odpowiedzi

| Endpoint | Sukces | Błędy |
|----------|--------|-------|
| GET .../rounds | 200 `PaginatedListDto<RoundSummaryDto>` | 403 FORBIDDEN, 404 TOURNAMENT_NOT_FOUND |
| POST .../rounds | 201 `RoundDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 409 ROUND_LIMIT_REACHED, 409 DUPLICATE_ROUND_NUMBER, 409 DUPLICATE_SORT_ORDER, 409 ACTIVE_ROUND_ALREADY_EXISTS |
| GET /rounds/:id | 200 `RoundDto` | 403 FORBIDDEN, 404 ROUND_NOT_FOUND |
| PATCH /rounds/:id | 200 `RoundDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 409 ROUND_LOCKED, 409 TOURNAMENT_CLOSED |
| POST .../activate | 200 `ActivateRoundResponseDto` | 403 FORBIDDEN, 409 ROUND_LOCKED, 404 ROUND_NOT_FOUND |
| POST .../reorder | 200 `ReorderRoundResponseDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 409 DUPLICATE_SORT_ORDER |
| POST .../lock | 200 `LockRoundResponseDto` | 403 FORBIDDEN, 409 ROUND_ALREADY_LOCKED, 409 TOURNAMENT_CLOSED |

## 5. Przepływ danych

1. JWT → `JwtAuthGuard` → `request.userId`
2. Controller waliduje params/query/body przez Zod (`safeParse`)
3. Service:
   - Dla tras `/tournaments/:tournamentId/rounds` → `fetchTournamentWithAccess` / `fetchTournamentWithCaptainAccess`
   - Dla tras `/rounds/:roundId` → `fetchRoundOrFail` → pobiera `tournament_id` z rundy → sprawdza team access
   - Captain check: `team_memberships` z `role='captain'`, `left_at IS NULL`
   - Operacje na `rounds` przez Supabase PostgREST
   - `activate`: ustawia `is_active=false` na starej aktywnej rundzie w transakcji (sekwencyjnie)
   - `lock`: ustawia `status='locked'`, `locked_at`, `locked_by_membership_id` + wpis `audit_events`
4. Mapowanie snake_case → camelCase DTO

## 6. Względy bezpieczeństwa

- JWT wymagany na wszystkich endpointach (`@UseGuards(JwtAuthGuard)`)
- Captain access: weryfikacja roli w `team_memberships` (aktywne, `role='captain'`, `left_at IS NULL`)
- Team scoping: runda należy do turnieju → turniej do drużyny → sprawdzenie członkostwa
- Mutacje wymagają `tournaments.status = 'active'`
- PATCH wymaga `rounds.status = 'editable'`
- Nie ujawniaj stack trace w 500
- Supabase service role key tylko server-side

## 7. Obsługa błędów

| Scenariusz | HTTP | error.code | Komunikat |
|-----------|------|-----------|-----------|
| Brak/nieprawidłowy JWT | 401 | UNAUTHORIZED | Authentication required. |
| Niepoprawne dane wejściowe | 400 | VALIDATION_ERROR | (z Zod) |
| Brak uprawnień captain | 403 | FORBIDDEN | Operation is forbidden. |
| Turniej nie znaleziony | 404 | TOURNAMENT_NOT_FOUND | Tournament not found. |
| Runda nie znaleziona | 404 | ROUND_NOT_FOUND | Round not found. |
| Limit rund (200) osiągnięty | 409 | ROUND_LIMIT_REACHED | Round limit reached for this tournament. |
| Duplikat roundNumber | 409 | DUPLICATE_ROUND_NUMBER | Round number already exists in this tournament. |
| Duplikat sortOrder | 409 | DUPLICATE_SORT_ORDER | Sort order already exists in this tournament. |
| Aktywna runda już istnieje (create) | 409 | ACTIVE_ROUND_ALREADY_EXISTS | An active round already exists. |
| Runda zablokowana (PATCH) | 409 | ROUND_LOCKED | Round is read-only. |
| Runda już zablokowana (lock) | 409 | ROUND_ALREADY_LOCKED | Round is already locked. |
| Turniej zamknięty | 409 | TOURNAMENT_CLOSED | Tournament is closed. |
| Błąd DB | 500 | INTERNAL_ERROR | Internal server error. |

## 8. Wydajność

- Indeksy: `rounds(tournament_id, round_number)` UNIQUE, `rounds(tournament_id, sort_order)` UNIQUE, `rounds(tournament_id) WHERE is_active = true` UNIQUE
- Paginacja z `count: 'exact'` i `.range()`
- MVP sort: `is_active DESC, created_at DESC`
- `pageSize` max 100
- Activate: dwa osobne UPDATE (deactivate old, activate new) — nie jest transakcja PostgREST, ale idempotentne z UNIQUE constraint

## 9. Etapy wdrożenia

1. **Zod schemas** — `createRoundSchema`, `patchRoundSchema`, `roundsListQuerySchema`, `reorderRoundSchema` w `packages/schema/src/index.ts`
2. **RoundsService** — logika biznesowa: CRUD, activate, reorder, lock; dostęp przez SupabaseService; access control helpers
3. **TournamentRoundsController** — `@Controller('tournaments')`, endpointy GET/POST `/:tournamentId/rounds`
4. **RoundsController** — `@Controller('rounds')`, endpointy GET/PATCH `/:roundId`, POST `/:roundId/activate|reorder|lock`
5. **RoundsModule** — rejestracja kontrolerów i serwisu; import w `AppModule`
6. **Testy jednostkowe** — controller + service (happy path + reprezentatywny błąd per endpoint)
7. **Weryfikacja** — lint, format, zgodność z api-plan
