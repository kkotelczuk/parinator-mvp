# API Endpoint Implementation Plan: [Nazwa punktu końcowego]

## 1. Przegląd punktu końcowego

[Krótki opis celu i funkcjonalności punktu końcowego]

## 2. Szczegóły żądania

- Metoda HTTP: [GET / POST / PUT / PATCH / DELETE]
- Struktura URL: [wzorzec URL względem `/api/v1`]
- Parametry:
  - Wymagane: [path, query, body — według specyfikacji]
  - Opcjonalne: [np. paginacja, filtry]
- Request Body: [struktura JSON, jeśli dotyczy]

## 3. Wykorzystywane typy

[DTO, interfejsy żądania/odpowiedzi, modele poleceń / query — z referencją do `packages/schema` lub plików w `apps/api`, jeśli dotyczy]

## 4. Szczegóły odpowiedzi

[Struktura JSON sukcesu: pojedynczy zasób, lista z `pagination`, lub inne wg `.ai/api-plan.md`]

- Kody statusu HTTP i kiedy ich użyć (np. 200, 201, 400, 401, 403, 404, 409, 429, 500).
- Mapowanie na `error.code` w treści `{ "error": { "code", "message", "details" } }` zgodnie z planem API.

## 5. Przepływ danych

[Kontroler → serwis → Supabase / RPC; zależności od JWT, `active_team_id`, RLS; ewentualnie zapis do `audit_events` lub innych tabel — patrz `.ai/db-plan.md`]

## 6. Względy bezpieczeństwa

[Uwierzytelnianie, autoryzacja, walidacja wejścia, brak wycieku sekretów, zgodność z RLS]

## 7. Obsługa błędów

[Tabela: scenariusz → HTTP → `error.code` → komunikat; logowanie strukturalne; czy i kiedy audyt w `audit_events`]

## 8. Wydajność

[Zapytania, indeksy, paginacja, unikanie N+1, limity `pageSize`]

## 9. Etapy wdrożenia

1. [np. DTO / Zod w `packages/schema`]
2. [Metoda w serwisie domenowym]
3. [Handler w kontrolerze NestJS + rejestracja modułu]
4. [Testy jednostkowe / e2e]
5. [Weryfikacja z `.ai/api-plan.md`]
