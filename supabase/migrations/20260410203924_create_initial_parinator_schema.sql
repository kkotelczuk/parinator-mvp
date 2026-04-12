-- migration: create_initial_parinator_schema
-- purpose:
--   bootstrap the parinator mvp relational model, business constraints, helper functions,
--   row-level-security policies, and triggers enforcing round/tournament immutability rules.
-- affected objects:
--   - enums: app_role, tournament_status, round_status, join_code_status, import_source,
--     import_status, pairing_mode, simulation_rating, table_preference_level
--   - tables: users, teams, team_memberships, tournaments, tournament_rosters, join_codes,
--     table_assets, rounds (display_name, is_active, sort_order, max 200/tournament),
--     opponent_players, round_tables, matchup_estimations,
--     table_preferences, pairing_runs, pairing_steps, pairing_assignments, estimator_sessions,
--     estimator_events, offline_sync_snapshots, import_runs, audit_events
--   - functions/triggers: auth-aware helpers, updated_at automation, round mutability guard,
--     hard reset logic on opponent team change, join_codes TTL (expires_at + status expired)
-- notes:
--   - all statements are intentionally lowercase for consistency
--   - rls is enabled on every new table, including tables with broad read access
--   - explicit deny policies are added for anon where applicable to make intent auditable

create extension if not exists pgcrypto;

-- domain enums used by business logic and check constraints.
create type app_role as enum ('captain', 'player');
create type tournament_status as enum ('active', 'closed');
create type round_status as enum ('editable', 'locked');
create type join_code_status as enum ('active', 'exhausted', 'revoked', 'expired');
create type import_source as enum ('champions_hub', 'best_coast_pairings', 'manual_fallback');
create type import_status as enum ('success', 'partial_success', 'failed');
create type pairing_mode as enum ('simulation', 'live');
create type simulation_rating as enum ('better', 'worse', 'neutral');
create type table_preference_level as enum ('preferred', 'not_preferred');

-- generic timestamp maintenance trigger.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- jwt helper: current membership id from claim, null-safe cast.
create or replace function current_membership_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'active_membership_id', '')::uuid;
$$;

-- jwt helper: current team id from claim, null-safe cast.
create or replace function current_team_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'active_team_id', '')::uuid;
$$;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_not_blank check (email <> ''),
  constraint users_display_name_not_blank check (display_name <> '')
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_not_blank check (name <> '')
);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  user_id uuid not null references users(id),
  role app_role not null,
  is_playing boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_memberships_left_at_order check (left_at is null or left_at >= joined_at)
);

create unique index team_memberships_active_member_uniq
  on team_memberships (team_id, user_id)
  where left_at is null;

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  name text not null,
  source_url text,
  source_type import_source,
  status tournament_status not null default 'active',
  team_size integer not null,
  setup_locked_at timestamptz,
  created_by_membership_id uuid not null references team_memberships(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_team_size_min check (team_size >= 5),
  constraint tournaments_closed_consistency check (
    (status = 'closed' and closed_at is not null)
    or
    (status = 'active' and closed_at is null)
  )
);

create table tournament_rosters (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  membership_id uuid not null references team_memberships(id),
  slot_no integer not null,
  role app_role not null,
  is_playing boolean not null,
  created_at timestamptz not null default now(),
  constraint tournament_rosters_tournament_membership_uniq unique (tournament_id, membership_id),
  constraint tournament_rosters_tournament_slot_uniq unique (tournament_id, slot_no),
  constraint tournament_rosters_slot_no_min check (slot_no >= 1)
);

create table join_codes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  tournament_id uuid not null references tournaments(id),
  code char(6) not null,
  status join_code_status not null default 'active',
  remaining_uses integer not null,
  generated_by_membership_id uuid not null references team_memberships(id),
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint join_codes_code_format check (code ~ '^[0-9]{6}$'),
  constraint join_codes_remaining_uses_min check (remaining_uses >= 0),
  constraint join_codes_expires_after_created check (expires_at > created_at)
);

-- TTL: before insert/update, mark time-expired active siblings for this tournament so a new active code can be inserted;
-- rows with active status but past expires_at are demoted to expired.
create or replace function join_codes_apply_ttl()
returns trigger
language plpgsql
set search_path = public
as $func$
begin
  if tg_op = 'INSERT' then
    update join_codes jc
    set status = 'expired'::join_code_status
    where jc.tournament_id = new.tournament_id
      and jc.status = 'active'::join_code_status
      and jc.expires_at < now();
  end if;

  if new.status = 'active'::join_code_status and new.expires_at < now() then
    new.status := 'expired'::join_code_status;
  end if;

  return new;
end;
$func$;

create trigger trg_join_codes_apply_ttl
  before insert or update on join_codes
  for each row
  execute function join_codes_apply_ttl();

create unique index join_codes_single_active_per_tournament_uniq
  on join_codes (tournament_id)
  where status = 'active';

create table table_assets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  image_url text not null,
  source_url text not null,
  source_attribution text not null,
  created_at timestamptz not null default now(),
  constraint table_assets_image_url_not_blank check (image_url <> ''),
  constraint table_assets_source_url_not_blank check (source_url <> ''),
  constraint table_assets_source_attribution_not_blank check (source_attribution <> '')
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  round_number integer not null,
  display_name text not null,
  mission text not null,
  deployment text not null,
  opponent_team_name text,
  status round_status not null default 'editable',
  locked_by_membership_id uuid references team_memberships(id),
  locked_at timestamptz,
  is_active boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rounds_tournament_round_uniq unique (tournament_id, round_number),
  constraint rounds_tournament_sort_order_uniq unique (tournament_id, sort_order),
  constraint rounds_round_number_min check (round_number >= 1),
  constraint rounds_round_number_max check (round_number <= 200),
  constraint rounds_display_name_not_blank check (char_length(trim(display_name)) > 0),
  constraint rounds_sort_order_range check (sort_order >= 1 and sort_order <= 200),
  constraint rounds_lock_consistency check (
    (status = 'locked' and locked_at is not null and locked_by_membership_id is not null)
    or
    (status = 'editable' and locked_at is null and locked_by_membership_id is null)
  )
);

-- at most one "active" (bieżąca) round per tournament for ordering and UX.
create unique index rounds_single_active_per_tournament_uniq
  on rounds (tournament_id)
  where is_active = true;

create index rounds_tournament_list_order_idx
  on rounds (tournament_id, is_active desc, created_at desc);

create or replace function rounds_enforce_max_200_per_tournament()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    select count(*)::integer
    from rounds
    where tournament_id = new.tournament_id
  ) >= 200 then
    raise exception 'tournament cannot have more than 200 rounds';
  end if;
  return new;
end;
$$;

create trigger trg_rounds_enforce_max_200_per_tournament
before insert on rounds
for each row execute function rounds_enforce_max_200_per_tournament();

create table opponent_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  name text not null,
  faction text,
  list_text text,
  external_ref text,
  list_opened_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint opponent_players_round_name_uniq unique (round_id, name)
);

create table round_tables (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  table_no integer not null,
  table_name text,
  image_asset_id uuid references table_assets(id),
  created_at timestamptz not null default now(),
  constraint round_tables_round_table_no_uniq unique (round_id, table_no),
  constraint round_tables_table_no_min check (table_no >= 1)
);

create table matchup_estimations (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_membership_id uuid not null references team_memberships(id),
  opponent_player_id uuid not null references opponent_players(id) on delete cascade,
  list_opened_at timestamptz not null,
  has_first_turn_impact boolean not null,
  score_single smallint,
  score_go_first smallint,
  score_go_second smallint,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matchup_estimations_unique_triplet unique (round_id, player_membership_id, opponent_player_id),
  constraint matchup_estimations_comment_max_len check (comment is null or char_length(comment) <= 200),
  constraint matchup_estimations_score_single_range check (score_single is null or score_single between 0 and 20),
  constraint matchup_estimations_score_go_first_range check (score_go_first is null or score_go_first between 0 and 20),
  constraint matchup_estimations_score_go_second_range check (score_go_second is null or score_go_second between 0 and 20),
  constraint matchup_estimations_first_turn_model check (
    (
      has_first_turn_impact = false
      and score_single is not null
      and score_go_first is null
      and score_go_second is null
    )
    or
    (
      has_first_turn_impact = true
      and score_single is null
      and score_go_first is not null
      and score_go_second is not null
    )
  )
);

create table table_preferences (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_membership_id uuid not null references team_memberships(id),
  round_table_id uuid not null references round_tables(id) on delete cascade,
  preference table_preference_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint table_preferences_unique_triplet unique (round_id, player_membership_id, round_table_id)
);

create table pairing_runs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  mode pairing_mode not null,
  name text,
  simulation_rating simulation_rating,
  sort_order integer,
  is_final boolean not null default false,
  finalized_at timestamptz,
  created_by_membership_id uuid not null references team_memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pairing_runs_simulation_not_final check (
    mode <> 'simulation' or is_final = false
  ),
  constraint pairing_runs_live_finalized_at check (
    not (mode = 'live' and is_final = true) or finalized_at is not null
  )
);

create unique index pairing_runs_single_live_final_per_round_uniq
  on pairing_runs (round_id, mode, is_final)
  where mode = 'live' and is_final = true;

create table pairing_steps (
  id uuid primary key default gen_random_uuid(),
  pairing_run_id uuid not null references pairing_runs(id) on delete cascade,
  step_no integer not null,
  phase_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint pairing_steps_pairing_run_step_no_uniq unique (pairing_run_id, step_no),
  constraint pairing_steps_step_no_min check (step_no >= 1)
);

create table pairing_assignments (
  id uuid primary key default gen_random_uuid(),
  pairing_run_id uuid not null references pairing_runs(id) on delete cascade,
  player_membership_id uuid not null references team_memberships(id),
  opponent_player_id uuid not null references opponent_players(id),
  round_table_id uuid references round_tables(id),
  estimation_id uuid references matchup_estimations(id),
  game_result smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pairing_assignments_pairing_run_player_uniq unique (pairing_run_id, player_membership_id),
  constraint pairing_assignments_pairing_run_opponent_uniq unique (pairing_run_id, opponent_player_id),
  constraint pairing_assignments_game_result_range check (game_result is null or game_result between 0 and 20)
);

create table estimator_sessions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  created_by_membership_id uuid not null references team_memberships(id),
  created_at timestamptz not null default now()
);

create table estimator_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references estimator_sessions(id) on delete cascade,
  actor_membership_id uuid not null references team_memberships(id),
  tile_label text not null,
  tile_value smallint not null,
  event_order integer not null,
  clicked_at timestamptz not null default now(),
  constraint estimator_events_session_event_order_uniq unique (session_id, event_order),
  constraint estimator_events_tile_value_range check (tile_value between 0 and 20),
  constraint estimator_events_event_order_min check (event_order >= 1)
);

create table offline_sync_snapshots (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  captain_membership_id uuid not null references team_memberships(id),
  client_snapshot_id text not null,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  constraint offline_sync_snapshots_client_snapshot_id_uniq unique (client_snapshot_id)
);

create table import_runs (
  id uuid primary key default gen_random_uuid(),
  source_type import_source not null,
  source_url text not null,
  source_hash text not null,
  status import_status not null,
  raw_payload jsonb,
  normalized_payload jsonb,
  error_message text,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  constraint import_runs_source_url_hash_uniq unique (source_url, source_hash)
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  tournament_id uuid references tournaments(id),
  round_id uuid references rounds(id),
  actor_user_id uuid references users(id),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- additional operational indexes from the design plan.
create index team_memberships_user_active_idx
  on team_memberships (user_id)
  where left_at is null;

create index team_memberships_team_role_active_idx
  on team_memberships (team_id, role)
  where left_at is null;

create index tournaments_team_status_idx
  on tournaments (team_id, status);

create index rounds_tournament_status_idx
  on rounds (tournament_id, status);

create index matchup_estimations_round_player_idx
  on matchup_estimations (round_id, player_membership_id);

create index pairing_runs_round_mode_created_at_idx
  on pairing_runs (round_id, mode, created_at desc);

create index join_codes_code_status_idx
  on join_codes (code, status);

create index join_codes_tournament_active_expires_idx
  on join_codes (tournament_id, expires_at)
  where status = 'active';

create index audit_events_team_created_at_idx
  on audit_events (team_id, created_at desc);

create index audit_events_round_created_at_idx
  on audit_events (round_id, created_at desc);

create index pairing_steps_payload_gin_idx
  on pairing_steps
  using gin (payload);

create index audit_events_metadata_gin_idx
  on audit_events
  using gin (metadata);

-- helper: verifies that a jwt-provided membership is still active, belongs to user and team.
create or replace function is_active_membership(_membership_id uuid, _user_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_memberships tm
    where tm.id = _membership_id
      and tm.user_id = _user_id
      and tm.team_id = _team_id
      and tm.left_at is null
  );
$$;

-- helper: role check for captain-only operations.
create or replace function is_team_captain(_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_memberships tm
    where tm.id = _membership_id
      and tm.role = 'captain'
      and tm.left_at is null
  );
$$;

-- helper: round write guard requires editable round and active tournament.
create or replace function is_round_editable(_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rounds r
    join tournaments t on t.id = r.tournament_id
    where r.id = _round_id
      and r.status = 'editable'
      and t.status = 'active'
  );
$$;

-- helper: used by player matrix visibility logic.
create or replace function has_completed_round_estimations(_round_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with opponent_count as (
    select count(*)::integer as c
    from opponent_players op
    where op.round_id = _round_id
  ),
  my_estimation_count as (
    select count(*)::integer as c
    from matchup_estimations me
    where me.round_id = _round_id
      and me.player_membership_id = _membership_id
  )
  select
    (oc.c > 0) and (oc.c = mec.c)
  from opponent_count oc
  cross join my_estimation_count mec;
$$;

-- auth context helpers reused by many policies for consistency.
create or replace function can_access_team(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and is_active_membership(current_membership_id(), auth.uid(), _team_id);
$$;

create or replace function can_manage_team(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    can_access_team(_team_id)
    and is_team_captain(current_membership_id());
$$;

create or replace function can_access_tournament(_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tournaments t
    where t.id = _tournament_id
      and can_access_team(t.team_id)
  );
$$;

create or replace function can_manage_tournament(_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tournaments t
    where t.id = _tournament_id
      and t.status = 'active'
      and can_manage_team(t.team_id)
  );
$$;

create or replace function can_access_round(_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rounds r
    join tournaments t on t.id = r.tournament_id
    where r.id = _round_id
      and can_access_team(t.team_id)
  );
$$;

create or replace function can_manage_round(_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    can_access_round(_round_id)
    and is_round_editable(_round_id)
    and is_team_captain(current_membership_id());
$$;

create or replace function is_current_membership_player()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_memberships tm
    where tm.id = current_membership_id()
      and tm.left_at is null
      and tm.role = 'player'
  );
$$;

create or replace function is_current_captain_for_round(_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    can_access_round(_round_id)
    and is_team_captain(current_membership_id());
$$;

-- immutable team_size after setup lock.
create or replace function prevent_team_size_change_after_setup_lock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.setup_locked_at is not null and new.team_size <> old.team_size then
    raise exception 'team_size cannot change after setup is locked';
  end if;
  return new;
end;
$$;

create trigger trg_tournaments_set_updated_at
before update on tournaments
for each row execute function set_updated_at();

create trigger trg_tournaments_team_size_immutable_after_lock
before update on tournaments
for each row execute function prevent_team_size_change_after_setup_lock();

create trigger trg_users_set_updated_at
before update on users
for each row execute function set_updated_at();

create trigger trg_teams_set_updated_at
before update on teams
for each row execute function set_updated_at();

create trigger trg_rounds_set_updated_at
before update on rounds
for each row execute function set_updated_at();

create trigger trg_matchup_estimations_set_updated_at
before update on matchup_estimations
for each row execute function set_updated_at();

create trigger trg_table_preferences_set_updated_at
before update on table_preferences
for each row execute function set_updated_at();

create trigger trg_pairing_runs_set_updated_at
before update on pairing_runs
for each row execute function set_updated_at();

create trigger trg_pairing_assignments_set_updated_at
before update on pairing_assignments
for each row execute function set_updated_at();

-- data-mutability guard for round-scoped tables.
-- this blocks inserts/updates/deletes when round is locked or tournament is closed.
create or replace function assert_round_is_mutable_direct()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _round_id uuid;
begin
  if tg_op = 'delete' then
    _round_id := old.round_id;
  else
    _round_id := new.round_id;
  end if;

  if _round_id is null then
    raise exception 'round_id is required for mutability guard';
  end if;

  if not is_round_editable(_round_id) then
    raise exception 'round data is read-only because round is locked or tournament is closed';
  end if;

  if tg_op = 'delete' then
    return old;
  end if;

  return new;
end;
$$;

-- equivalent guard for objects linked through pairing_run_id.
create or replace function assert_round_is_mutable_via_pairing_run()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _pairing_run_id uuid;
  _round_id uuid;
begin
  if tg_op = 'delete' then
    _pairing_run_id := old.pairing_run_id;
  else
    _pairing_run_id := new.pairing_run_id;
  end if;

  select pr.round_id
  into _round_id
  from pairing_runs pr
  where pr.id = _pairing_run_id;

  if _round_id is null then
    raise exception 'unable to resolve round_id for pairing mutability guard';
  end if;

  if not is_round_editable(_round_id) then
    raise exception 'round data is read-only because round is locked or tournament is closed';
  end if;

  if tg_op = 'delete' then
    return old;
  end if;

  return new;
end;
$$;

-- estimator_event guard resolves round through session.
create or replace function assert_round_is_mutable_via_estimator_session()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _session_id uuid;
  _round_id uuid;
begin
  if tg_op = 'delete' then
    _session_id := old.session_id;
  else
    _session_id := new.session_id;
  end if;

  select es.round_id
  into _round_id
  from estimator_sessions es
  where es.id = _session_id;

  if _round_id is null then
    raise exception 'unable to resolve round_id for estimator mutability guard';
  end if;

  if not is_round_editable(_round_id) then
    raise exception 'round data is read-only because round is locked or tournament is closed';
  end if;

  if tg_op = 'delete' then
    return old;
  end if;

  return new;
end;
$$;

create trigger trg_opponent_players_round_mutability
before insert or update or delete on opponent_players
for each row execute function assert_round_is_mutable_direct();

create trigger trg_round_tables_round_mutability
before insert or update or delete on round_tables
for each row execute function assert_round_is_mutable_direct();

create trigger trg_matchup_estimations_round_mutability
before insert or update or delete on matchup_estimations
for each row execute function assert_round_is_mutable_direct();

create trigger trg_table_preferences_round_mutability
before insert or update or delete on table_preferences
for each row execute function assert_round_is_mutable_direct();

create trigger trg_pairing_runs_round_mutability
before insert or update or delete on pairing_runs
for each row execute function assert_round_is_mutable_direct();

create trigger trg_estimator_sessions_round_mutability
before insert or update or delete on estimator_sessions
for each row execute function assert_round_is_mutable_direct();

create trigger trg_offline_sync_snapshots_round_mutability
before insert or update or delete on offline_sync_snapshots
for each row execute function assert_round_is_mutable_direct();

create trigger trg_pairing_steps_round_mutability
before insert or update or delete on pairing_steps
for each row execute function assert_round_is_mutable_via_pairing_run();

create trigger trg_pairing_assignments_round_mutability
before insert or update or delete on pairing_assignments
for each row execute function assert_round_is_mutable_via_pairing_run();

create trigger trg_estimator_events_round_mutability
before insert or update or delete on estimator_events
for each row execute function assert_round_is_mutable_via_estimator_session();

-- hard reset workflow when opponent team changes.
-- destructive section rationale:
--   - all round-derived tactical data becomes semantically invalid once opponent roster changes.
--   - this trigger performs targeted deletes only for the affected round to avoid accidental data loss.
create or replace function hard_reset_round_on_opponent_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _actor_user_id uuid;
begin
  if old.opponent_team_name is not distinct from new.opponent_team_name then
    return new;
  end if;

  -- destructive delete:
  -- deleting pairing_runs first cascades to pairing_steps and pairing_assignments by foreign keys.
  delete from pairing_runs
  where round_id = old.id;

  -- destructive delete:
  -- deleting estimator_sessions first cascades to estimator_events.
  delete from estimator_sessions
  where round_id = old.id;

  -- destructive delete:
  -- these tables are direct round artifacts and must be rebuilt for new opponent data.
  delete from matchup_estimations where round_id = old.id;
  delete from table_preferences where round_id = old.id;
  delete from offline_sync_snapshots where round_id = old.id;
  delete from opponent_players where round_id = old.id;

  _actor_user_id := auth.uid();

  insert into audit_events (
    team_id,
    tournament_id,
    round_id,
    actor_user_id,
    event_type,
    metadata
  )
  select
    t.team_id,
    r.tournament_id,
    r.id,
    _actor_user_id,
    'round_hard_reset',
    jsonb_build_object(
      'from_opponent_team_name', old.opponent_team_name,
      'to_opponent_team_name', new.opponent_team_name,
      'triggered_at', now()
    )
  from rounds r
  join tournaments t on t.id = r.tournament_id
  where r.id = old.id;

  return new;
end;
$$;

create trigger trg_rounds_hard_reset_on_opponent_change
before update of opponent_team_name on rounds
for each row execute function hard_reset_round_on_opponent_change();

-- enable row level security for every table in this migration.
alter table users enable row level security;
alter table teams enable row level security;
alter table team_memberships enable row level security;
alter table tournaments enable row level security;
alter table tournament_rosters enable row level security;
alter table join_codes enable row level security;
alter table table_assets enable row level security;
alter table rounds enable row level security;
alter table opponent_players enable row level security;
alter table round_tables enable row level security;
alter table matchup_estimations enable row level security;
alter table table_preferences enable row level security;
alter table pairing_runs enable row level security;
alter table pairing_steps enable row level security;
alter table pairing_assignments enable row level security;
alter table estimator_sessions enable row level security;
alter table estimator_events enable row level security;
alter table offline_sync_snapshots enable row level security;
alter table import_runs enable row level security;
alter table audit_events enable row level security;

-- users policies:
-- authenticated users can only read and update their own profile row.
create policy users_select_anon on users
for select to anon
using (false);

create policy users_insert_anon on users
for insert to anon
with check (false);

create policy users_update_anon on users
for update to anon
using (false)
with check (false);

create policy users_delete_anon on users
for delete to anon
using (false);

create policy users_select_authenticated on users
for select to authenticated
using (id = auth.uid());

create policy users_insert_authenticated on users
for insert to authenticated
with check (false);

create policy users_update_authenticated on users
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy users_delete_authenticated on users
for delete to authenticated
using (false);

-- teams policies:
-- team visibility is limited to active members of the team.
create policy teams_select_anon on teams
for select to anon
using (false);

create policy teams_insert_anon on teams
for insert to anon
with check (false);

create policy teams_update_anon on teams
for update to anon
using (false)
with check (false);

create policy teams_delete_anon on teams
for delete to anon
using (false);

create policy teams_select_authenticated on teams
for select to authenticated
using (can_access_team(id));

create policy teams_insert_authenticated on teams
for insert to authenticated
with check (auth.uid() is not null and created_by_user_id = auth.uid());

create policy teams_update_authenticated on teams
for update to authenticated
using (can_manage_team(id))
with check (can_manage_team(id));

create policy teams_delete_authenticated on teams
for delete to authenticated
using (can_manage_team(id));

-- team_memberships policies:
-- only captains can manage membership lifecycle.
create policy team_memberships_select_anon on team_memberships
for select to anon
using (false);

create policy team_memberships_insert_anon on team_memberships
for insert to anon
with check (false);

create policy team_memberships_update_anon on team_memberships
for update to anon
using (false)
with check (false);

create policy team_memberships_delete_anon on team_memberships
for delete to anon
using (false);

create policy team_memberships_select_authenticated on team_memberships
for select to authenticated
using (can_access_team(team_id));

create policy team_memberships_insert_authenticated on team_memberships
for insert to authenticated
with check (can_manage_team(team_id));

create policy team_memberships_update_authenticated on team_memberships
for update to authenticated
using (can_manage_team(team_id))
with check (can_manage_team(team_id));

create policy team_memberships_delete_authenticated on team_memberships
for delete to authenticated
using (can_manage_team(team_id));

-- tournaments policies:
create policy tournaments_select_anon on tournaments
for select to anon
using (false);

create policy tournaments_insert_anon on tournaments
for insert to anon
with check (false);

create policy tournaments_update_anon on tournaments
for update to anon
using (false)
with check (false);

create policy tournaments_delete_anon on tournaments
for delete to anon
using (false);

create policy tournaments_select_authenticated on tournaments
for select to authenticated
using (can_access_team(team_id));

create policy tournaments_insert_authenticated on tournaments
for insert to authenticated
with check (can_manage_team(team_id));

create policy tournaments_update_authenticated on tournaments
for update to authenticated
using (can_manage_tournament(id))
with check (can_manage_tournament(id));

create policy tournaments_delete_authenticated on tournaments
for delete to authenticated
using (can_manage_tournament(id));

-- tournament_rosters policies:
create policy tournament_rosters_select_anon on tournament_rosters
for select to anon
using (false);

create policy tournament_rosters_insert_anon on tournament_rosters
for insert to anon
with check (false);

create policy tournament_rosters_update_anon on tournament_rosters
for update to anon
using (false)
with check (false);

create policy tournament_rosters_delete_anon on tournament_rosters
for delete to anon
using (false);

create policy tournament_rosters_select_authenticated on tournament_rosters
for select to authenticated
using (can_access_tournament(tournament_id));

create policy tournament_rosters_insert_authenticated on tournament_rosters
for insert to authenticated
with check (can_manage_tournament(tournament_id));

create policy tournament_rosters_update_authenticated on tournament_rosters
for update to authenticated
using (can_manage_tournament(tournament_id))
with check (can_manage_tournament(tournament_id));

create policy tournament_rosters_delete_authenticated on tournament_rosters
for delete to authenticated
using (can_manage_tournament(tournament_id));

-- join_codes policies:
-- no delete policy is granted for authenticated by design; code revocation uses status updates.
create policy join_codes_select_anon on join_codes
for select to anon
using (false);

create policy join_codes_insert_anon on join_codes
for insert to anon
with check (false);

create policy join_codes_update_anon on join_codes
for update to anon
using (false)
with check (false);

create policy join_codes_delete_anon on join_codes
for delete to anon
using (false);

create policy join_codes_select_authenticated on join_codes
for select to authenticated
using (
  can_access_team(team_id)
  and is_team_captain(current_membership_id())
);

create policy join_codes_insert_authenticated on join_codes
for insert to authenticated
with check (
  can_manage_tournament(tournament_id)
  and can_manage_team(team_id)
);

create policy join_codes_update_authenticated on join_codes
for update to authenticated
using (
  can_manage_tournament(tournament_id)
  and can_manage_team(team_id)
)
with check (
  can_manage_tournament(tournament_id)
  and can_manage_team(team_id)
);

create policy join_codes_delete_authenticated on join_codes
for delete to authenticated
using (false);

-- table_assets policies:
-- this table has no team discriminator in the model, so read access is broad.
create policy table_assets_select_anon on table_assets
for select to anon
using (true);

create policy table_assets_insert_anon on table_assets
for insert to anon
with check (false);

create policy table_assets_update_anon on table_assets
for update to anon
using (false)
with check (false);

create policy table_assets_delete_anon on table_assets
for delete to anon
using (false);

create policy table_assets_select_authenticated on table_assets
for select to authenticated
using (true);

create policy table_assets_insert_authenticated on table_assets
for insert to authenticated
with check (is_team_captain(current_membership_id()));

create policy table_assets_update_authenticated on table_assets
for update to authenticated
using (is_team_captain(current_membership_id()))
with check (is_team_captain(current_membership_id()));

create policy table_assets_delete_authenticated on table_assets
for delete to authenticated
using (is_team_captain(current_membership_id()));

-- rounds policies:
create policy rounds_select_anon on rounds
for select to anon
using (false);

create policy rounds_insert_anon on rounds
for insert to anon
with check (false);

create policy rounds_update_anon on rounds
for update to anon
using (false)
with check (false);

create policy rounds_delete_anon on rounds
for delete to anon
using (false);

create policy rounds_select_authenticated on rounds
for select to authenticated
using (can_access_tournament(tournament_id));

create policy rounds_insert_authenticated on rounds
for insert to authenticated
with check (can_manage_tournament(tournament_id));

create policy rounds_update_authenticated on rounds
for update to authenticated
using (can_manage_round(id))
with check (can_manage_round(id));

create policy rounds_delete_authenticated on rounds
for delete to authenticated
using (can_manage_round(id));

-- opponent_players policies:
create policy opponent_players_select_anon on opponent_players
for select to anon
using (false);

create policy opponent_players_insert_anon on opponent_players
for insert to anon
with check (false);

create policy opponent_players_update_anon on opponent_players
for update to anon
using (false)
with check (false);

create policy opponent_players_delete_anon on opponent_players
for delete to anon
using (false);

create policy opponent_players_select_authenticated on opponent_players
for select to authenticated
using (can_access_round(round_id));

create policy opponent_players_insert_authenticated on opponent_players
for insert to authenticated
with check (can_manage_round(round_id));

create policy opponent_players_update_authenticated on opponent_players
for update to authenticated
using (can_manage_round(round_id))
with check (can_manage_round(round_id));

create policy opponent_players_delete_authenticated on opponent_players
for delete to authenticated
using (can_manage_round(round_id));

-- round_tables policies:
create policy round_tables_select_anon on round_tables
for select to anon
using (false);

create policy round_tables_insert_anon on round_tables
for insert to anon
with check (false);

create policy round_tables_update_anon on round_tables
for update to anon
using (false)
with check (false);

create policy round_tables_delete_anon on round_tables
for delete to anon
using (false);

create policy round_tables_select_authenticated on round_tables
for select to authenticated
using (can_access_round(round_id));

create policy round_tables_insert_authenticated on round_tables
for insert to authenticated
with check (can_manage_round(round_id));

create policy round_tables_update_authenticated on round_tables
for update to authenticated
using (can_manage_round(round_id))
with check (can_manage_round(round_id));

create policy round_tables_delete_authenticated on round_tables
for delete to authenticated
using (can_manage_round(round_id));

-- matchup_estimations policies:
-- captain sees full matrix; player sees own rows immediately and full matrix after own completion.
create policy matchup_estimations_select_anon on matchup_estimations
for select to anon
using (false);

create policy matchup_estimations_insert_anon on matchup_estimations
for insert to anon
with check (false);

create policy matchup_estimations_update_anon on matchup_estimations
for update to anon
using (false)
with check (false);

create policy matchup_estimations_delete_anon on matchup_estimations
for delete to anon
using (false);

create policy matchup_estimations_select_authenticated on matchup_estimations
for select to authenticated
using (
  can_access_round(round_id)
  and (
    is_current_captain_for_round(round_id)
    or player_membership_id = current_membership_id()
    or has_completed_round_estimations(round_id, current_membership_id())
  )
);

create policy matchup_estimations_insert_authenticated on matchup_estimations
for insert to authenticated
with check (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
);

create policy matchup_estimations_update_authenticated on matchup_estimations
for update to authenticated
using (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
)
with check (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
);

create policy matchup_estimations_delete_authenticated on matchup_estimations
for delete to authenticated
using (
  can_manage_round(round_id)
  and is_team_captain(current_membership_id())
);

-- table_preferences policies:
create policy table_preferences_select_anon on table_preferences
for select to anon
using (false);

create policy table_preferences_insert_anon on table_preferences
for insert to anon
with check (false);

create policy table_preferences_update_anon on table_preferences
for update to anon
using (false)
with check (false);

create policy table_preferences_delete_anon on table_preferences
for delete to anon
using (false);

create policy table_preferences_select_authenticated on table_preferences
for select to authenticated
using (
  can_access_round(round_id)
  and (
    is_current_captain_for_round(round_id)
    or player_membership_id = current_membership_id()
    or has_completed_round_estimations(round_id, current_membership_id())
  )
);

create policy table_preferences_insert_authenticated on table_preferences
for insert to authenticated
with check (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
);

create policy table_preferences_update_authenticated on table_preferences
for update to authenticated
using (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
)
with check (
  can_access_round(round_id)
  and is_round_editable(round_id)
  and is_current_membership_player()
  and player_membership_id = current_membership_id()
);

create policy table_preferences_delete_authenticated on table_preferences
for delete to authenticated
using (
  can_manage_round(round_id)
  and is_team_captain(current_membership_id())
);

-- pairing_runs policies:
create policy pairing_runs_select_anon on pairing_runs
for select to anon
using (false);

create policy pairing_runs_insert_anon on pairing_runs
for insert to anon
with check (false);

create policy pairing_runs_update_anon on pairing_runs
for update to anon
using (false)
with check (false);

create policy pairing_runs_delete_anon on pairing_runs
for delete to anon
using (false);

create policy pairing_runs_select_authenticated on pairing_runs
for select to authenticated
using (can_access_round(round_id));

create policy pairing_runs_insert_authenticated on pairing_runs
for insert to authenticated
with check (can_manage_round(round_id));

create policy pairing_runs_update_authenticated on pairing_runs
for update to authenticated
using (can_manage_round(round_id))
with check (can_manage_round(round_id));

create policy pairing_runs_delete_authenticated on pairing_runs
for delete to authenticated
using (can_manage_round(round_id));

-- pairing_steps policies:
create policy pairing_steps_select_anon on pairing_steps
for select to anon
using (false);

create policy pairing_steps_insert_anon on pairing_steps
for insert to anon
with check (false);

create policy pairing_steps_update_anon on pairing_steps
for update to anon
using (false)
with check (false);

create policy pairing_steps_delete_anon on pairing_steps
for delete to anon
using (false);

create policy pairing_steps_select_authenticated on pairing_steps
for select to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_access_round(pr.round_id)
  )
);

create policy pairing_steps_insert_authenticated on pairing_steps
for insert to authenticated
with check (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

create policy pairing_steps_update_authenticated on pairing_steps
for update to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
)
with check (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

create policy pairing_steps_delete_authenticated on pairing_steps
for delete to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

-- pairing_assignments policies:
create policy pairing_assignments_select_anon on pairing_assignments
for select to anon
using (false);

create policy pairing_assignments_insert_anon on pairing_assignments
for insert to anon
with check (false);

create policy pairing_assignments_update_anon on pairing_assignments
for update to anon
using (false)
with check (false);

create policy pairing_assignments_delete_anon on pairing_assignments
for delete to anon
using (false);

create policy pairing_assignments_select_authenticated on pairing_assignments
for select to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_access_round(pr.round_id)
  )
);

create policy pairing_assignments_insert_authenticated on pairing_assignments
for insert to authenticated
with check (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

create policy pairing_assignments_update_authenticated on pairing_assignments
for update to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
)
with check (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

create policy pairing_assignments_delete_authenticated on pairing_assignments
for delete to authenticated
using (
  exists (
    select 1
    from pairing_runs pr
    where pr.id = pairing_run_id
      and can_manage_round(pr.round_id)
  )
);

-- estimator_sessions policies:
create policy estimator_sessions_select_anon on estimator_sessions
for select to anon
using (false);

create policy estimator_sessions_insert_anon on estimator_sessions
for insert to anon
with check (false);

create policy estimator_sessions_update_anon on estimator_sessions
for update to anon
using (false)
with check (false);

create policy estimator_sessions_delete_anon on estimator_sessions
for delete to anon
using (false);

create policy estimator_sessions_select_authenticated on estimator_sessions
for select to authenticated
using (can_access_round(round_id));

create policy estimator_sessions_insert_authenticated on estimator_sessions
for insert to authenticated
with check (can_manage_round(round_id));

create policy estimator_sessions_update_authenticated on estimator_sessions
for update to authenticated
using (can_manage_round(round_id))
with check (can_manage_round(round_id));

create policy estimator_sessions_delete_authenticated on estimator_sessions
for delete to authenticated
using (can_manage_round(round_id));

-- estimator_events policies:
create policy estimator_events_select_anon on estimator_events
for select to anon
using (false);

create policy estimator_events_insert_anon on estimator_events
for insert to anon
with check (false);

create policy estimator_events_update_anon on estimator_events
for update to anon
using (false)
with check (false);

create policy estimator_events_delete_anon on estimator_events
for delete to anon
using (false);

create policy estimator_events_select_authenticated on estimator_events
for select to authenticated
using (
  exists (
    select 1
    from estimator_sessions es
    where es.id = session_id
      and can_access_round(es.round_id)
  )
);

create policy estimator_events_insert_authenticated on estimator_events
for insert to authenticated
with check (
  exists (
    select 1
    from estimator_sessions es
    where es.id = session_id
      and can_manage_round(es.round_id)
  )
);

create policy estimator_events_update_authenticated on estimator_events
for update to authenticated
using (
  exists (
    select 1
    from estimator_sessions es
    where es.id = session_id
      and can_manage_round(es.round_id)
  )
)
with check (
  exists (
    select 1
    from estimator_sessions es
    where es.id = session_id
      and can_manage_round(es.round_id)
  )
);

create policy estimator_events_delete_authenticated on estimator_events
for delete to authenticated
using (
  exists (
    select 1
    from estimator_sessions es
    where es.id = session_id
      and can_manage_round(es.round_id)
  )
);

-- offline_sync_snapshots policies:
create policy offline_sync_snapshots_select_anon on offline_sync_snapshots
for select to anon
using (false);

create policy offline_sync_snapshots_insert_anon on offline_sync_snapshots
for insert to anon
with check (false);

create policy offline_sync_snapshots_update_anon on offline_sync_snapshots
for update to anon
using (false)
with check (false);

create policy offline_sync_snapshots_delete_anon on offline_sync_snapshots
for delete to anon
using (false);

create policy offline_sync_snapshots_select_authenticated on offline_sync_snapshots
for select to authenticated
using (can_access_round(round_id));

create policy offline_sync_snapshots_insert_authenticated on offline_sync_snapshots
for insert to authenticated
with check (can_manage_round(round_id));

create policy offline_sync_snapshots_update_authenticated on offline_sync_snapshots
for update to authenticated
using (can_manage_round(round_id))
with check (can_manage_round(round_id));

create policy offline_sync_snapshots_delete_authenticated on offline_sync_snapshots
for delete to authenticated
using (can_manage_round(round_id));

-- import_runs policies:
-- update is intentionally denied for anon/authenticated because backend jobs should use service role.
create policy import_runs_select_anon on import_runs
for select to anon
using (false);

create policy import_runs_insert_anon on import_runs
for insert to anon
with check (false);

create policy import_runs_update_anon on import_runs
for update to anon
using (false)
with check (false);

create policy import_runs_delete_anon on import_runs
for delete to anon
using (false);

create policy import_runs_select_authenticated on import_runs
for select to authenticated
using (is_team_captain(current_membership_id()));

create policy import_runs_insert_authenticated on import_runs
for insert to authenticated
with check (
  is_team_captain(current_membership_id())
  and created_by_user_id = auth.uid()
);

create policy import_runs_update_authenticated on import_runs
for update to authenticated
using (false)
with check (false);

create policy import_runs_delete_authenticated on import_runs
for delete to authenticated
using (false);

-- audit_events policies:
-- this table is append-only from backend/triggers, read-only for team members.
create policy audit_events_select_anon on audit_events
for select to anon
using (false);

create policy audit_events_insert_anon on audit_events
for insert to anon
with check (false);

create policy audit_events_update_anon on audit_events
for update to anon
using (false)
with check (false);

create policy audit_events_delete_anon on audit_events
for delete to anon
using (false);

create policy audit_events_select_authenticated on audit_events
for select to authenticated
using (
  (team_id is not null and can_access_team(team_id))
  or (team_id is null and actor_user_id = auth.uid())
);

create policy audit_events_insert_authenticated on audit_events
for insert to authenticated
with check (false);

create policy audit_events_update_authenticated on audit_events
for update to authenticated
using (false)
with check (false);

create policy audit_events_delete_authenticated on audit_events
for delete to authenticated
using (false);
