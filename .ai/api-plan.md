# REST API Plan

## 1. Resources
- `auth` -> `users` (authentication identity) + JWT claims (`active_team_id`, `active_membership_id`)
- `users` -> `users`
- `teams` -> `teams`
- `memberships` -> `team_memberships`
- `tournaments` -> `tournaments`
- `tournament-roster` -> `tournament_rosters`
- `join-codes` -> `join_codes`
- `rounds` -> `rounds`
- `opponents` -> `opponent_players`
- `round-tables` -> `round_tables`
- `table-assets` -> `table_assets`
- `matchup-estimations` -> `matchup_estimations`
- `table-preferences` -> `table_preferences`
- `pairing-runs` -> `pairing_runs`
- `pairing-steps` -> `pairing_steps`
- `pairing-assignments` -> `pairing_assignments`
- `estimator-sessions` -> `estimator_sessions`
- `estimator-events` -> `estimator_events`
- `offline-sync-snapshots` -> `offline_sync_snapshots`
- `import-runs` -> `import_runs`
- `audit-events` -> `audit_events`

## 2. Endpoints

### API conventions
- Base path: `/api/v1`
- JSON only (`Content-Type: application/json`)
- Time format: ISO-8601 UTC in payload; frontend renders local timezone.
- Standard list query params:
  - `page` (default `1`)
  - `pageSize` (default `20`, max `100`)
  - `sort` (example: `-createdAt`, `roundNumber`)
  - `filter[...]` (resource-specific)
- Standard list response:
  - `{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 84, "totalPages": 5 } }`
- Standard error response:
  - `{ "error": { "code": "ROUND_LOCKED", "message": "Round is read-only.", "details": {} } }`

---

### 2.1 Authentication and session context

#### `POST /auth/pin-login`
- **Description:** Login for pilot account (email + 6-digit PIN), then mint Supabase JWT/session.
- **Query params:** none
- **Request JSON:**
  - `{ "email": "captain@example.com", "pin": "123456" }`
- **Response JSON:**
  - `{ "accessToken": "jwt", "refreshToken": "token", "user": { "id": "uuid", "displayName": "Captain", "defaultRole": "captain" }, "availableMemberships": [{ "membershipId": "uuid", "teamId": "uuid", "role": "captain", "isPlaying": false }] }`
- **Success:** `200 OK`
- **Errors:** `400 INVALID_PIN_FORMAT`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_INACTIVE`, `429 TOO_MANY_ATTEMPTS`

#### `POST /auth/context`
- **Description:** Switch active team/membership in JWT-compatible session context.
- **Query params:** none
- **Request JSON:**
  - `{ "teamId": "uuid", "membershipId": "uuid" }`
- **Response JSON:**
  - `{ "activeTeamId": "uuid", "activeMembershipId": "uuid", "role": "player" }`
- **Success:** `200 OK`
- **Errors:** `400 INVALID_CONTEXT`, `403 FORBIDDEN`, `404 MEMBERSHIP_NOT_FOUND`

#### `POST /auth/logout`
- **Description:** Invalidate current session.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "success": true }`
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`

---

### 2.2 Users

#### `GET /users/me`
- **Description:** Read own profile.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "id": "uuid", "email": "user@example.com", "displayName": "Player 1", "isActive": true, "createdAt": "ts", "updatedAt": "ts" }`
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`, `404 USER_NOT_FOUND`

#### `PATCH /users/me`
- **Description:** Update own profile display name.
- **Query params:** none
- **Request JSON:** `{ "displayName": "New Name" }`
- **Response JSON:** same as `GET /users/me`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`

---

### 2.3 Teams and memberships

#### `GET /teams`
- **Description:** List teams for current user memberships.
- **Query params:** `page`, `pageSize`, `sort`, `filter[activeOnly]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "name": "Team Alpha", "createdAt": "ts" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`

#### `POST /teams` (captain/admin setup path)
- **Description:** Create team.
- **Query params:** none
- **Request JSON:** `{ "name": "Team Alpha" }`
- **Response JSON:** `{ "id": "uuid", "name": "Team Alpha", "createdByUserId": "uuid", "createdAt": "ts" }`
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`

#### `GET /teams/{teamId}/memberships`
- **Description:** List memberships (active and historical).
- **Query params:** `page`, `pageSize`, `sort`, `filter[role]`, `filter[active]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "userId": "uuid", "role": "player", "isPlaying": true, "joinedAt": "ts", "leftAt": null }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 TEAM_NOT_FOUND`

#### `POST /teams/{teamId}/memberships` (captain)
- **Description:** Add membership (normally from join code flow, but available for captain ops).
- **Query params:** none
- **Request JSON:** `{ "userId": "uuid", "role": "player", "isPlaying": true }`
- **Response JSON:** membership object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ACTIVE_MEMBERSHIP_EXISTS`

#### `PATCH /teams/{teamId}/memberships/{membershipId}` (captain)
- **Description:** Update role/isPlaying or mark member as left.
- **Query params:** none
- **Request JSON:** `{ "role": "player", "isPlaying": true, "leftAt": null }`
- **Response JSON:** membership object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 MEMBERSHIP_NOT_FOUND`

---

### 2.4 Tournaments and setup

#### `GET /tournaments`
- **Description:** List tournaments visible in active team context.
- **Query params:** `page`, `pageSize`, `sort`, `filter[status]`, `filter[teamId]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "name": "WTC Warmup", "status": "active", "teamSize": 5, "setupLockedAt": null }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`

#### `POST /tournaments` (captain)
- **Description:** Create tournament manually or with import metadata.
- **Query params:** none
- **Request JSON:** `{ "name": "WTC Warmup", "teamId": "uuid", "teamSize": 5, "sourceType": "champions_hub", "sourceUrl": "https://..." }`
- **Response JSON:** tournament object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`

#### `GET /tournaments/{tournamentId}`
- **Description:** Get tournament details.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** tournament object + high-level stats (`roundCount`, `activeRoundId`)
- **Success:** `200 OK`
- **Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 TOURNAMENT_NOT_FOUND`

#### `PATCH /tournaments/{tournamentId}` (captain)
- **Description:** Update tournament fields while active.
- **Query params:** none
- **Request JSON:** `{ "name": "Updated name", "status": "active" }`
- **Response JSON:** tournament object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 TEAM_SIZE_IMMUTABLE_AFTER_SETUP_LOCK`

#### `POST /tournaments/{tournamentId}/lock-setup` (captain)
- **Description:** Set `setup_locked_at` and freeze mutable setup constraints (notably `team_size`).
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "id": "uuid", "setupLockedAt": "ts" }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `409 SETUP_ALREADY_LOCKED`

#### `POST /tournaments/{tournamentId}/close` (captain)
- **Description:** Close tournament; all dependent round data becomes read-only.
- **Query params:** none
- **Request JSON:** `{ "closedAt": "optional-ts" }`
- **Response JSON:** `{ "id": "uuid", "status": "closed", "closedAt": "ts" }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `409 TOURNAMENT_ALREADY_CLOSED`

#### `GET /tournaments/{tournamentId}/roster`
- **Description:** Read frozen roster snapshot for tournament.
- **Query params:** `sort`, `filter[role]`, `filter[isPlaying]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "membershipId": "uuid", "slotNo": 1, "role": "player", "isPlaying": true }] }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 TOURNAMENT_NOT_FOUND`

#### `PUT /tournaments/{tournamentId}/roster` (captain)
- **Description:** Replace roster snapshot atomically.
- **Query params:** none
- **Request JSON:** `{ "members": [{ "membershipId": "uuid", "slotNo": 1, "role": "captain", "isPlaying": false }] }`
- **Response JSON:** `{ "data": [...] }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_SLOT_OR_MEMBERSHIP`

---

### 2.5 Join codes and joining flow

#### `GET /tournaments/{tournamentId}/join-code` (captain)
- **Description:** Read current active join code with remaining uses and TTL.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "id": "uuid", "code": "123456", "status": "active", "remainingUses": 2, "expiresAt": "ts" }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ACTIVE_CODE_NOT_FOUND`

#### `POST /tournaments/{tournamentId}/join-code/generate` (captain)
- **Description:** Generate/re-generate active join code; old active code becomes non-active.
- **Query params:** none
- **Request JSON:** `{ "ttlMinutes": 120 }`
- **Response JSON:** active join-code object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 TOURNAMENT_NOT_ACTIVE`

#### `POST /tournaments/{tournamentId}/join-code/revoke` (captain)
- **Description:** Revoke currently active code.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "revoked": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ACTIVE_CODE_NOT_FOUND`

#### `POST /join-codes/redeem` (player)
- **Description:** Join team/tournament using code; decrements `remaining_uses`.
- **Query params:** none
- **Request JSON:** `{ "code": "123456" }`
- **Response JSON:** `{ "joined": true, "membershipId": "uuid", "teamId": "uuid", "tournamentId": "uuid" }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `404 CODE_NOT_FOUND`, `409 CODE_EXPIRED_OR_EXHAUSTED`, `409 TEAM_FULL`

---

### 2.6 Rounds and round configuration

#### `GET /tournaments/{tournamentId}/rounds`
- **Description:** List rounds in dashboard order (MVP: active first, then newest; post-MVP optional sort by `sortOrder`).
- **Query params:** `page`, `pageSize`, `sort`, `filter[status]`, `filter[isActive]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "roundNumber": 1, "displayName": "Round 1", "status": "editable", "isActive": true, "sortOrder": 1 }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 TOURNAMENT_NOT_FOUND`

#### `POST /tournaments/{tournamentId}/rounds` (captain)
- **Description:** Create round.
- **Query params:** none
- **Request JSON:** `{ "roundNumber": 1, "displayName": "Round 1", "mission": "Mission A", "deployment": "Hammer and Anvil", "opponentTeamName": "Team Beta", "isActive": true, "sortOrder": 1 }`
- **Response JSON:** round object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ROUND_LIMIT_REACHED`, `409 DUPLICATE_ROUND_NUMBER`, `409 DUPLICATE_SORT_ORDER`, `409 ACTIVE_ROUND_ALREADY_EXISTS`

#### `GET /rounds/{roundId}`
- **Description:** Round details.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** round object
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `PATCH /rounds/{roundId}` (captain)
- **Description:** Update mission/deployment/name/opponent/isActive/sortOrder while editable.
- **Query params:** none
- **Request JSON:** `{ "displayName": "Round 2", "mission": "New mission", "deployment": "Dawn of War", "opponentTeamName": "Team Gamma", "isActive": false, "sortOrder": 2 }`
- **Response JSON:** round object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ROUND_LOCKED`, `409 TOURNAMENT_CLOSED`

#### `POST /rounds/{roundId}/activate` (captain)
- **Description:** Mark one round as active and demote other active round in same tournament.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "roundId": "uuid", "isActive": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `409 ROUND_LOCKED`, `404 ROUND_NOT_FOUND`

#### `POST /rounds/{roundId}/reorder` (captain, post-MVP capable)
- **Description:** Update `sortOrder` for round list drag-and-drop.
- **Query params:** none
- **Request JSON:** `{ "sortOrder": 3 }`
- **Response JSON:** `{ "roundId": "uuid", "sortOrder": 3 }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_SORT_ORDER`

#### `POST /rounds/{roundId}/lock` (captain)
- **Description:** Lock round (set `status=locked`, `lockedAt`, `lockedByMembershipId`), making round-scoped data read-only.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "id": "uuid", "status": "locked", "lockedAt": "ts", "lockedByMembershipId": "uuid" }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `409 ROUND_ALREADY_LOCKED`, `409 TOURNAMENT_CLOSED`

---

### 2.7 Opponents and tables

#### `GET /rounds/{roundId}/opponents`
- **Description:** List opponent players for round.
- **Query params:** `page`, `pageSize`, `sort`, `filter[name]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "name": "Opponent A", "faction": "Faction", "listText": "...", "externalRef": "id", "listOpenedRequired": true }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `POST /rounds/{roundId}/opponents` (captain)
- **Description:** Create opponent player.
- **Query params:** none
- **Request JSON:** `{ "name": "Opponent A", "faction": "Faction", "listText": "raw roster", "externalRef": "source-id", "listOpenedRequired": true }`
- **Response JSON:** opponent object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_OPPONENT_NAME`, `409 ROUND_LOCKED`

#### `PATCH /rounds/{roundId}/opponents/{opponentId}` (captain)
- **Description:** Update opponent metadata.
- **Query params:** none
- **Request JSON:** `{ "faction": "Updated", "listText": "..." }`
- **Response JSON:** opponent object
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 OPPONENT_NOT_FOUND`, `409 ROUND_LOCKED`

#### `DELETE /rounds/{roundId}/opponents/{opponentId}` (captain)
- **Description:** Remove opponent (cascade deletes linked estimations as DB dictates).
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "deleted": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 OPPONENT_NOT_FOUND`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/tables`
- **Description:** List round tables.
- **Query params:** `page`, `pageSize`, `sort`, `filter[tableNo]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "tableNo": 1, "tableName": "Top table", "imageAssetId": "uuid" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `PUT /rounds/{roundId}/tables` (captain)
- **Description:** Replace full table set for round atomically.
- **Query params:** none
- **Request JSON:** `{ "tables": [{ "tableNo": 1, "tableName": "Top table", "imageAssetId": "uuid" }] }`
- **Response JSON:** `{ "data": [...] }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_TABLE_NO`, `409 ROUND_LOCKED`

---

### 2.8 Table assets

#### `GET /table-assets`
- **Description:** List available table images and attribution metadata.
- **Query params:** `page`, `pageSize`, `sort`, `filter[label]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "label": "WTC Table 1", "imageUrl": "https://...", "sourceUrl": "https://...", "sourceAttribution": "Author" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** none for authenticated; `200 OK` also allowed for anon if public endpoint is enabled

#### `POST /table-assets` (captain)
- **Description:** Create table asset.
- **Query params:** none
- **Request JSON:** `{ "label": "Table A", "imageUrl": "https://...", "sourceUrl": "https://...", "sourceAttribution": "Event pack" }`
- **Response JSON:** table-asset object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`

#### `PATCH /table-assets/{assetId}` (captain)
- **Description:** Update table asset metadata.
- **Query params:** none
- **Request JSON:** `{ "label": "Updated" }`
- **Response JSON:** table-asset object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 ASSET_NOT_FOUND`

#### `DELETE /table-assets/{assetId}` (captain)
- **Description:** Delete table asset if not restricted by references.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "deleted": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ASSET_NOT_FOUND`, `409 ASSET_IN_USE`

---

### 2.9 Player estimations and preferences

#### `GET /rounds/{roundId}/estimations`
- **Description:** Matrix read endpoint with RLS visibility:
  - captain: full matrix
  - player: own rows always, full matrix only after own completion.
- **Query params:** `page`, `pageSize`, `sort`, `filter[playerMembershipId]`, `filter[opponentPlayerId]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "listOpenedAt": "ts", "hasFirstTurnImpact": true, "scoreSingle": null, "scoreGoFirst": 12, "scoreGoSecond": 8, "comment": "Good on this map" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `PUT /rounds/{roundId}/estimations/{opponentPlayerId}` (player own row)
- **Description:** Upsert own estimation for opponent.
- **Query params:** none
- **Request JSON:** `{ "listOpenedAt": "ts", "hasFirstTurnImpact": false, "scoreSingle": 10, "scoreGoFirst": null, "scoreGoSecond": null, "comment": "Optional text <= 200" }`
- **Response JSON:** estimation object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 ONLY_PLAYER_ROLE_ALLOWED`, `403 CANNOT_EDIT_OTHER_PLAYER_ESTIMATION`, `409 ROUND_LOCKED`

#### `DELETE /rounds/{roundId}/estimations/{estimationId}` (captain only)
- **Description:** Administrative delete/reset of estimation row.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "deleted": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ESTIMATION_NOT_FOUND`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/table-preferences`
- **Description:** List stored table preferences (only non-neutral rows persisted).
- **Query params:** `page`, `pageSize`, `sort`, `filter[playerMembershipId]`, `filter[roundTableId]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "playerMembershipId": "uuid", "roundTableId": "uuid", "preference": "preferred" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `PUT /rounds/{roundId}/table-preferences/{roundTableId}` (player own row)
- **Description:** Upsert own table preference delta.
- **Query params:** none
- **Request JSON:** `{ "preference": "preferred" }`
- **Response JSON:** preference object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 ONLY_PLAYER_ROLE_ALLOWED`, `409 ROUND_LOCKED`

#### `DELETE /rounds/{roundId}/table-preferences/{roundTableId}` (player own row)
- **Description:** Remove preference row to represent neutral.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "deleted": true, "interpretedAs": "neutral" }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 PREFERENCE_NOT_FOUND`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/estimation-status/me`
- **Description:** Read completion status for current player.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "completed": true, "opponentCount": 5, "myEstimationsCount": 5 }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

---

### 2.10 Pairing matrix and cell modal (captain/conditional player)

#### `GET /rounds/{roundId}/matrix`
- **Description:** Return matrix-ready aggregate (estimations + table preference summary + comments).
- **Query params:** `filter[view]=captain|player`
- **Request JSON:** n/a
- **Response JSON:** `{ "rows": [...], "columns": [...], "cells": [{ "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "estimation": { ... }, "tablePreferenceSummary": { "preferred": 2, "notPreferred": 1 }, "comment": "..." }] }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `GET /rounds/{roundId}/matrix/cells`
- **Description:** List matrix cells with filtering for captain dashboard.
- **Query params:** `page`, `pageSize`, `sort`, `filter[playerMembershipId]`, `filter[opponentPlayerId]`
- **Request JSON:** n/a
- **Response JSON:** list response with cell objects
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`

#### `GET /rounds/{roundId}/matrix/cells/{playerMembershipId}/{opponentPlayerId}`
- **Description:** Modal details (table preferences, first-turn impact, comment).
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "estimation": { ... }, "tablePreferences": [...], "comment": "..." }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 CELL_NOT_FOUND`

---

### 2.11 Pairing simulator and live flow

#### `GET /rounds/{roundId}/pairing-runs`
- **Description:** List simulations and live runs.
- **Query params:** `page`, `pageSize`, `sort`, `filter[mode]`, `filter[isFinal]`, `filter[simulationRating]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "mode": "simulation", "name": "Plan A", "simulationRating": "better", "isFinal": false, "finalizedAt": null }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 ROUND_NOT_FOUND`

#### `POST /rounds/{roundId}/pairing-runs` (captain)
- **Description:** Create simulation or live run.
- **Query params:** none
- **Request JSON:** `{ "mode": "simulation", "name": "Plan A", "simulationRating": "neutral", "sortOrder": 1 }`
- **Response JSON:** pairing-run object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ROUND_LOCKED`

#### `PATCH /pairing-runs/{pairingRunId}` (captain)
- **Description:** Update run metadata (name/rating/sort/finalization draft fields).
- **Query params:** none
- **Request JSON:** `{ "name": "Plan B", "simulationRating": "better", "sortOrder": 2 }`
- **Response JSON:** pairing-run object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 PAIRING_RUN_NOT_FOUND`, `409 ROUND_LOCKED`

#### `POST /pairing-runs/{pairingRunId}/finalize` (captain, live only)
- **Description:** Finalize live pairing run (`isFinal=true`, `finalizedAt=now`), lock live editing.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "id": "uuid", "mode": "live", "isFinal": true, "finalizedAt": "ts" }`
- **Success:** `200 OK`
- **Errors:** `400 INVALID_MODE`, `403 FORBIDDEN`, `409 LIVE_FINAL_ALREADY_EXISTS`, `409 ROUND_LOCKED`

#### `DELETE /pairing-runs/{pairingRunId}` (captain)
- **Description:** Delete run (cascade to steps and assignments).
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "deleted": true }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 PAIRING_RUN_NOT_FOUND`, `409 CANNOT_DELETE_FINAL_LIVE_RUN`

#### `GET /pairing-runs/{pairingRunId}/steps`
- **Description:** List wizard/live steps.
- **Query params:** `sort`, `page`, `pageSize`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "stepNo": 1, "phaseKey": "defender_pick", "payload": { } }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 PAIRING_RUN_NOT_FOUND`

#### `PUT /pairing-runs/{pairingRunId}/steps` (captain)
- **Description:** Replace full ordered step sequence.
- **Query params:** none
- **Request JSON:** `{ "steps": [{ "stepNo": 1, "phaseKey": "defender_pick", "payload": { "playerId": "uuid" } }] }`
- **Response JSON:** `{ "data": [...] }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_STEP_NO`, `409 ROUND_LOCKED`

#### `GET /pairing-runs/{pairingRunId}/assignments`
- **Description:** List pairings in run (including optional table, estimation link, result).
- **Query params:** `page`, `pageSize`, `sort`, `filter[playerMembershipId]`, `filter[opponentPlayerId]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "roundTableId": "uuid", "estimationId": "uuid", "gameResult": 12 }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 PAIRING_RUN_NOT_FOUND`

#### `PUT /pairing-runs/{pairingRunId}/assignments` (captain)
- **Description:** Replace final pair assignments for run.
- **Query params:** none
- **Request JSON:** `{ "assignments": [{ "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "roundTableId": "uuid", "estimationId": "uuid" }] }`
- **Response JSON:** `{ "data": [...] }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_PLAYER_OR_OPPONENT`, `409 ROUND_LOCKED`

#### `PATCH /pairing-assignments/{assignmentId}/result` (captain)
- **Description:** Enter/edit game result manually (0..20).
- **Query params:** none
- **Request JSON:** `{ "gameResult": 14 }`
- **Response JSON:** assignment object
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 ASSIGNMENT_NOT_FOUND`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/final-pairings`
- **Description:** Final live table summary for post-live view.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** `{ "roundId": "uuid", "pairings": [{ "playerMembershipId": "uuid", "opponentPlayerId": "uuid", "estimation": { ... }, "table": { ... }, "comment": "text", "gameResult": 14 }] }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 FINAL_LIVE_RUN_NOT_FOUND`

---

### 2.12 Estimator view

#### `POST /rounds/{roundId}/estimator-sessions` (captain)
- **Description:** Start estimator session.
- **Query params:** none
- **Request JSON:** `{ }`
- **Response JSON:** `{ "id": "uuid", "roundId": "uuid", "createdByMembershipId": "uuid", "createdAt": "ts" }`
- **Success:** `201 CREATED`
- **Errors:** `403 FORBIDDEN`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/estimator-sessions`
- **Description:** List estimator sessions.
- **Query params:** `page`, `pageSize`, `sort`
- **Request JSON:** n/a
- **Response JSON:** list response
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`

#### `GET /estimator-sessions/{sessionId}/events`
- **Description:** List estimator click events in order.
- **Query params:** `page`, `pageSize`, `sort=eventOrder`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "actorMembershipId": "uuid", "tileLabel": "green", "tileValue": 12, "eventOrder": 1, "clickedAt": "ts" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 SESSION_NOT_FOUND`

#### `POST /estimator-sessions/{sessionId}/events` (captain)
- **Description:** Append event after tile click.
- **Query params:** none
- **Request JSON:** `{ "actorMembershipId": "uuid", "tileLabel": "green", "tileValue": 12, "eventOrder": 2, "clickedAt": "optional-ts" }`
- **Response JSON:** event object
- **Success:** `201 CREATED`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE_EVENT_ORDER`, `409 ROUND_LOCKED`

---

### 2.13 Offline captain sync (local wins)

#### `POST /rounds/{roundId}/offline-sync` (captain)
- **Description:** Push local snapshot to backend (`local wins` conflict policy).
- **Query params:** none
- **Request JSON:** `{ "clientSnapshotId": "client-uuid", "payload": { "pairingRunDraft": { }, "timestamp": "ts" } }`
- **Response JSON:** `{ "applied": true, "snapshotId": "uuid", "conflictResolution": "local_wins" }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ROUND_LOCKED`

#### `GET /rounds/{roundId}/offline-sync`
- **Description:** List synced snapshots for diagnostics.
- **Query params:** `page`, `pageSize`, `sort=-syncedAt`
- **Request JSON:** n/a
- **Response JSON:** list response
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`

---

### 2.14 Import and fallback workflow

#### `POST /imports/tournaments` (captain)
- **Description:** Start import from supported source URL.
- **Query params:** none
- **Request JSON:** `{ "sourceType": "champions_hub", "sourceUrl": "https://...", "teamId": "uuid" }`
- **Response JSON:** `{ "importRunId": "uuid", "status": "success", "usedCache": true, "tournamentId": "uuid" }`
- **Success:** `202 ACCEPTED` (async) or `200 OK` (fast cache hit)
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `422 UNSUPPORTED_SOURCE`, `502 SCRAPING_FAILED`

#### `POST /imports/tournaments/fallback` (captain)
- **Description:** Manual fallback import with raw pasted text.
- **Query params:** none
- **Request JSON:** `{ "teamId": "uuid", "sourceUrl": "optional", "rawText": "..." }`
- **Response JSON:** `{ "importRunId": "uuid", "status": "partial_success", "tournamentId": "uuid", "warnings": ["Could not parse player 4 list fully"] }`
- **Success:** `202 ACCEPTED` or `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `422 PARSING_FAILED`

#### `GET /import-runs`
- **Description:** List import run diagnostics (captain).
- **Query params:** `page`, `pageSize`, `sort=-createdAt`, `filter[sourceType]`, `filter[status]`, `filter[sourceUrl]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "sourceType": "champions_hub", "sourceUrl": "https://...", "status": "success", "createdAt": "ts" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`

#### `GET /import-runs/{importRunId}`
- **Description:** Fetch diagnostic detail with payload and error message.
- **Query params:** none
- **Request JSON:** n/a
- **Response JSON:** import-run object
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `404 IMPORT_RUN_NOT_FOUND`

---

### 2.15 Audit and observability

#### `GET /audit-events`
- **Description:** List audit events available to current team context.
- **Query params:** `page`, `pageSize`, `sort=-createdAt`, `filter[teamId]`, `filter[tournamentId]`, `filter[roundId]`, `filter[eventType]`
- **Request JSON:** n/a
- **Response JSON:** `{ "data": [{ "id": "uuid", "eventType": "round_hard_reset", "teamId": "uuid", "tournamentId": "uuid", "roundId": "uuid", "metadata": { }, "createdAt": "ts" }], "pagination": { ... } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`

---

### 2.16 Explicit business-operation endpoints

#### `POST /rounds/{roundId}/hard-reset` (captain, optional explicit endpoint)
- **Description:** Optional explicit API to perform same reset semantics as `opponentTeamName` change trigger.
- **Query params:** none
- **Request JSON:** `{ "reason": "manual_reset" }`
- **Response JSON:** `{ "reset": true, "deleted": { "pairingRuns": 2, "estimations": 25, "preferences": 16, "offlineSnapshots": 1, "opponents": 5 } }`
- **Success:** `200 OK`
- **Errors:** `403 FORBIDDEN`, `409 ROUND_LOCKED`

#### `POST /rounds/{roundId}/opponent-team` (captain)
- **Description:** Set/change `opponentTeamName`; DB trigger performs hard reset and logs audit event.
- **Query params:** none
- **Request JSON:** `{ "opponentTeamName": "Team Omega" }`
- **Response JSON:** `{ "id": "uuid", "opponentTeamName": "Team Omega", "hardResetTriggered": true }`
- **Success:** `200 OK`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 ROUND_LOCKED`

---

## 3. Authentication and authorization

- **Authentication mechanism**
  - Supabase Auth with JWT.
  - Pilot login uses account list and 6-digit PIN check, then server exchanges into session token.
  - API trusts `auth.uid()` and JWT custom claims: `active_team_id`, `active_membership_id`.

- **Authorization model**
  - Row Level Security (RLS) in PostgreSQL is the source of truth.
  - Route handlers perform coarse checks and return clean domain errors.
  - Database policies enforce final checks (captain-only mutations, player-only estimation writes, team scoping).

- **Role behavior**
  - `captain`: manage team/tournament/round configuration, join codes, pairing workflows, estimator sessions, offline sync, results.
  - `player`: write only own `matchup_estimations` and `table_preferences`, read according to completion gate.
  - Both roles can read closed/locked historical data in team scope.

- **Rate limiting and security controls**
  - `POST /auth/pin-login`: strict IP+account rate limit (e.g., 5/min, escalating lockout), brute-force detection.
  - `POST /join-codes/redeem`: medium rate limit (e.g., 20/min per IP/device), abuse monitoring.
  - Captain write endpoints: per-user burst+daily quotas to protect accidental loops.
  - Use idempotency key headers for mutation endpoints likely retried (`offline-sync`, import starts, generate join code).
  - Validate payload size for large text/json fields (`listText`, `payload`, fallback import text).
  - Never expose service-role credentials to clients.

## 4. Validation and business logic

### Resource validation rules

- **users**
  - `email` non-empty, unique.
  - `displayName` non-empty.
  - `pin` exactly 6 digits (API-level input contract).

- **teams / memberships**
  - `teams.name` non-empty.
  - Single active membership per (`teamId`, `userId`) where `leftAt IS NULL`.
  - `leftAt >= joinedAt` when set.

- **tournaments / roster**
  - `teamSize >= 5`.
  - `status=closed` requires `closedAt`; `status=active` requires `closedAt=null`.
  - `teamSize` immutable after `setupLockedAt` is set.
  - Roster uniqueness: (`tournamentId`, `membershipId`) and (`tournamentId`, `slotNo`).
  - `slotNo >= 1`.

- **join codes**
  - `code` must match `^[0-9]{6}$`.
  - `remainingUses >= 0`.
  - `expiresAt > createdAt`.
  - One active code per tournament (`status='active'` partial unique index).
  - Code redeem allowed only when active, not expired, and `remainingUses > 0`.

- **rounds**
  - `roundNumber` 1..200.
  - max 200 rounds per tournament (trigger).
  - `displayName` trimmed non-empty.
  - `sortOrder` 1..200 and unique in tournament.
  - At most one active round per tournament.
  - Lock consistency:
    - `locked` => both `lockedAt` and `lockedByMembershipId` required.
    - `editable` => both must be null.

- **opponents / tables / assets**
  - Opponent unique by (`roundId`, `name`).
  - Table unique by (`roundId`, `tableNo`), with `tableNo >= 1`.
  - `table_assets.image_url`, `source_url`, `source_attribution` non-empty.

- **matchup estimations**
  - Unique (`roundId`, `playerMembershipId`, `opponentPlayerId`).
  - `comment` max 200 chars.
  - score fields in 0..20.
  - first-turn model:
    - no impact => `scoreSingle` required, split scores null.
    - impact => split scores required, `scoreSingle` null.
  - API requires `listOpenedAt` present before save.

- **table preferences**
  - Unique (`roundId`, `playerMembershipId`, `roundTableId`).
  - Value only `preferred` or `not_preferred`; neutral represented by missing row.

- **pairing runs / steps / assignments**
  - Simulation run cannot be final.
  - Live final run requires `finalizedAt`.
  - Only one final live run per round.
  - Step uniqueness (`pairingRunId`, `stepNo`), `stepNo >= 1`.
  - Assignment uniqueness per player and opponent in run.
  - `gameResult` null or 0..20.

- **estimator**
  - Event order unique per session.
  - `tileValue` 0..20.
  - `eventOrder >= 1`.

- **offline sync / import / audit**
  - `offline_sync_snapshots.client_snapshot_id` unique (idempotent sync).
  - `import_runs` dedupe by (`sourceUrl`, `sourceHash`).
  - `audit_events` append-only from backend/trigger paths.

### Business logic mapping to endpoints

- **Pilot PIN access and role gating**
  - `POST /auth/pin-login`, `POST /auth/context`, JWT claim propagation.

- **Join by captain-generated TTL code**
  - `POST /tournaments/{id}/join-code/generate`, `POST /join-codes/redeem`, `POST /tournaments/{id}/join-code/revoke`.

- **Tournament import with cache and manual fallback**
  - `POST /imports/tournaments`, `POST /imports/tournaments/fallback`, `GET /import-runs`.

- **Round lifecycle and ordering**
  - `POST /tournaments/{id}/rounds`, `PATCH /rounds/{id}`, `POST /rounds/{id}/activate`, `POST /rounds/{id}/reorder`, `POST /rounds/{id}/lock`.

- **Player estimation flow**
  - `GET /rounds/{id}/estimations`, `PUT /rounds/{id}/estimations/{opponentId}`, `GET /rounds/{id}/estimation-status/me`.

- **Table preference flow**
  - `GET /rounds/{id}/table-preferences`, `PUT /rounds/{id}/table-preferences/{tableId}`, `DELETE /rounds/{id}/table-preferences/{tableId}`.

- **Captain matrix and modal**
  - `GET /rounds/{id}/matrix`, `GET /rounds/{id}/matrix/cells/{playerId}/{opponentId}`.

- **Simulator and live pairing**
  - `GET/POST /rounds/{id}/pairing-runs`, `PUT /pairing-runs/{id}/steps`, `PUT /pairing-runs/{id}/assignments`, `POST /pairing-runs/{id}/finalize`, `GET /rounds/{id}/final-pairings`.

- **Manual results entry by captain**
  - `PATCH /pairing-assignments/{id}/result`.

- **Estimator click logging**
  - `POST /rounds/{id}/estimator-sessions`, `POST /estimator-sessions/{id}/events`, `GET /estimator-sessions/{id}/events`.

- **Hard reset on opponent-team change**
  - `POST /rounds/{id}/opponent-team` (trigger-backed reset), optional `POST /rounds/{id}/hard-reset`.

- **Offline captain mode with local-wins sync**
  - `POST /rounds/{id}/offline-sync`, `GET /rounds/{id}/offline-sync`.

- **Historical audit visibility**
  - `GET /audit-events`.

### Assumptions

- Route handlers are implemented in Next.js App Router (`/app/api/...`) and delegate DB permissions to Supabase RLS.
- Some endpoints represent aggregated read models (`/matrix`, `/final-pairings`) built from multiple tables for UI performance and simplicity.
- Team creation and membership CRUD endpoints may be admin-only in pilot operations, but are retained for completeness and controlled captain workflows.
