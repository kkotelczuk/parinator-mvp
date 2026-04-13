# API Endpoint Implementation Plan: 2.3 Teams and Memberships

## 1. Przegląd punktu końcowego

Pięć endpointów obsługujących CRUD zespołów i członkostw w ramach domeny `teams`:

- `GET /teams` — lista zespołów dostępnych dla uwierzytelnionego użytkownika.
- `POST /teams` — tworzenie nowego zespołu z automatycznym przypisaniem członkostwa captain.
- `GET /teams/{teamId}/memberships` — lista członkostw (aktywnych i historycznych) zespołu.
- `POST /teams/{teamId}/memberships` — dodanie członkostwa przez captaina.
- `PATCH /teams/{teamId}/memberships/{membershipId}` — aktualizacja roli/isPlaying/leftAt przez captaina.

Wszystkie trasy wymagają ważnego JWT (Supabase Auth).

## 2. Szczegóły żądania

### `GET /teams`

- Metoda HTTP: **GET**
- Struktura URL: `/api/v1/teams`
- Parametry:
  - Opcjonalne: `page` (default `1`), `pageSize` (default `20`, max `100`), `sort` (`name`, `-name`, `createdAt`, `-createdAt`), `filter[activeOnly]` (boolean)
- Request Body: n/a

### `POST /teams`

- Metoda HTTP: **POST**
- Struktura URL: `/api/v1/teams`
- Parametry: brak
- Request Body: `{ "name": "Team Alpha" }`

### `GET /teams/{teamId}/memberships`

- Metoda HTTP: **GET**
- Struktura URL: `/api/v1/teams/:teamId/memberships`
- Parametry:
  - Wymagane: `teamId` (path, UUID)
  - Opcjonalne: `page`, `pageSize`, `sort` (`role`, `-role`, `joinedAt`, `-joinedAt`, `leftAt`, `-leftAt`), `filter[role]` (`captain` | `player`), `filter[active]` (boolean)
- Request Body: n/a

### `POST /teams/{teamId}/memberships`

- Metoda HTTP: **POST**
- Struktura URL: `/api/v1/teams/:teamId/memberships`
- Parametry:
  - Wymagane: `teamId` (path, UUID)
- Request Body: `{ "userId": "uuid", "role": "player", "isPlaying": true }`

### `PATCH /teams/{teamId}/memberships/{membershipId}`

- Metoda HTTP: **PATCH**
- Struktura URL: `/api/v1/teams/:teamId/memberships/:membershipId`
- Parametry:
  - Wymagane: `teamId`, `membershipId` (path, UUID)
- Request Body: `{ "role?": "player", "isPlaying?": true, "leftAt?": "ISO-8601 | null" }` — minimum jedno pole.

## 3. Wykorzystywane typy

Z `packages/schema/src/types.ts`:

- `TeamListItemDto` — odpowiedź elementu listy zespołów.
- `TeamCreatedDto` — odpowiedź po utworzeniu zespołu.
- `MembershipDto` — odpowiedź członkostwa (lista / tworzenie / patch).
- `CreateTeamCommand` — ciało żądania POST /teams.
- `CreateMembershipCommand` — ciało żądania POST /memberships.
- `PatchMembershipCommand` — ciało żądania PATCH /memberships (pola opcjonalne).
- `PaginatedListDto<T>` — uniwersalna odpowiedź listy.

Z `packages/schema/src/index.ts` (Zod):

- `createTeamSchema` — walidacja nazwy zespołu (trimmed, non-empty, max 120).
- `teamsListQuerySchema` — walidacja query params GET /teams.
- `membershipsListQuerySchema` — walidacja query params GET memberships.
- `createMembershipSchema` — walidacja body POST memberships (UUID userId, enum role, boolean isPlaying).
- `patchMembershipSchema` — walidacja body PATCH memberships z refine (min 1 pole).
- `uuidParamSchema` — walidacja UUID path parametrów.

## 4. Szczegóły odpowiedzi

### Sukces

| Endpoint | HTTP | Odpowiedź |
|---|---|---|
| `GET /teams` | `200 OK` | `PaginatedListDto<TeamListItemDto>` |
| `POST /teams` | `201 Created` | `TeamCreatedDto` |
| `GET /teams/:id/memberships` | `200 OK` | `PaginatedListDto<MembershipDto>` |
| `POST /teams/:id/memberships` | `201 Created` | `MembershipDto` |
| `PATCH /teams/:id/memberships/:id` | `200 OK` | `MembershipDto` |

### Błędy

| Scenariusz | HTTP | `error.code` |
|---|---|---|
| Brak/nieważny JWT | `401` | `UNAUTHORIZED` |
| Brak dostępu do team lub nie-captain | `403` | `FORBIDDEN` |
| Team nie istnieje (GET memberships) | `404` | `TEAM_NOT_FOUND` |
| Membership nie istnieje (PATCH) | `404` | `MEMBERSHIP_NOT_FOUND` |
| Walidacja body / query / UUID | `400` | `VALIDATION_ERROR` |
| Aktywne członkostwo już istnieje | `409` | `ACTIVE_MEMBERSHIP_EXISTS` |
| Błąd serwera / DB | `500` | `INTERNAL_ERROR` |

## 5. Przepływ danych

```
Request
  → JwtAuthGuard (weryfikacja tokenu, userId na request)
  → TeamsController (walidacja Zod: query, body, UUID path params)
  → TeamsService
    → ensureTeamAccess / ensureCaptainAccess (sprawdzenie membership / roli)
    → SupabaseService.getClient().from('teams' | 'team_memberships')
    → mapowanie snake_case → camelCase (DTO)
  → Response JSON
```

`POST /teams` dodatkowo wykonuje `createCaptainMembership` — insert do `team_memberships` z `role=captain` i `is_playing=false`.

Brak zapisu do `audit_events` — CRUD teamów/memberships nie wymaga audytu wg planu.

## 6. Względy bezpieczeństwa

- JWT wymagany — `JwtAuthGuard` odrzuca żądania bez tokenu (`401`).
- Supabase service role key — tylko po stronie serwera, nigdy w bundle przeglądarki.
- Scoping dostępu:
  - `GET /teams` — filtruje po membership użytkownika.
  - `GET memberships` — `ensureTeamAccess` sprawdza membership + istnienie teamu (404 vs 403).
  - `POST/PATCH memberships` — `ensureCaptainAccess` wymaga aktywnej roli captain.
- UUID path params walidowane w kontrolerze (nie trafiają surowe do Supabase).
- Surowe komunikaty PG nigdy nie trafiają do odpowiedzi — stałe domenowe komunikaty.
- `leftAt >= joinedAt` walidowane w serwisie przed UPDATE.

## 7. Obsługa błędów

| Etap | Scenariusz | HTTP | `error.code` |
|---|---|---|---|
| Guard | Brak/nieważny JWT | 401 | `UNAUTHORIZED` |
| Controller | Nieprawidłowy UUID w path | 400 | `VALIDATION_ERROR` |
| Controller | Zod parse failure (body / query) | 400 | `VALIDATION_ERROR` |
| Service | Team nie istnieje (access check) | 404 | `TEAM_NOT_FOUND` |
| Service | Brak membership / nie-captain | 403 | `FORBIDDEN` |
| Service | Membership nie istnieje (PATCH) | 404 | `MEMBERSHIP_NOT_FOUND` |
| Service | leftAt < joinedAt | 400 | `VALIDATION_ERROR` |
| Service | Duplikat aktywnego członkostwa (PG 23505) | 409 | `ACTIVE_MEMBERSHIP_EXISTS` |
| Service | DB check constraint (PG 23514) | 400 | `VALIDATION_ERROR` |
| Service | Nieznany błąd DB | 500 | `INTERNAL_ERROR` |

## 8. Wydajność

- `GET /teams` — dwu-zapytaniowe podejście: (1) team_id z memberships, (2) teams IN (...). Przy małej liczbie teamów na użytkownika (MVP) akceptowalne; dla skali docelowej rozważyć JOIN/subquery.
- Paginacja z `{ count: 'exact' }` i `.range()` — efektywne z indeksami PK/FK.
- `ensureTeamAccess` / `ensureCaptainAccess` — zapytania `.limit(1)` po FK-indexed columns.
- `pageSize` max 100 (walidacja Zod).

## 9. Etapy wdrożenia

1. **Zod schemas** — `packages/schema/src/index.ts`: `createTeamSchema`, `teamsListQuerySchema`, `membershipsListQuerySchema`, `createMembershipSchema`, `patchMembershipSchema`, `uuidParamSchema`.
2. **Typy DTO** — `packages/schema/src/types.ts`: `PatchMembershipCommand` z polami opcjonalnymi.
3. **TeamsService** — `apps/api/src/teams/teams.service.ts`: metody CRUD, access checks, mapowanie, auto-captain membership, walidacja `leftAt >= joinedAt`.
4. **TeamsController** — `apps/api/src/teams/teams.controller.ts`: handlery z walidacją Zod i UUID path params.
5. **TeamsModule** — `apps/api/src/teams/teams.module.ts` + rejestracja w `AppModule`.
6. **Testy jednostkowe** — `teams.controller.spec.ts` i `teams.service.spec.ts` (happy path + 400/403/404/409).
7. **Weryfikacja** — TypeScript check, linter, testy, zgodność z `.ai/api-plan.md`.
