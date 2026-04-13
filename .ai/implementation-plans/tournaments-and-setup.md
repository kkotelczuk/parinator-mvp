# API Endpoint Implementation Plan: 2.4 Tournaments and Setup

## 1. Przegląd punktu końcowego

Moduł **Tournaments** obsługuje cykl życia turnieju w ramach zespołu: tworzenie, przeglądanie, edycję metadanych, zamrożenie setupu (`lock-setup`), zamknięcie oraz zarządzanie snapshotem składu (`roster`). Dostęp wymaga JWT; mutacje są ograniczone do roli `captain`.

Endpointy (8):

| # | Metoda | URL | Rola |
|---|--------|-----|------|
| 1 | GET | `/tournaments` | any member |
| 2 | POST | `/tournaments` | captain |
| 3 | GET | `/tournaments/:tournamentId` | any member |
| 4 | PATCH | `/tournaments/:tournamentId` | captain |
| 5 | POST | `/tournaments/:tournamentId/lock-setup` | captain |
| 6 | POST | `/tournaments/:tournamentId/close` | captain |
| 7 | GET | `/tournaments/:tournamentId/roster` | any member |
| 8 | PUT | `/tournaments/:tournamentId/roster` | captain |

## 2. Szczegóły żądania

### GET /tournaments
- Query: `page`, `pageSize`, `sort`, `filter[status]`, `filter[teamId]`
- Sort values: `name`, `-name`, `createdAt`, `-createdAt`
- Filtruje po `team_id` powiązanym z członkostwami użytkownika

### POST /tournaments
- Body: `{ name, teamId, teamSize, sourceType?, sourceUrl? }`
- `teamSize >= 5`, `name` non-empty max 120
- `sourceType` enum: `champions_hub | best_coast_pairings | manual_fallback`

### GET /tournaments/:tournamentId
- Path: `tournamentId` UUID
- Odpowiedź: tournament object + `roundCount` + `activeRoundId`

### PATCH /tournaments/:tournamentId
- Body: `{ name?, status? }`
- Walidacja: `teamSize` immutable po `setupLockedAt`; `status='closed'` wymaga `closedAt`

### POST /tournaments/:tournamentId/lock-setup
- Body: `{}`
- Ustawia `setup_locked_at = now()`

### POST /tournaments/:tournamentId/close
- Body: `{ closedAt? }` — opcjonalny timestamp; domyślnie `now()` po stronie serwera
- Ustawia `status = 'closed'`, `closed_at`

### GET /tournaments/:tournamentId/roster
- Query: `sort`, `filter[role]`, `filter[isPlaying]`
- Odpowiedź: tablica `TournamentRosterRowDto`

### PUT /tournaments/:tournamentId/roster
- Body: `{ members: [{ membershipId, slotNo, role, isPlaying }] }`
- Atomowa wymiana — DELETE all + INSERT
- Walidacja: `slotNo >= 1`, unikatowość `membershipId` i `slotNo` w tablicy

## 3. Wykorzystywane typy

Istniejące w `packages/schema/src/types.ts`:
- `TournamentSummaryDto`, `TournamentDto`, `TournamentDetailDto`
- `CreateTournamentCommand`, `PatchTournamentCommand`
- `LockSetupResponseDto`, `CloseTournamentCommand`, `TournamentClosedResponseDto`
- `TournamentRosterRowDto`, `TournamentRosterMemberInput`, `PutTournamentRosterCommand`, `PutTournamentRosterResponseDto`
- `PaginatedListDto<T>`, `PaginationDto`

Nowe Zod schemas w `packages/schema/src/index.ts`:
- `createTournamentSchema`
- `patchTournamentSchema`
- `tournamentsListQuerySchema`
- `closeTournamentSchema`
- `rosterListQuerySchema`
- `putTournamentRosterSchema`
- `rosterMemberSchema`

## 4. Szczegóły odpowiedzi

| Endpoint | Sukces | Błędy |
|----------|--------|-------|
| GET /tournaments | 200 `PaginatedListDto<TournamentSummaryDto>` | 401 UNAUTHORIZED |
| POST /tournaments | 201 `TournamentDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN |
| GET /tournaments/:id | 200 `TournamentDetailDto` | 401 UNAUTHORIZED, 403 FORBIDDEN, 404 TOURNAMENT_NOT_FOUND |
| PATCH /tournaments/:id | 200 `TournamentDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 409 TEAM_SIZE_IMMUTABLE_AFTER_SETUP_LOCK |
| POST .../lock-setup | 200 `LockSetupResponseDto` | 403 FORBIDDEN, 409 SETUP_ALREADY_LOCKED |
| POST .../close | 200 `TournamentClosedResponseDto` | 403 FORBIDDEN, 409 TOURNAMENT_ALREADY_CLOSED |
| GET .../roster | 200 `{ data: TournamentRosterRowDto[] }` | 403 FORBIDDEN, 404 TOURNAMENT_NOT_FOUND |
| PUT .../roster | 200 `PutTournamentRosterResponseDto` | 400 VALIDATION_ERROR, 403 FORBIDDEN, 409 DUPLICATE_SLOT_OR_MEMBERSHIP |

## 5. Przepływ danych

1. JWT → `JwtAuthGuard` → `request.userId`
2. Controller waliduje params/query/body przez Zod
3. Service:
   - Odczytuje `team_memberships` aby ustalić `membershipId` i rolę użytkownika
   - Weryfikuje dostęp (team member / captain) — analogicznie do `TeamsService.ensureCaptainAccess`
   - Wykonuje operacje na Supabase PostgREST (`tournaments`, `tournament_rosters`, `rounds`)
   - Mapuje snake_case → camelCase DTO
4. Dla `GET /tournaments/:id` — dodatkowe query do `rounds` dla `roundCount` i `activeRoundId`
5. Dla `PUT .../roster` — transakcja: delete all existing + insert batch

## 6. Względy bezpieczeństwa

- JWT wymagany na wszystkich endpointach (`@UseGuards(JwtAuthGuard)`)
- Captain access: weryfikacja roli w `team_memberships` (aktywne, `role='captain'`, `left_at IS NULL`)
- Team scoping: `tournaments.team_id` musi odpowiadać drużynie, w której użytkownik ma aktywne członkostwo
- Nie ujawniaj stack trace w 500; loguj po stronie serwera
- Supabase service role key tylko server-side

## 7. Obsługa błędów

| Scenariusz | HTTP | error.code | Komunikat |
|-----------|------|-----------|-----------|
| Brak/nieprawidłowy JWT | 401 | UNAUTHORIZED | Authentication required. |
| Niepoprawne dane wejściowe | 400 | VALIDATION_ERROR | (z Zod) |
| Brak uprawnień captain | 403 | FORBIDDEN | Operation is forbidden. |
| Turniej nie znaleziony | 404 | TOURNAMENT_NOT_FOUND | Tournament not found. |
| Setup już zamrożony | 409 | SETUP_ALREADY_LOCKED | Setup is already locked. |
| Turniej już zamknięty | 409 | TOURNAMENT_ALREADY_CLOSED | Tournament is already closed. |
| teamSize zmiana po lock | 409 | TEAM_SIZE_IMMUTABLE_AFTER_SETUP_LOCK | Team size cannot change after setup lock. |
| Duplikat slot/membership | 409 | DUPLICATE_SLOT_OR_MEMBERSHIP | Duplicate slot number or membership in roster. |
| Błąd DB | 500 | INTERNAL_ERROR | Internal server error. |

## 8. Wydajność

- Indeksy: `tournaments(team_id, status)` dla listowania; PK lookup dla GET by id
- Paginacja z `count: 'exact'` i `.range()`
- Roster PUT: batch insert po batch delete w jednym flow (PostgREST nie wspiera transakcji natywnie — RPC lub sekwencja z walidacją po stronie serwera)
- `pageSize` max 100

## 9. Etapy wdrożenia

1. **Zod schemas** — dodanie schematów walidacji w `packages/schema/src/index.ts`
2. **TournamentsService** — logika biznesowa i dostęp do Supabase
3. **TournamentsController** — routing, walidacja, delegacja do serwisu
4. **TournamentsModule** — rejestracja modułu NestJS; import w `AppModule`
5. **Testy jednostkowe** — controller + service (happy path + reprezentatywny błąd)
6. **Weryfikacja** — lint, format, zgodność z api-plan
