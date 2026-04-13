# API Endpoint Implementation Plan: 2.5 Join codes and joining flow

## 1. Przegląd punktu końcowego

Cztery endpointy obsługujące kody dołączenia do turnieju:

| # | Metoda | Ścieżka | Rola | Opis |
|---|--------|---------|------|------|
| 1 | GET | `/tournaments/{tournamentId}/join-code` | captain | Odczyt aktywnego kodu z TTL i remaining uses |
| 2 | POST | `/tournaments/{tournamentId}/join-code/generate` | captain | Generacja/regeneracja kodu (stary → nieaktywny) |
| 3 | POST | `/tournaments/{tournamentId}/join-code/revoke` | captain | Unieważnienie aktywnego kodu |
| 4 | POST | `/join-codes/redeem` | player/any auth | Dołączenie do zespołu/turnieju kodem |

## 2. Szczegóły żądania

### GET /tournaments/{tournamentId}/join-code
- **Path params:** `tournamentId` (UUID, wymagany)
- **Query params:** brak
- **Body:** n/a

### POST /tournaments/{tournamentId}/join-code/generate
- **Path params:** `tournamentId` (UUID, wymagany)
- **Body:** `{ "ttlMinutes": 120 }` — TTL w minutach (1–10080, tj. 1 min – 7 dni)

### POST /tournaments/{tournamentId}/join-code/revoke
- **Path params:** `tournamentId` (UUID, wymagany)
- **Body:** `{}` (pusty JSON)

### POST /join-codes/redeem
- **Path params:** brak
- **Body:** `{ "code": "123456" }` — 6-cyfrowy kod

## 3. Wykorzystywane typy

**Istniejące w `packages/schema/src/types.ts`:**
- `JoinCodeActiveDto`
- `GenerateJoinCodeCommand`
- `JoinCodeRedeemCommand`
- `JoinCodeRedeemResponseDto`
- `JoinCodeRevokeResponseDto`

**Nowe schematy Zod w `packages/schema/src/index.ts`:**
- `generateJoinCodeSchema` — `z.object({ ttlMinutes: z.number().int().min(1).max(10080) })`
- `redeemJoinCodeSchema` — `z.object({ code: z.string().regex(/^[0-9]{6}$/) })`

## 4. Szczegóły odpowiedzi

| Endpoint | Success | Response |
|----------|---------|----------|
| GET join-code | 200 | `JoinCodeActiveDto` |
| generate | 201 | `JoinCodeActiveDto` |
| revoke | 200 | `{ "revoked": true }` |
| redeem | 200 | `JoinCodeRedeemResponseDto` |

### Kody błędów

| Endpoint | HTTP | error.code | Kiedy |
|----------|------|------------|-------|
| GET | 403 | FORBIDDEN | Brak captain role |
| GET | 404 | ACTIVE_CODE_NOT_FOUND | Brak aktywnego kodu |
| generate | 400 | VALIDATION_ERROR | Nieprawidłowe dane wejściowe |
| generate | 403 | FORBIDDEN | Brak captain role |
| generate | 409 | TOURNAMENT_NOT_ACTIVE | Turniej zamknięty |
| revoke | 403 | FORBIDDEN | Brak captain role |
| revoke | 404 | ACTIVE_CODE_NOT_FOUND | Brak aktywnego kodu |
| redeem | 400 | VALIDATION_ERROR | Nieprawidłowy format kodu |
| redeem | 404 | CODE_NOT_FOUND | Kod nie istnieje w DB |
| redeem | 409 | CODE_EXPIRED_OR_EXHAUSTED | Kod wygasł / wyczerpany |
| redeem | 409 | TEAM_FULL | Zespół osiągnął limit (team_size) |

## 5. Przepływ danych

### GET join-code
1. Walidacja `tournamentId` (UUID).
2. Pobranie turnieju → sprawdzenie captain access.
3. Zapytanie `join_codes` WHERE `tournament_id = X AND status = 'active'`.
4. Jeśli `expires_at < now()` → potencjalnie oznacz jako `expired` i zwróć 404.
5. Zwróć `JoinCodeActiveDto`.

### generate
1. Walidacja `tournamentId` + body (`ttlMinutes`).
2. Pobranie turnieju → captain access → turniej musi mieć `status = 'active'`.
3. Opcjonalnie: unieaktywnij istniejący aktywny kod (UPDATE status → 'expired' lub 'revoked').
4. Wygeneruj 6-cyfrowy kod (crypto random).
5. INSERT do `join_codes` z `remaining_uses = team_size`, `expires_at = now + ttlMinutes`.
6. Zwróć 201 + `JoinCodeActiveDto`.

### revoke
1. Walidacja `tournamentId`.
2. Captain access.
3. Znajdź aktywny kod → 404 jeśli brak.
4. UPDATE `status = 'revoked'`, `revoked_at = now()`.
5. Zwróć `{ revoked: true }`.

### redeem
1. Walidacja body (`code`).
2. Znajdź kod WHERE `code = X AND status = 'active'` → 404 CODE_NOT_FOUND.
3. Sprawdź `expires_at > now()` AND `remaining_uses > 0` → 409 CODE_EXPIRED_OR_EXHAUSTED.
4. Pobierz turniej → `team_id`, `team_size`.
5. Sprawdź czy user nie ma już aktywnego membership w tym teamie.
6. Opcjonalnie: sprawdź roster limit (team_size) → 409 TEAM_FULL.
7. INSERT `team_memberships` (role: 'player', is_playing: true).
8. Dekrementuj `remaining_uses`; jeśli 0 → `status = 'exhausted'`.
9. Zwróć `JoinCodeRedeemResponseDto`.

## 6. Względy bezpieczeństwa

- JWT wymagany na wszystkich endpointach.
- Captain access sprawdzany przez lookup `team_memberships` (role = 'captain', left_at IS NULL).
- Redeem: każdy uwierzytelniony użytkownik może realizować kod.
- Generowanie kodu: `crypto.randomInt` dla bezpiecznych losowych cyfr.
- Brak wycieku service role key do klienta.

## 7. Obsługa błędów

Zgodnie z sekcją 4 powyżej. Dodatkowe uwagi:
- Supabase unique constraint violation (23505) przy generowaniu = retry z nowym kodem (max 3 próby).
- Race condition przy redeemie: użyj UPDATE ... WHERE remaining_uses > 0 i sprawdź `count` affected rows.

## 8. Wydajność

- Indeks `join_codes (tournament_id) WHERE status = 'active'` — UNIQUE, single-row lookup.
- Indeks `join_codes (code, status)` — lookup po kodzie.
- Brak N+1; max 3–4 zapytania per endpoint.

## 9. Etapy wdrożenia

1. **Zod schemas** — dodaj `generateJoinCodeSchema` i `redeemJoinCodeSchema` w `packages/schema/src/index.ts`.
2. **JoinCodesService** — logika biznesowa w `apps/api/src/join-codes/join-codes.service.ts`.
3. **Kontrolery** — `TournamentJoinCodeController` (tournament-scoped) i `JoinCodesRedeemController` (top-level).
4. **JoinCodesModule** — rejestracja w `apps/api/src/join-codes/join-codes.module.ts`.
5. **AppModule** — import `JoinCodesModule`.
6. **Testy** — unit: service + kontrolery; e2e: happy path + error paths.
7. **Weryfikacja** — sprawdzenie zgodności z `.ai/api-plan.md`.
