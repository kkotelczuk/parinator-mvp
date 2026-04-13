---
name: implement-api-endpoint
description: >-
  Produces a detailed REST endpoint implementation plan and NestJS code following
  Parinator api-plan, db-plan, schema types, tech-stack, and Cursor rules
  (NestJS + backend-database). Use when adding or planning an API endpoint,
  route, controller, incremental implementation steps, or a plan under .ai/.
---

# Plan i implementacja endpointu REST (Parinator)

## Kiedy stosować

- Przygotowanie **planu wdrożenia** pojedynczego endpointu przed kodem.
- Bezpośrednia **implementacja** w `apps/api` po planie lub z krótkiego opisu.

## Źródła wiedzy (wczytaj przed planem / kodem)

Agent **sam** otwiera i stosuje poniższe pliki — użytkownik może podać wyłącznie fragment opisu endpointu.

| Obszar                             | Ścieżka w repo                                                              |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Specyfikacja tras i konwencje JSON | `.ai/api-plan.md`                                                           |
| Tabele, relacje, RLS, audyt        | `.ai/db-plan.md`                                                            |
| Typy / Zod współdzielone           | `packages/schema/src/` (`index.ts`, `types.ts`, ewent. `database.types.ts`) |
| Stack                              | `tech-stack.md`                                                             |
| Reguły NestJS / TypeScript         | `.cursor/rules/clean-nestjs-typescript-cursor-rules.mdc`                    |
| Reguły backend / Supabase / Zod    | `.cursor/rules/backend-database.mdc`                                        |
| Konwencje API w skrócie            | [conventions.md](conventions.md) w tym skillu                               |

Dodatkowo: [implementation-plan-template.md](implementation-plan-template.md) — szkielet sekcji planu.

## Wejście od użytkownika (minimum)

- **Opcja A:** „Zaimplementuj endpoint …” + krótki opis lub odnośnik do sekcji w `.ai/api-plan.md`.
- **Opcija B:** Tylko **plan** — wtedy agent dobiera szczegóły z `api-plan.md` i `db-plan.md` dla tej samej domeny.

Znaczniki z oryginalnego promptu (`route_api_specification`, `db-resources`, `types`) **nie wymagają ręcznego wypełniania**: agent **wyciąga** odpowiednie fragmenty z powyższych plików.

## Faza 1 — Analiza (wewnętrzna)

Przed zapisaniem planu agent wykonuje analizę i może ją pokazać w odpowiedzi w bloku:

```text
<analysis>
... treść analizy ...
</analysis>
```

W analizie **muszą** znaleźć się co najmniej:

1. Podsumowanie kluczowych punktów specyfikacji API (z `.ai/api-plan.md`).
2. Wymagane i opcjonalne parametry (path, query, body).
3. Potrzebne DTO / typy żądania i odpowiedzi (w tym odniesienie do `packages/schema` jeśli dotyczy).
4. Podział logiki: kontroler vs **nowy lub istniejący** serwis w `apps/api/src/<feature>/`.
5. Walidacja wejścia (Zod w `packages/schema` i/lub pipe’y NestJS / klasy DTO) zgodnie z API i ograniczeniami DB.
6. **Rejestrowanie zdarzeń:** w Parinator nie ma osobnej „tabeli błędów” w sensie aplikacyjnym — błędy HTTP zwracają się w standardowym kształcie JSON; **audyt biznesowy** może iść do `audit_events` (patrz `.ai/db-plan.md`, sekcja `audit_events`). Importy: diagnostyka w `import_runs.error_message`. Agent decyduje, czy dany endpoint wymaga wpisu audytu.
7. Zagrożenia bezpieczeństwa (JWT, RLS, service role tylko serwer, wstrzyknięcia przez parametry).
8. Scenariusze błędów → kody HTTP oraz `error.code` z planu API.

## Faza 2 — Plan wdrożenia (jedyne artefakty do utrwalenia w repo)

**Końcowy wynik dla repozytorium** to **dobrze zorganizowany plan w Markdown**, zgodny ze strukturą [implementation-plan-template.md](implementation-plan-template.md), **bez kopiowania surowej treści bloku `<analysis>`** (plan może mieć te same wnioski, ale sformułowane jako gotowe specyfikacje i listy).

### Zapis pliku

- Domyślnie: **`.ai/implementation-plans/<slug-endpointu>.md`** — w nagłówku podaj, który endpoint opisuje.

### Kody HTTP (obowiązkowe wytyczne w planie)

Stosuj poprawne kody zgodnie z semantyką endpointu; typowo:

- **200** — udany odczyt lub mutacja bez tworzenia nowego zasobu (gdy plan API tak przewiduje).
- **201** — utworzenie zasobu.
- **400** — nieprawidłowe dane wejściowe / walidacja.
- **401** — brak lub nieważna sesja.
- **403** — zabronione dla tożsamości / roli.
- **404** — brak zasobu.
- **409**, **429** — gdy występują w `.ai/api-plan.md` dla tego endpointu.
- **500** — nieobsłużony błąd serwera (logować po stronie serwera; nie ujawniać stack trace w odpowiedzi).

Dokładne kody i `error.code` **musi** potwierdzać sekcja endpointu w `.ai/api-plan.md`, jeśli endpoint jest tam opisany.

## Faza 3 — Implementacja kodu (po akceptacji planu lub na prośbę)

Najpierw wczytaj **plan wdrożenia** i źródła — agent sam scala znaczniki poniżej z plików w repo (nie wymagaj od użytkownika ręcznego wklejania).

```text
<implementation_plan>
  Plik planu: `.ai/implementation-plans/<slug>.md` (ten sam endpoint co bieżące zadanie).
</implementation_plan>

<types>
  `packages/schema/src/` — `index.ts`, `types.ts`, ewent. `database.types.ts`
</types>

<implementation_rules>
  - `.cursor/rules/clean-nestjs-typescript-cursor-rules.mdc`
  - `.cursor/rules/backend-database.mdc`
</implementation_rules>

<implementation_approach>
  Realizuj maksymalnie 3 kroki z sekcji „Etapy wdrożenia” planu (lub logicznie równoważne kroki). Podsumuj krótko, co zrobiłeś, i opisz plan na 3 kolejne działania — **zatrzymaj pracę i czekaj na feedback użytkownika**.
</implementation_approach>
```

### Zadanie implementacyjne

Twoim zadaniem jest wdrożenie endpointu REST API w oparciu o podany plan wdrożenia: solidna implementacja z walidacją, obsługą błędów i zgodnością z krokami logicznymi z planu.

**Przed pisaniem kodu:** jeśli plan jest niejednoznaczny lub brakuje decyzji (np. wyboru modułu), przedstaw założenia lub pytania.

Wykonaj następujące kroki:

1. **Przeanalizuj plan wdrożenia**
   - Metoda HTTP i struktura URL (względem `/api/v1` i `main.ts`).
   - Wszystkie parametry wejściowe (path, query, body).
   - Logika biznesowa i etapy przetwarzania danych.
   - Wymagania walidacji i obsługi błędów z planu i `.ai/api-plan.md`.

2. **Rozpocznij implementację** (w `apps/api` — NestJS)
   - Handler z właściwym dekoratorem HTTP (`@Get`, `@Post`, itd.) i prefiksem modułu zgodnym z planem.
   - Parametry funkcji zgodnie z wejściem; DTO / parsowanie query.
   - Walidacja wejścia (Zod w `packages/schema` i/lub DTO NestJS) — zgodnie z planem.
   - Dla endpointów mutujących (`POST`, `PATCH`, `PUT`, `DELETE` z body): przyjmuj `@Body() body: unknown` i waliduj przez `safeParse`; nie zakładaj, że `body` istnieje.
   - Logika w serwisie; kolejne kroki jak w planie wdrożenia.
   - Obsługa błędów na każdym etapie; format `{ error: { code, message, details } }` jak w [conventions.md](conventions.md).
   - Transformacje danych i struktura odpowiedzi sukcesu (lista + `pagination` jeśli dotyczy).

3. **Walidacja i obsługa błędów**
   - Spójne kody HTTP (400, 401, 403, 404, 409, 429, 500) zgodnie z planem i semantyką.
   - Czytelne komunikaty w polu `message`; `code` jak w kontrakcie API.
   - Nie dopuszczaj do błędów runtime typu `Cannot read properties of undefined` dla requestów z brakującym lub błędnym JSON; zwracaj kontrolowany `400 VALIDATION_ERROR`.
   - Przechwytywanie wyjątków z warstwy Supabase / DB bez wycieku wewnętrznych szczegółów.

4. **Testowanie**
   - Rozważ przypadki brzegowe z planu; minimalnie happy path + reprezentatywny błąd (np. 400 lub 401).
   - Dodaj przypadek z pustym/niepoprawnym body i potwierdź, że endpoint zwraca kontraktowy błąd walidacji zamiast wyjątku runtime.

5. **Dokumentacja w kodzie**
   - JSDoc dla publicznych metod serwisu i kontrolera tam, gdzie logika jest nietrywialna (zgodnie z regułami NestJS w repo).

Po zakończeniu upewnij się, że kod zawiera potrzebne importy, eksporty modułu NestJS i testy tam, gdzie plan to przewiduje.

**Przestrzegaj:** `.cursor/rules/clean-nestjs-typescript-cursor-rules.mdc`, `.cursor/rules/backend-database.mdc`, [conventions.md](conventions.md).

**Iteracja:** stosuj `<implementation_approach>` — nie realizuj całego planu w jednej odpowiedzi, o ile użytkownik nie prosi o pełne wdrożenie naraz.

## Pliki pomocnicze w tym skillu

| Plik                                                               | Rola                                    |
| ------------------------------------------------------------------ | --------------------------------------- |
| [conventions.md](conventions.md)                                   | Konwencje repo, format błędów, Supabase |
| [examples.md](examples.md)                                         | Przykłady wejście → artefakty           |
| [implementation-plan-template.md](implementation-plan-template.md) | Szablon sekcji planu                    |
