# Przykłady: wejście → oczekiwane artefakty

Plan wdrożenia generowany według [SKILL.md](SKILL.md) zapisuj jako **`.ai/view-implementation-plan.md`** (lub `.ai/implementation-plans/<slug>.md` przy wielu planach).

## Przykład 1: endpoint z planu (skrót)

**Wejście od użytkownika (wystarczy):**

> `GET /teams` — lista drużyn dla członkostw bieżącego użytkownika. Query: `page`, `pageSize`, `sort`, `filter[activeOnly]`. 200 + paginacja; 401 gdy brak sesji.

**Oczekiwane działanie agenta:**

1. Otwiera `.ai/api-plan.md`, sekcję `GET /teams`, potwierdza JSON pól i `pagination`.
2. Dodaje lub rozszerza `TeamsController` z `@Controller()` pod globalnym prefiksem `/api/v1` (lub ścieżką uzgodnioną z `main.ts`).
3. Implementuje `TeamsService` z zapytaniem przez `SupabaseService` (filtrowanie po użytkowniku z JWT / membership — zgodnie z RLS i logiką opisaną w planie/PRD).
4. Zwraca `{ data, pagination }`.
5. Dodaje test e2e: `GET` z mockiem auth lub integracyjnie — minimum 200 i kształt body.

**Przykładowy fragment odpowiedzi sukcesu (z planu):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Team Alpha",
      "createdAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Przykład 2: błąd domenowy

**Wejście:**

> `POST /auth/pin-login` — przy złym PIN zwróć 401 z `code: INVALID_CREDENTIALS`.

**Oczekiwany kształt błędu:**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "…",
    "details": {}
  }
}
```

Agent powinien użyć wyjątków NestJS (`UnauthorizedException` itd.) z mapowaniem na powyższy kształt (filtr wyjątków lub ręczne `throw` z obiektem — spójnie z resztą modułu `auth`).

---

## Przykład 3: nowy endpoint (nie w planie)

**Wejście:**

> Dodaj `GET /api/v1/meta/version` zwracający `{ "version": "0.1.0" }`.

**Oczekiwane:**

1. Użytkownik lub agent dopisuje krótką specyfikację do `.ai/api-plan.md` (lub osobny dokument uzgodniony w zespole), żeby kontrakt był śledzony.
2. Implementacja w osobnym kontrolerze lub `AppController` — bez konfliktu z `/health`.
3. Test e2e na status 200 i body.
