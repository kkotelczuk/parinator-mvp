# API Endpoint Implementation Plan: `GET /users/me` & `PATCH /users/me`

## 1. Przegląd punktu końcowego

Dwa endpointy umożliwiające uwierzytelnionemu użytkownikowi odczyt (`GET`) i aktualizację (`PATCH`) własnego profilu. Dane profilu nie zawierają `pin_hash` — wrażliwe pole jest pomijane przy mapowaniu z wiersza tabeli `users` na DTO.

Oba endpointy wymagają ważnego JWT. Identyfikator użytkownika pochodzi z `auth.uid()` (Supabase) / JWT `sub` claim.

## 2. Szczegóły żądania

### `GET /users/me`

- Metoda HTTP: **GET**
- Struktura URL: `/api/v1/users/me`
- Parametry:
  - Wymagane: brak (użytkownik identyfikowany z JWT)
  - Opcjonalne: brak
- Request Body: n/a

### `PATCH /users/me`

- Metoda HTTP: **PATCH**
- Struktura URL: `/api/v1/users/me`
- Parametry:
  - Wymagane: brak (użytkownik identyfikowany z JWT)
  - Opcjonalne: brak
- Request Body:
  ```json
  { "displayName": "New Name" }
  ```

## 3. Wykorzystywane typy

Z `packages/schema/src/types.ts`:

- **`UserMeDto`** — odpowiedź dla obu endpointów:
  ```ts
  { id, email, displayName, isActive, createdAt, updatedAt }
  ```
- **`PatchUserMeCommand`** — ciało żądania PATCH:
  ```ts
  { displayName: string }
  ```

Nowe schematy Zod w `packages/schema/src/index.ts`:

- **`patchUserMeSchema`** — walidacja `displayName`: non-empty string, trimmed, max 100 znaków.

## 4. Szczegóły odpowiedzi

### Sukces

| Endpoint | HTTP | Odpowiedź |
|---|---|---|
| `GET /users/me` | `200 OK` | `UserMeDto` |
| `PATCH /users/me` | `200 OK` | `UserMeDto` (po aktualizacji) |

### Błędy

| Scenariusz | HTTP | `error.code` | `message` |
|---|---|---|---|
| Brak/nieważny JWT | `401` | `UNAUTHORIZED` | `Authentication required.` |
| Użytkownik nie istnieje w DB | `404` | `USER_NOT_FOUND` | `User not found.` |
| Walidacja body (PATCH) | `400` | `VALIDATION_ERROR` | `Display name must be a non-empty string.` |

## 5. Przepływ danych

```
Request
  → JwtAuthGuard (weryfikacja tokenu, wyciągnięcie userId)
  → UsersController.getMe() / updateMe()
  → UsersService.findById(userId) / updateDisplayName(userId, displayName)
  → SupabaseService.getClient()
      .from('users')
      .select('id, email, display_name, is_active, created_at, updated_at')
      .eq('id', userId)
      .single()
  → mapowanie snake_case → camelCase (UserMeDto)
  → Response JSON
```

Brak zapisu do `audit_events` — prostych odczytów/aktualizacji profilu nie audytujemy.

## 6. Względy bezpieczeństwa

- JWT wymagany — guard odrzuca żądania bez tokenu lub z nieważnym tokenem (`401`).
- Supabase service role key umożliwia dostęp do wiersza użytkownika; scoping realizowany w kodzie serwisu (`WHERE id = :userId`).
- `pin_hash` **nigdy** nie jest zwracany w odpowiedzi.
- Walidacja wejścia `displayName` zapobiega pustym ciągom (constraint DB: `display_name <> ''`).
- Brak wycieku stack trace przy błędach 500 — globalny filtr NestJS.

## 7. Obsługa błędów

| Etap | Scenariusz | HTTP | `error.code` |
|---|---|---|---|
| Guard | Brak nagłówka `Authorization` | 401 | `UNAUTHORIZED` |
| Guard | Token wygasł / nieprawidłowy | 401 | `UNAUTHORIZED` |
| Service | `users` row nie istnieje | 404 | `USER_NOT_FOUND` |
| Walidacja | `displayName` puste/brak | 400 | `VALIDATION_ERROR` |
| Supabase | Błąd komunikacji z DB | 500 | `INTERNAL_ERROR` |

## 8. Wydajność

- Zapytanie po PK (`id`) — O(1) lookup z indeksem.
- Brak paginacji — endpointy single-resource.
- `PATCH` wykonuje jedno zapytanie `UPDATE … RETURNING *`.

## 9. Etapy wdrożenia

1. **Zod schema** — dodać `patchUserMeSchema` w `packages/schema/src/index.ts`.
2. **Global prefix** — ustawić `/api/v1` w `main.ts` (wymagane przez konwencję API, wpływa na wszystkie trasy).
3. **JWT Auth Guard** — stworzenie `JwtAuthGuard` w `apps/api/src/common/guards/jwt-auth.guard.ts` weryfikującego token Supabase i wstrzykującego `userId` do requestu.
4. **UsersService** — `apps/api/src/users/users.service.ts` z metodami `findById` i `updateDisplayName`, mapowanie row → `UserMeDto`.
5. **UsersController** — `apps/api/src/users/users.controller.ts` z `@Get('me')` i `@Patch('me')`, użycie guardu i serwisu.
6. **UsersModule** — rejestracja w `apps/api/src/users/users.module.ts` i import w `AppModule`.
7. **Testy jednostkowe** — `users.controller.spec.ts` i `users.service.spec.ts` (happy path + 401/404/400).
8. **Weryfikacja** — ręczne testy z `curl` / Postman przeciw lokalnemu Supabase.
