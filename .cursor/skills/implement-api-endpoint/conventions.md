# Konwencje API — Parinator (repo)

## Reguły Cursor (backend)

- NestJS / TS: `.cursor/rules/clean-nestjs-typescript-cursor-rules.mdc`
- Supabase, Zod, dostęp do danych: `.cursor/rules/backend-database.mdc` (m.in. `apps/api/src/**`, warstwa web `apps/web/src/lib/**` itd. wg globów w pliku)

## Monorepo

- **Workspaces:** `apps/*`, `packages/*` (npm workspaces + Turborepo).
- **API HTTP:** `apps/api` — pakiet `@parinator/api`, NestJS 11, port domyślny z `main.ts`: `process.env.PORT ?? 3001`.
- **Współdzielone typy / Zod:** `packages/schema` — eksport w `packages/schema/src/index.ts`; używaj dla kontraktów współdzielonych z webem.

## Stack (z `tech-stack.md`)

- TypeScript strict.
- Walidacja: **Zod** w ekosystemie frontu i w `packages/schema`; w NestJS możesz mapować wynik Zod do odpowiedzi lub użyć klas DTO — wybierz jeden spójny styl w obrębie modułu.
- Supabase: PostgreSQL, auth, RLS — integracja z API przez `@supabase/supabase-js` w `SupabaseService`.

## Plan REST (źródło prawdy dla kontraktów)

Plik: **`.ai/api-plan.md`**.

- **Baza ścieżki:** `/api/v1` (sekcja „API conventions”).
- **Treść:** tylko JSON, `Content-Type: application/json`.
- **Czas:** ISO-8601 UTC w payloadach.
- **Listy — query:** `page` (domyślnie `1`), `pageSize` (domyślnie `20`, max `100`), `sort`, `filter[...]`.
- **Listy — odpowiedź:**

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 84,
    "totalPages": 5
  }
}
```

- **Błąd:**

```json
{
  "error": {
    "code": "ROUND_LOCKED",
    "message": "Round is read-only.",
    "details": {}
  }
}
```

Kody błędów w dokumentacji planu są **UPPER_SNAKE** (np. `VALIDATION_ERROR`, `UNAUTHORIZED`).

## Zasoby domenowe (mapowanie mentalne)

Z planu: `auth`, `users`, `teams`, `tournaments`, rundy, pairing, import, audit itd. — pełna lista w `.ai/api-plan.md` sekcja „Resources”.

## Struktura `apps/api`

```
apps/api/src/
  main.ts              # bootstrap, CORS, listen
  app.module.ts        # root module
  app.controller.ts    # np. health
  <feature>/
    *.controller.ts
    *.service.ts
    *.module.ts
  auth/
  supabase/
    supabase.module.ts
    supabase.service.ts
```

- **Health:** obecnie `GET /health` na `AppController` (bez prefiksu w `main.ts`). Plan produktowy zakłada `/api/v1` dla API domenowego — przy wdrażaniu prefiksu dostosuj testy e2e i ścieżki.
- **CORS:** `app.enableCors()` w `main.ts`.

## Supabase w API

- `SupabaseService` czyta `SUPABASE_URL` oraz `SUPABASE_SERVICE_ROLE_KEY` lub fallback `SUPABASE_ANON_KEY` z `ConfigService` (`@nestjs/config`).
- **Bezpieczeństwo:** klucz service role tylko po stronie serwera; nigdy w bundle przeglądarki (`tech-stack.md`).

## Testy

- **Unit:** `*.spec.ts` obok plików w `src/`, Jest (`npm run test` w `apps/api`).
- **E2E:** `apps/api/test/*.e2e-spec.ts`, Supertest (`npm run test:e2e`).
- Root: `npm run test` / `npm run test:e2e` (Turborepo).

## Baza danych

- Migracje SQL: `supabase/migrations/`.
- Typy wygenerowane / schema TS: `packages/schema` (np. `database.types.ts` jeśli obecne w repo).
- **Audyt biznesowy:** tabela `audit_events` (zdarzenia typu `round_locked`, `tournament_closed` itd.) — patrz `.ai/db-plan.md`. Nie jest to „tabela błędów HTTP”; błędy API są w odpowiedzi JSON.
- **Diagnostyka importów:** `import_runs` (pole `error_message` przy niepowodzeniu importu).

## Checklist przed uznaniem endpointu za gotowy

- [ ] Ścieżka i metoda zgodne z planem (lub zaktualizowany plan).
- [ ] Poprawny status HTTP (np. `201` dla tworzenia).
- [ ] Format odpowiedzi listy / pojedynczego zasobu / błędu jak wyżej.
- [ ] Brak wycieku sekretów; dostęp do Supabase zgodny z politykami.
- [ ] Test (unit lub e2e) pokrywa główną ścieżkę.
