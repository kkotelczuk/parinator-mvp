# PostgreSQL Database Schema - Parinator

## 1. Lista tabel z kolumnami, typami i ograniczeniami

### 1.1 Słowniki i typy domenowe

- `app_role`: enum (`captain`, `player`)
- `tournament_status`: enum (`active`, `closed`)
- `round_status`: enum (`editable`, `locked`)
- `join_code_status`: enum (`active`, `exhausted`, `revoked`, `expired`)
- `import_source`: enum (`champions_hub`, `best_coast_pairings`, `manual_fallback`)
- `import_status`: enum (`success`, `partial_success`, `failed`)
- `pairing_mode`: enum (`simulation`, `live`)
- `simulation_rating`: enum (`better`, `worse`, `neutral`)
- `table_preference_level`: enum (`preferred`, `not_preferred`)  
  (wartość `neutral` nie jest przechowywana, bo zapisujemy tylko odchylenia od neutralnego)

---

### 1.2 `users`

- `id uuid` PK default `gen_random_uuid()`
- `email text` NOT NULL UNIQUE
- `display_name text` NOT NULL
- `pin_hash text` NOT NULL
- `is_active boolean` NOT NULL default `true`
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `email <> ''`
- `display_name <> ''`

---

### 1.3 `teams`

- `id uuid` PK default `gen_random_uuid()`
- `name text` NOT NULL
- `created_by_user_id uuid` NOT NULL FK -> `users(id)`
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `name <> ''`

---

### 1.4 `team_memberships` (historyczne członkostwo)

- `id uuid` PK default `gen_random_uuid()`
- `team_id uuid` NOT NULL FK -> `teams(id)`
- `user_id uuid` NOT NULL FK -> `users(id)`
- `role app_role` NOT NULL
- `is_playing boolean` NOT NULL default `true`
- `joined_at timestamptz` NOT NULL default `now()`
- `left_at timestamptz` NULL
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- aktywne członkostwo unikalne: UNIQUE (`team_id`, `user_id`) WHERE `left_at IS NULL`
- `left_at IS NULL OR left_at >= joined_at`

---

### 1.5 `tournaments`

- `id uuid` PK default `gen_random_uuid()`
- `team_id uuid` NOT NULL FK -> `teams(id)`
- `name text` NOT NULL
- `source_url text` NULL
- `source_type import_source` NULL
- `status tournament_status` NOT NULL default `active`
- `team_size integer` NOT NULL
- `setup_locked_at timestamptz` NULL  
  (wypełniane po zakończeniu setupu; od tego momentu `team_size` immutable)
- `created_by_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `closed_at timestamptz` NULL
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `team_size >= 5`
- `status = 'closed'` wymaga `closed_at IS NOT NULL`
- `status = 'active'` wymaga `closed_at IS NULL`

---

### 1.6 `tournament_rosters` (snapshot składu na turniej)

- `id uuid` PK default `gen_random_uuid()`
- `tournament_id uuid` NOT NULL FK -> `tournaments(id)`
- `membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `slot_no integer` NOT NULL
- `role app_role` NOT NULL
- `is_playing boolean` NOT NULL
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`tournament_id`, `membership_id`)
- UNIQUE (`tournament_id`, `slot_no`)
- `slot_no >= 1`

---

### 1.7 `join_codes`

- `id uuid` PK default `gen_random_uuid()`
- `team_id uuid` NOT NULL FK -> `teams(id)`
- `tournament_id uuid` NOT NULL FK -> `tournaments(id)`
- `code char(6)` NOT NULL
- `status join_code_status` NOT NULL default `active`
- `remaining_uses integer` NOT NULL
- `generated_by_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `revoked_at timestamptz` NULL
- `expires_at timestamptz` NOT NULL  
  (absolutny koniec ważności kodu; po tym czasie kod nie służy do dołączenia — analogicznie do wyczerpania limitu)
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `code ~ '^[0-9]{6}$'`
- `remaining_uses >= 0`
- `expires_at > created_at`
- tylko jeden aktywny kod na turniej: UNIQUE (`tournament_id`) WHERE `status = 'active'`
- przy `status = 'expired'` rekord reprezentuje kod, którego ważność minęła (`expires_at`); przejście na `expired` może nastąpić przy walidacji dołączenia, przy generowaniu nowego kodu (trigger) lub jobem

Semantyka ważności: kod jest używalny tylko gdy `status = 'active'` **oraz** `remaining_uses > 0` **oraz** `now() < expires_at` (implementacja może utrwalać naruszenie czasu przez ustawienie `status = 'expired'`).

---

### 1.8 `rounds`

- `id uuid` PK default `gen_random_uuid()`
- `tournament_id uuid` NOT NULL FK -> `tournaments(id)`
- `round_number integer` NOT NULL  
  (kolejność techniczna 1..n w obrębie turnieju; max 200 rund na turniej)
- `display_name text` NOT NULL  
  (nazwa nadana przez kapitana, dowolna etykieta wyświetlana w UI)
- `mission text` NOT NULL
- `deployment text` NOT NULL
- `opponent_team_name text` NULL
- `status round_status` NOT NULL default `editable`
- `locked_by_membership_id uuid` NULL FK -> `team_memberships(id)`
- `locked_at timestamptz` NULL
- `is_active boolean` NOT NULL default `false`  
  (co najwyżej jedna runda z `is_active = true` na turniej — „bieżąca” runda; wpływa na kolejność listy)
- `sort_order integer` NOT NULL  
  (kolejność ustalana przez kapitana po MVP przez drag-and-drop na dashboardzie turnieju; w MVP zwykle inicjalizowana równolegle do `round_number` lub kolejnego wolnego slotu 1..200)
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`tournament_id`, `round_number`)
- UNIQUE (`tournament_id`, `sort_order`)
- UNIQUE (`tournament_id`) WHERE `is_active = true` (co najwyżej jedna aktywna runda na turniej)
- `1 <= round_number <= 200`
- `1 <= sort_order <= 200`
- `display_name` po trim nie może być pusty
- trigger: nie więcej niż 200 wierszy `rounds` na jeden `tournament_id`
- `status = 'locked'` wymaga `locked_at IS NOT NULL AND locked_by_membership_id IS NOT NULL`
- `status = 'editable'` wymaga `locked_at IS NULL AND locked_by_membership_id IS NULL`

Kolejność wyświetlania listy rund:
- **MVP:** najpierw runda z `is_active = true` (jeśli jest), potem pozostałe malejąco po `created_at` (najnowsza wyżej).
- **Po MVP:** najpierw `is_active`, potem rosnąco po `sort_order` zgodnie z ręcznym porządkiem (drag-and-drop) na dashboardzie turnieju.

---

### 1.9 `opponent_players` (per runda)

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `name text` NOT NULL
- `faction text` NULL
- `list_text text` NULL
- `external_ref text` NULL
- `list_opened_required boolean` NOT NULL default `true`
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`round_id`, `name`)

---

### 1.10 `round_tables`

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `table_no integer` NOT NULL
- `table_name text` NULL
- `image_asset_id uuid` NULL FK -> `table_assets(id)`
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`round_id`, `table_no`)
- `table_no >= 1`

---

### 1.11 `table_assets`

- `id uuid` PK default `gen_random_uuid()`
- `label text` NOT NULL
- `image_url text` NOT NULL
- `source_url text` NOT NULL
- `source_attribution text` NOT NULL
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `image_url <> ''`
- `source_url <> ''`
- `source_attribution <> ''`

---

### 1.12 `matchup_estimations`

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `player_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `opponent_player_id uuid` NOT NULL FK -> `opponent_players(id)` ON DELETE CASCADE
- `list_opened_at timestamptz` NOT NULL
- `has_first_turn_impact boolean` NOT NULL
- `score_single smallint` NULL
- `score_go_first smallint` NULL
- `score_go_second smallint` NULL
- `comment text` NULL
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`round_id`, `player_membership_id`, `opponent_player_id`)
- `comment IS NULL OR char_length(comment) <= 200`
- wynik w zakresie WTC: każda wartość score `BETWEEN 0 AND 20`
- walidacja wariantu pierwszeństwa:
  - gdy `has_first_turn_impact = false` -> `score_single IS NOT NULL` i `score_go_first/score_go_second IS NULL`
  - gdy `has_first_turn_impact = true` -> `score_single IS NULL` i `score_go_first IS NOT NULL` i `score_go_second IS NOT NULL`

---

### 1.13 `table_preferences` (tylko odchylenia od neutralnego)

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `player_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `round_table_id uuid` NOT NULL FK -> `round_tables(id)` ON DELETE CASCADE
- `preference table_preference_level` NOT NULL
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`round_id`, `player_membership_id`, `round_table_id`)

---

### 1.14 `pairing_runs` (symulacje i live)

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `mode pairing_mode` NOT NULL
- `name text` NULL
- `simulation_rating simulation_rating` NULL
- `sort_order integer` NULL
- `is_final boolean` NOT NULL default `false`  
  (dla `mode='live'` dokładnie jeden finalny run na rundę)
- `finalized_at timestamptz` NULL
- `created_by_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- `mode = 'simulation'` -> `is_final = false`
- `mode = 'live' AND is_final = true` -> `finalized_at IS NOT NULL`
- UNIQUE (`round_id`, `mode`, `is_final`) WHERE `mode = 'live' AND is_final = true`

---

### 1.15 `pairing_steps` (przebieg wizarda i live)

- `id uuid` PK default `gen_random_uuid()`
- `pairing_run_id uuid` NOT NULL FK -> `pairing_runs(id)` ON DELETE CASCADE
- `step_no integer` NOT NULL
- `phase_key text` NOT NULL
- `payload jsonb` NOT NULL
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`pairing_run_id`, `step_no`)
- `step_no >= 1`

---

### 1.16 `pairing_assignments` (wynikowe pary)

- `id uuid` PK default `gen_random_uuid()`
- `pairing_run_id uuid` NOT NULL FK -> `pairing_runs(id)` ON DELETE CASCADE
- `player_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `opponent_player_id uuid` NOT NULL FK -> `opponent_players(id)`
- `round_table_id uuid` NULL FK -> `round_tables(id)`
- `estimation_id uuid` NULL FK -> `matchup_estimations(id)`
- `game_result smallint` NULL
- `created_at timestamptz` NOT NULL default `now()`
- `updated_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`pairing_run_id`, `player_membership_id`)
- UNIQUE (`pairing_run_id`, `opponent_player_id`)
- `game_result IS NULL OR game_result BETWEEN 0 AND 20`

---

### 1.17 `estimator_sessions`

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `created_by_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `created_at timestamptz` NOT NULL default `now()`

---

### 1.18 `estimator_events`

- `id uuid` PK default `gen_random_uuid()`
- `session_id uuid` NOT NULL FK -> `estimator_sessions(id)` ON DELETE CASCADE
- `actor_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `tile_label text` NOT NULL
- `tile_value smallint` NOT NULL
- `event_order integer` NOT NULL
- `clicked_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`session_id`, `event_order`)
- `tile_value BETWEEN 0 AND 20`
- `event_order >= 1`

---

### 1.19 `offline_sync_snapshots` (MVP local-wins sync)

- `id uuid` PK default `gen_random_uuid()`
- `round_id uuid` NOT NULL FK -> `rounds(id)` ON DELETE CASCADE
- `captain_membership_id uuid` NOT NULL FK -> `team_memberships(id)`
- `client_snapshot_id text` NOT NULL
- `payload jsonb` NOT NULL
- `synced_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`client_snapshot_id`)

---

### 1.20 `import_runs` (global dedupe + diagnostyka)

- `id uuid` PK default `gen_random_uuid()`
- `source_type import_source` NOT NULL
- `source_url text` NOT NULL
- `source_hash text` NOT NULL
- `status import_status` NOT NULL
- `raw_payload jsonb` NULL
- `normalized_payload jsonb` NULL
- `error_message text` NULL
- `created_by_user_id uuid` NULL FK -> `users(id)`
- `created_at timestamptz` NOT NULL default `now()`

Ograniczenia:
- UNIQUE (`source_url`, `source_hash`)

---

### 1.21 `audit_events` (minimalny audyt)

- `id uuid` PK default `gen_random_uuid()`
- `team_id uuid` NULL FK -> `teams(id)`
- `tournament_id uuid` NULL FK -> `tournaments(id)`
- `round_id uuid` NULL FK -> `rounds(id)`
- `actor_user_id uuid` NULL FK -> `users(id)`
- `event_type text` NOT NULL
- `metadata jsonb` NOT NULL default `'{}'::jsonb`
- `created_at timestamptz` NOT NULL default `now()`

Przykładowe `event_type`:
- `round_locked`
- `round_hard_reset`
- `join_code_regenerated`
- `offline_sync_applied`
- `tournament_closed`

## 2. Relacje między tabelami

- `users` 1:N `team_memberships` (użytkownik może należeć do wielu drużyn równolegle).
- `teams` 1:N `team_memberships` (historia członkostwa przez `left_at`).
- `teams` 1:N `tournaments`.
- `tournaments` 1:N `rounds`.
- `tournaments` 1:N `tournament_rosters` (snapshot składu i ról per turniej).
- `tournaments` 1:N `join_codes` (operacyjnie jeden aktywny kod przez partial unique index).
- `rounds` 1:N `opponent_players`.
- `rounds` 1:N `round_tables`.
- `rounds` 1:N `matchup_estimations`.
- `rounds` 1:N `table_preferences`.
- `rounds` 1:N `pairing_runs`.
- `pairing_runs` 1:N `pairing_steps`.
- `pairing_runs` 1:N `pairing_assignments`.
- `rounds` 1:N `estimator_sessions`.
- `estimator_sessions` 1:N `estimator_events`.
- `rounds` 1:N `offline_sync_snapshots`.

Relacje M:N realizowane tabelami pośrednimi:
- `users` M:N `teams` przez `team_memberships`.
- `player_memberships` M:N `opponent_players` przez `matchup_estimations`.
- `player_memberships` M:N `round_tables` przez `table_preferences`.

Kardynalności biznesowe:
- W danym `pairing_run` każdemu własnemu graczowi odpowiada dokładnie jeden przeciwnik i odwrotnie (unikalności w `pairing_assignments`).
- W danej rundzie gracz ma max jedną estymację na przeciwnika (unikalność w `matchup_estimations`).
- W danym turnieju jeden aktywny kod dołączania naraz (partial unique index).

## 3. Indeksy

Kluczowe indeksy operacyjne:

- `team_memberships (user_id) WHERE left_at IS NULL`
- `team_memberships (team_id, role) WHERE left_at IS NULL`
- `tournaments (team_id, status)`
- `rounds (tournament_id, round_number)` UNIQUE
- `rounds (tournament_id, sort_order)` UNIQUE
- `rounds (tournament_id)` WHERE `is_active = true` UNIQUE
- `rounds (tournament_id, is_active DESC, created_at DESC)` (lista MVP: aktywna na górze, potem najnowsze)
- `rounds (tournament_id, status)`
- `opponent_players (round_id, name)`
- `round_tables (round_id, table_no)` UNIQUE
- `matchup_estimations (round_id, player_membership_id, opponent_player_id)` UNIQUE
- `matchup_estimations (round_id, player_membership_id)`
- `table_preferences (round_id, player_membership_id, round_table_id)` UNIQUE
- `pairing_runs (round_id, mode, created_at DESC)`
- `pairing_assignments (pairing_run_id, player_membership_id)` UNIQUE
- `pairing_assignments (pairing_run_id, opponent_player_id)` UNIQUE
- `join_codes (tournament_id) WHERE status = 'active'` UNIQUE
- `join_codes (code, status)`
- `join_codes (tournament_id, expires_at) WHERE status = 'active'`
- `import_runs (source_url, source_hash)` UNIQUE
- `audit_events (team_id, created_at DESC)`
- `audit_events (round_id, created_at DESC)`

Indeksy rekomendowane pod JSONB:
- `pairing_steps USING GIN (payload)`
- `audit_events USING GIN (metadata)`

## 4. Zasady PostgreSQL (RLS)

### 4.1 Założenia techniczne RLS

- Używane claimy JWT:
  - `auth.uid()` -> `users.id`
  - `auth.jwt()->>'active_team_id'`
  - `auth.jwt()->>'active_membership_id'`
- Wymagane helpery SQL:
  - `is_active_membership(_membership_id uuid, _user_id uuid, _team_id uuid) returns boolean`
  - `is_team_captain(_membership_id uuid) returns boolean`
  - `is_round_editable(_round_id uuid) returns boolean`
  - `has_completed_round_estimations(_round_id uuid, _membership_id uuid) returns boolean`

### 4.2 Polityki per obszar

`users`
- SELECT/UPDATE tylko własny rekord: `id = auth.uid()`.

`team_memberships`
- SELECT: członek widzi aktywne/historyczne membershipy w swoich drużynach.
- INSERT/UPDATE/DELETE: tylko captain danej drużyny (zarządzanie składem).

`tournaments`, `rounds`, `opponent_players`, `round_tables`, `table_assets`
- SELECT: wszyscy członkowie danej drużyny.
- INSERT/UPDATE/DELETE: tylko captain i tylko gdy `tournaments.status = 'active'` oraz (dla danych rundy) `rounds.status = 'editable'`.

`join_codes`
- SELECT: captain danej drużyny.
- INSERT/UPDATE: captain (generowanie/regeneracja, revocation).
- brak DELETE; zmiana statusu zamiast kasowania.

`matchup_estimations`
- SELECT:
  - captain: pełny odczyt wszystkich estymacji w drużynie,
  - player: własne estymacje zawsze, pełny matrix read-only dopiero po `has_completed_round_estimations(round_id, active_membership_id) = true`.
- INSERT/UPDATE:
  - tylko rola `player`,
  - tylko własne rekordy (`player_membership_id = active_membership_id`),
  - tylko gdy runda `editable` i turniej `active`.
- DELETE:
  - tylko captain (operacje administracyjne/resetowe).

`table_preferences`
- analogicznie do `matchup_estimations` (player zapisuje tylko własne preferencje, captain pełny wgląd).

`pairing_runs`, `pairing_steps`, `pairing_assignments`, `estimator_sessions`, `estimator_events`, `offline_sync_snapshots`
- SELECT: członkowie drużyny.
- INSERT/UPDATE/DELETE: tylko captain, tylko przy `rounds.status = 'editable'` i `tournaments.status = 'active'`.

`import_runs`
- SELECT: captain (lub serwis backendowy).
- INSERT: captain/backend.
- UPDATE: backend job (status importu/retry).

`audit_events`
- INSERT: backend i akcje triggerowane.
- SELECT: captain + członkowie drużyny w trybie read-only (bez danych wrażliwych).
- brak UPDATE/DELETE.

### 4.3 Blokady read-only po zamknięciu rundy/turnieju

- Trigger `before update/delete/insert` na tabelach danych rundy odrzuca modyfikacje, gdy:
  - `rounds.status = 'locked'` lub
  - `tournaments.status = 'closed'`.
- Wyjątek: `audit_events` może być dopisywany zawsze.

### 4.4 Hard reset rundy po zmianie przeciwnika

Zmiana `rounds.opponent_team_name` (na inną wartość) uruchamia transakcyjnie:
- DELETE z:
  - `matchup_estimations`
  - `table_preferences`
  - `pairing_steps`
  - `pairing_assignments`
  - `pairing_runs`
  - `estimator_events`
  - `estimator_sessions`
  - `offline_sync_snapshots`
  - `opponent_players`
- INSERT do `audit_events` z `event_type = 'round_hard_reset'`.

## 5. Dodatkowe uwagi i decyzje projektowe

- Model jest znormalizowany do 3NF dla danych operacyjnych; kontrolowana denormalizacja występuje tylko w `payload jsonb` (`pairing_steps`, `offline_sync_snapshots`) dla elastyczności procesu live/offline.
- `tournament_rosters` zamraża skład i role na czas turnieju (stabilność historyczna, zgodność z `team_size` frozen-at-setup).
- Przechowywanie preferencji stołów jako tylko `preferred/not_preferred` redukuje wolumen danych i upraszcza logikę resetu (`neutral` = brak rekordu).
- `import_runs` z globalnym kluczem (`source_url`, `source_hash`) realizuje deduplikację cache między drużynami i turniejami.
- Kody dołączania mają `expires_at` (TTL); status `expired` oraz trigger `join_codes_apply_ttl` utrzymują spójność z unikalnością jednego `active` na turniej, bez użycia `now()` w indeksie częściowym.
- Partycjonowanie celowo pominięte na MVP; przy wzroście danych pierwszym kandydatem do partycjonowania jest `audit_events` po `created_at`.
