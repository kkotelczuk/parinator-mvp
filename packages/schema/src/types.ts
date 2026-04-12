/**
 * DTO i modele poleceń (command) dla REST API `/api/v1`.
 * Typy wartości pól pochodzą z wierszy tabel (`Tables<>` w `./database.types.ts`);
 * nazwy w JSON są w camelCase zgodnie z planem API.
 */
import type { Enums, Json, Tables } from "./database.types";

// ---------------------------------------------------------------------------
// Aliasy encji (wiersze tabel)
// ---------------------------------------------------------------------------

type AuditEventRow = Tables<"audit_events">;
type EstimatorEventRow = Tables<"estimator_events">;
type EstimatorSessionRow = Tables<"estimator_sessions">;
type ImportRunRow = Tables<"import_runs">;
type JoinCodeRow = Tables<"join_codes">;
type MatchupEstimationRow = Tables<"matchup_estimations">;
type OfflineSyncSnapshotRow = Tables<"offline_sync_snapshots">;
type OpponentPlayerRow = Tables<"opponent_players">;
type PairingAssignmentRow = Tables<"pairing_assignments">;
type PairingRunRow = Tables<"pairing_runs">;
type PairingStepRow = Tables<"pairing_steps">;
type RoundTableRow = Tables<"round_tables">;
type RoundRow = Tables<"rounds">;
type TableAssetRow = Tables<"table_assets">;
type TablePreferenceRow = Tables<"table_preferences">;
type TeamMembershipRow = Tables<"team_memberships">;
type TeamRow = Tables<"teams">;
type TournamentRosterRow = Tables<"tournament_rosters">;
type TournamentRow = Tables<"tournaments">;
type UserRow = Tables<"users">;

// ---------------------------------------------------------------------------
// Wspólne (konwencje API)
// ---------------------------------------------------------------------------

/** Odpowiedź listy standardowej (`data` + `pagination`). */
export type PaginatedListDto<T> = {
  data: T[];
  pagination: PaginationDto;
};

export type PaginationDto = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Ciało błędu z planu API. */
export type ApiErrorDto = {
  error: {
    code: string;
    message: string;
    details: Record<string, Json | undefined>;
  };
};

export type EmptyJsonRequest = Record<string, never>;

export type DeletedSuccessDto = { deleted: true };

export type LogoutSuccessDto = { success: true };

// ---------------------------------------------------------------------------
// 2.1 Autoryzacja i kontekst sesji
// ---------------------------------------------------------------------------

/** PIN nie istnieje w schemacie jako kolumna jawna — tylko wejście API. */
export type PinLoginCommand = {
  email: UserRow["email"];
  pin: string;
};

/**
 * Rola domyślna w odpowiedzi logowania — ustalana w warstwie auth (np. pierwsza aktywna członkowska), nie jest kolumną `users`.
 */
export type AuthUserSummaryDto = {
  id: UserRow["id"];
  displayName: UserRow["display_name"];
  defaultRole: Enums<"app_role">;
};

export type AvailableMembershipDto = {
  membershipId: TeamMembershipRow["id"];
  teamId: TeamMembershipRow["team_id"];
  role: TeamMembershipRow["role"];
  isPlaying: TeamMembershipRow["is_playing"];
};

export type PinLoginResponseDto = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummaryDto;
  availableMemberships: AvailableMembershipDto[];
};

export type AuthContextCommand = {
  teamId: TeamRow["id"];
  membershipId: TeamMembershipRow["id"];
};

export type AuthContextResponseDto = {
  activeTeamId: TeamRow["id"];
  activeMembershipId: TeamMembershipRow["id"];
  role: TeamMembershipRow["role"];
};

// ---------------------------------------------------------------------------
// 2.2 Użytkownicy
// ---------------------------------------------------------------------------

/** `GET/PATCH /users/me` — bez `pin_hash`. */
export type UserMeDto = {
  id: UserRow["id"];
  email: UserRow["email"];
  displayName: UserRow["display_name"];
  isActive: UserRow["is_active"];
  createdAt: UserRow["created_at"];
  updatedAt: UserRow["updated_at"];
};

export type PatchUserMeCommand = {
  displayName: UserRow["display_name"];
};

// ---------------------------------------------------------------------------
// 2.3 Zespoły i członkostwa
// ---------------------------------------------------------------------------

export type TeamListItemDto = {
  id: TeamRow["id"];
  name: TeamRow["name"];
  createdAt: TeamRow["created_at"];
};

export type CreateTeamCommand = {
  name: TeamRow["name"];
};

export type TeamCreatedDto = {
  id: TeamRow["id"];
  name: TeamRow["name"];
  createdByUserId: TeamRow["created_by_user_id"];
  createdAt: TeamRow["created_at"];
};

export type MembershipDto = {
  id: TeamMembershipRow["id"];
  userId: TeamMembershipRow["user_id"];
  role: TeamMembershipRow["role"];
  isPlaying: TeamMembershipRow["is_playing"];
  joinedAt: TeamMembershipRow["joined_at"];
  leftAt: TeamMembershipRow["left_at"];
};

export type CreateMembershipCommand = {
  userId: TeamMembershipRow["user_id"];
  role: TeamMembershipRow["role"];
  isPlaying: TeamMembershipRow["is_playing"];
};

export type PatchMembershipCommand = {
  role: TeamMembershipRow["role"];
  isPlaying: TeamMembershipRow["is_playing"];
  leftAt: TeamMembershipRow["left_at"];
};

// ---------------------------------------------------------------------------
// 2.4 Turnieje i skład
// ---------------------------------------------------------------------------

export type TournamentSummaryDto = {
  id: TournamentRow["id"];
  name: TournamentRow["name"];
  status: TournamentRow["status"];
  teamSize: TournamentRow["team_size"];
  setupLockedAt: TournamentRow["setup_locked_at"];
};

export type CreateTournamentCommand = {
  name: TournamentRow["name"];
  teamId: TournamentRow["team_id"];
  teamSize: TournamentRow["team_size"];
  /** Ustawiane przy imporcie / URL; przy tworzeniu ręcznym często pomijane (`null` w DB). */
  sourceType?: TournamentRow["source_type"];
  sourceUrl?: TournamentRow["source_url"];
};

export type PatchTournamentCommand = Partial<{
  name: TournamentRow["name"];
  status: TournamentRow["status"];
}>;

/** Szczegóły turnieju + agregaty wyliczane poza pojedynczym wierszem. */
export type TournamentDetailDto = TournamentDto & {
  roundCount: number;
  activeRoundId: RoundRow["id"] | null;
};

/** Pełny turniej w camelCase (odpowiednik `TournamentRow`). */
export type TournamentDto = {
  id: TournamentRow["id"];
  name: TournamentRow["name"];
  status: TournamentRow["status"];
  teamId: TournamentRow["team_id"];
  teamSize: TournamentRow["team_size"];
  setupLockedAt: TournamentRow["setup_locked_at"];
  closedAt: TournamentRow["closed_at"];
  sourceType: TournamentRow["source_type"];
  sourceUrl: TournamentRow["source_url"];
  createdByMembershipId: TournamentRow["created_by_membership_id"];
  createdAt: TournamentRow["created_at"];
  updatedAt: TournamentRow["updated_at"];
};

export type LockSetupResponseDto = {
  id: TournamentRow["id"];
  setupLockedAt: NonNullable<TournamentRow["setup_locked_at"]>;
};

export type CloseTournamentCommand = {
  closedAt?: TournamentRow["closed_at"];
};

export type TournamentClosedResponseDto = {
  id: TournamentRow["id"];
  status: Extract<TournamentRow["status"], "closed">;
  closedAt: NonNullable<TournamentRow["closed_at"]>;
};

export type TournamentRosterRowDto = {
  id: TournamentRosterRow["id"];
  membershipId: TournamentRosterRow["membership_id"];
  slotNo: TournamentRosterRow["slot_no"];
  role: TournamentRosterRow["role"];
  isPlaying: TournamentRosterRow["is_playing"];
};

export type TournamentRosterMemberInput = {
  membershipId: TournamentRosterRow["membership_id"];
  slotNo: TournamentRosterRow["slot_no"];
  role: TournamentRosterRow["role"];
  isPlaying: TournamentRosterRow["is_playing"];
};

export type PutTournamentRosterCommand = {
  members: TournamentRosterMemberInput[];
};

export type PutTournamentRosterResponseDto = {
  data: TournamentRosterRowDto[];
};

// ---------------------------------------------------------------------------
// 2.5 Kody dołączenia
// ---------------------------------------------------------------------------

/** Aktywny kod (GET / join-code po wygenerowaniu) — podzbiór pól `join_codes`. */
export type JoinCodeActiveDto = {
  id: JoinCodeRow["id"];
  code: JoinCodeRow["code"];
  status: JoinCodeRow["status"];
  remainingUses: JoinCodeRow["remaining_uses"];
  expiresAt: JoinCodeRow["expires_at"];
};

export type GenerateJoinCodeCommand = {
  /** Minuty TTL — mapowane na `expires_at` przy tworzeniu rekordu. */
  ttlMinutes: number;
};

export type JoinCodeRedeemCommand = {
  code: JoinCodeRow["code"];
};

export type JoinCodeRedeemResponseDto = {
  joined: true;
  membershipId: TeamMembershipRow["id"];
  teamId: TeamRow["id"];
  tournamentId: TournamentRow["id"];
};

export type JoinCodeRevokeResponseDto = {
  revoked: true;
};

// ---------------------------------------------------------------------------
// 2.6 Rundy
// ---------------------------------------------------------------------------

export type RoundSummaryDto = {
  id: RoundRow["id"];
  roundNumber: RoundRow["round_number"];
  displayName: RoundRow["display_name"];
  status: RoundRow["status"];
  isActive: RoundRow["is_active"];
  sortOrder: RoundRow["sort_order"];
};

export type RoundDto = {
  id: RoundRow["id"];
  tournamentId: RoundRow["tournament_id"];
  roundNumber: RoundRow["round_number"];
  displayName: RoundRow["display_name"];
  mission: RoundRow["mission"];
  deployment: RoundRow["deployment"];
  opponentTeamName: RoundRow["opponent_team_name"];
  isActive: RoundRow["is_active"];
  sortOrder: RoundRow["sort_order"];
  status: RoundRow["status"];
  lockedAt: RoundRow["locked_at"];
  lockedByMembershipId: RoundRow["locked_by_membership_id"];
  createdAt: RoundRow["created_at"];
  updatedAt: RoundRow["updated_at"];
};

export type CreateRoundCommand = {
  roundNumber: RoundRow["round_number"];
  displayName: RoundRow["display_name"];
  mission: RoundRow["mission"];
  deployment: RoundRow["deployment"];
  opponentTeamName: RoundRow["opponent_team_name"];
  isActive: RoundRow["is_active"];
  sortOrder: RoundRow["sort_order"];
};

export type PatchRoundCommand = Partial<{
  displayName: RoundRow["display_name"];
  mission: RoundRow["mission"];
  deployment: RoundRow["deployment"];
  opponentTeamName: RoundRow["opponent_team_name"];
  isActive: RoundRow["is_active"];
  sortOrder: RoundRow["sort_order"];
}>;

export type ActivateRoundResponseDto = {
  roundId: RoundRow["id"];
  isActive: RoundRow["is_active"];
};

export type ReorderRoundCommand = {
  sortOrder: RoundRow["sort_order"];
};

export type ReorderRoundResponseDto = {
  roundId: RoundRow["id"];
  sortOrder: RoundRow["sort_order"];
};

export type LockRoundResponseDto = {
  id: RoundRow["id"];
  status: Extract<RoundRow["status"], "locked">;
  lockedAt: NonNullable<RoundRow["locked_at"]>;
  lockedByMembershipId: NonNullable<RoundRow["locked_by_membership_id"]>;
};

// ---------------------------------------------------------------------------
// 2.7 Przeciwnicy i stoły w rundzie
// ---------------------------------------------------------------------------

export type OpponentPlayerDto = {
  id: OpponentPlayerRow["id"];
  name: OpponentPlayerRow["name"];
  faction: OpponentPlayerRow["faction"];
  listText: OpponentPlayerRow["list_text"];
  externalRef: OpponentPlayerRow["external_ref"];
  listOpenedRequired: OpponentPlayerRow["list_opened_required"];
};

export type CreateOpponentCommand = {
  name: OpponentPlayerRow["name"];
  faction: OpponentPlayerRow["faction"];
  listText: OpponentPlayerRow["list_text"];
  externalRef: OpponentPlayerRow["external_ref"];
  listOpenedRequired: OpponentPlayerRow["list_opened_required"];
};

export type PatchOpponentCommand = Partial<{
  faction: OpponentPlayerRow["faction"];
  listText: OpponentPlayerRow["list_text"];
}>;

export type RoundTableDto = {
  id: RoundTableRow["id"];
  tableNo: RoundTableRow["table_no"];
  tableName: RoundTableRow["table_name"];
  imageAssetId: RoundTableRow["image_asset_id"];
};

export type RoundTableInput = {
  tableNo: RoundTableRow["table_no"];
  tableName: RoundTableRow["table_name"];
  imageAssetId: RoundTableRow["image_asset_id"];
};

export type PutRoundTablesCommand = {
  tables: RoundTableInput[];
};

export type PutRoundTablesResponseDto = {
  data: RoundTableDto[];
};

// ---------------------------------------------------------------------------
// 2.8 Assety stołów
// ---------------------------------------------------------------------------

export type TableAssetDto = {
  id: TableAssetRow["id"];
  label: TableAssetRow["label"];
  imageUrl: TableAssetRow["image_url"];
  sourceUrl: TableAssetRow["source_url"];
  sourceAttribution: TableAssetRow["source_attribution"];
  createdAt: TableAssetRow["created_at"];
};

export type CreateTableAssetCommand = {
  label: TableAssetRow["label"];
  imageUrl: TableAssetRow["image_url"];
  sourceUrl: TableAssetRow["source_url"];
  sourceAttribution: TableAssetRow["source_attribution"];
};

export type PatchTableAssetCommand = Partial<{
  label: TableAssetRow["label"];
}>;

// ---------------------------------------------------------------------------
// 2.9 Szacunki i preferencje stołów
// ---------------------------------------------------------------------------

export type MatchupEstimationDto = {
  id: MatchupEstimationRow["id"];
  playerMembershipId: MatchupEstimationRow["player_membership_id"];
  opponentPlayerId: MatchupEstimationRow["opponent_player_id"];
  listOpenedAt: MatchupEstimationRow["list_opened_at"];
  hasFirstTurnImpact: MatchupEstimationRow["has_first_turn_impact"];
  scoreSingle: MatchupEstimationRow["score_single"];
  scoreGoFirst: MatchupEstimationRow["score_go_first"];
  scoreGoSecond: MatchupEstimationRow["score_go_second"];
  comment: MatchupEstimationRow["comment"];
};

export type UpsertMatchupEstimationCommand = {
  listOpenedAt: MatchupEstimationRow["list_opened_at"];
  hasFirstTurnImpact: MatchupEstimationRow["has_first_turn_impact"];
  scoreSingle: MatchupEstimationRow["score_single"];
  scoreGoFirst: MatchupEstimationRow["score_go_first"];
  scoreGoSecond: MatchupEstimationRow["score_go_second"];
  comment: MatchupEstimationRow["comment"];
};

export type TablePreferenceDto = {
  id: TablePreferenceRow["id"];
  playerMembershipId: TablePreferenceRow["player_membership_id"];
  roundTableId: TablePreferenceRow["round_table_id"];
  preference: TablePreferenceRow["preference"];
};

export type UpsertTablePreferenceCommand = {
  preference: TablePreferenceRow["preference"];
};

export type DeleteTablePreferenceResponseDto = {
  deleted: true;
  interpretedAs: "neutral";
};

export type PlayerEstimationStatusDto = {
  completed: boolean;
  opponentCount: number;
  myEstimationsCount: number;
};

// ---------------------------------------------------------------------------
// 2.10 Macierz (odczyt zagregowany)
// ---------------------------------------------------------------------------

export type TablePreferenceSummaryDto = {
  preferred: number;
  notPreferred: number;
};

export type MatrixCellDto = {
  playerMembershipId: TeamMembershipRow["id"];
  opponentPlayerId: OpponentPlayerRow["id"];
  estimation: MatchupEstimationDto | null;
  tablePreferenceSummary: TablePreferenceSummaryDto | null;
  comment: MatchupEstimationRow["comment"];
};

export type RoundMatrixDto = {
  /** Oś wierszy — struktura zależna od handlera (np. etykiety graczy); trzymane jako `Json` do czasu utrwalenia kontraktu. */
  rows: Json;
  /** Oś kolumn — analogicznie. */
  columns: Json;
  cells: MatrixCellDto[];
};

export type MatrixCellDetailDto = {
  playerMembershipId: TeamMembershipRow["id"];
  opponentPlayerId: OpponentPlayerRow["id"];
  estimation: MatchupEstimationDto | null;
  tablePreferences: TablePreferenceDto[];
  comment: MatchupEstimationRow["comment"];
};

// ---------------------------------------------------------------------------
// 2.11 Parowanie (symulator / live)
// ---------------------------------------------------------------------------

export type PairingRunDto = {
  id: PairingRunRow["id"];
  mode: PairingRunRow["mode"];
  name: PairingRunRow["name"];
  simulationRating: PairingRunRow["simulation_rating"];
  isFinal: PairingRunRow["is_final"];
  finalizedAt: PairingRunRow["finalized_at"];
  roundId: PairingRunRow["round_id"];
  createdByMembershipId: PairingRunRow["created_by_membership_id"];
  sortOrder: PairingRunRow["sort_order"];
  createdAt: PairingRunRow["created_at"];
  updatedAt: PairingRunRow["updated_at"];
};

export type PairingRunSummaryDto = {
  id: PairingRunRow["id"];
  mode: PairingRunRow["mode"];
  name: PairingRunRow["name"];
  simulationRating: PairingRunRow["simulation_rating"];
  isFinal: PairingRunRow["is_final"];
  finalizedAt: PairingRunRow["finalized_at"];
};

export type CreatePairingRunCommand = {
  mode: PairingRunRow["mode"];
  name: PairingRunRow["name"];
  simulationRating: PairingRunRow["simulation_rating"];
  sortOrder: PairingRunRow["sort_order"];
};

export type PatchPairingRunCommand = Partial<{
  name: PairingRunRow["name"];
  simulationRating: PairingRunRow["simulation_rating"];
  sortOrder: PairingRunRow["sort_order"];
}>;

export type PairingRunFinalizeResponseDto = {
  id: PairingRunRow["id"];
  mode: Extract<PairingRunRow["mode"], "live">;
  isFinal: true;
  finalizedAt: NonNullable<PairingRunRow["finalized_at"]>;
};

export type PairingStepDto = {
  id: PairingStepRow["id"];
  stepNo: PairingStepRow["step_no"];
  phaseKey: PairingStepRow["phase_key"];
  payload: PairingStepRow["payload"];
};

export type PairingStepInput = {
  stepNo: PairingStepRow["step_no"];
  phaseKey: PairingStepRow["phase_key"];
  payload: PairingStepRow["payload"];
};

export type PutPairingStepsCommand = {
  steps: PairingStepInput[];
};

export type PutPairingStepsResponseDto = {
  data: PairingStepDto[];
};

export type PairingAssignmentDto = {
  id: PairingAssignmentRow["id"];
  playerMembershipId: PairingAssignmentRow["player_membership_id"];
  opponentPlayerId: PairingAssignmentRow["opponent_player_id"];
  roundTableId: PairingAssignmentRow["round_table_id"];
  estimationId: PairingAssignmentRow["estimation_id"];
  gameResult: PairingAssignmentRow["game_result"];
};

export type PairingAssignmentInput = {
  playerMembershipId: PairingAssignmentRow["player_membership_id"];
  opponentPlayerId: PairingAssignmentRow["opponent_player_id"];
  roundTableId: PairingAssignmentRow["round_table_id"];
  estimationId: PairingAssignmentRow["estimation_id"];
};

export type PutPairingAssignmentsCommand = {
  assignments: PairingAssignmentInput[];
};

export type PutPairingAssignmentsResponseDto = {
  data: PairingAssignmentDto[];
};

export type PatchPairingAssignmentResultCommand = {
  gameResult: NonNullable<PairingAssignmentRow["game_result"]>;
};

export type FinalPairingEntryDto = {
  playerMembershipId: PairingAssignmentRow["player_membership_id"];
  opponentPlayerId: PairingAssignmentRow["opponent_player_id"];
  estimation: MatchupEstimationDto | null;
  table: RoundTableDto | null;
  comment: MatchupEstimationRow["comment"];
  gameResult: PairingAssignmentRow["game_result"];
};

export type FinalPairingsResponseDto = {
  roundId: RoundRow["id"];
  pairings: FinalPairingEntryDto[];
};

// ---------------------------------------------------------------------------
// 2.12 Estimator
// ---------------------------------------------------------------------------

export type EstimatorSessionDto = {
  id: EstimatorSessionRow["id"];
  roundId: EstimatorSessionRow["round_id"];
  createdByMembershipId: EstimatorSessionRow["created_by_membership_id"];
  createdAt: EstimatorSessionRow["created_at"];
};

export type CreateEstimatorSessionResponseDto = EstimatorSessionDto;

export type EstimatorEventDto = {
  id: EstimatorEventRow["id"];
  actorMembershipId: EstimatorEventRow["actor_membership_id"];
  tileLabel: EstimatorEventRow["tile_label"];
  tileValue: EstimatorEventRow["tile_value"];
  eventOrder: EstimatorEventRow["event_order"];
  clickedAt: EstimatorEventRow["clicked_at"];
};

export type AppendEstimatorEventCommand = {
  actorMembershipId: EstimatorEventRow["actor_membership_id"];
  tileLabel: EstimatorEventRow["tile_label"];
  tileValue: EstimatorEventRow["tile_value"];
  eventOrder: EstimatorEventRow["event_order"];
  /** Opcjonalne nadpisanie czasu zdarzenia (domyślnie `now()` po stronie serwera). */
  clickedAt?: EstimatorEventRow["clicked_at"];
};

// ---------------------------------------------------------------------------
// 2.13 Offline sync
// ---------------------------------------------------------------------------

export type OfflineSyncSnapshotDto = {
  id: OfflineSyncSnapshotRow["id"];
  captainMembershipId: OfflineSyncSnapshotRow["captain_membership_id"];
  clientSnapshotId: OfflineSyncSnapshotRow["client_snapshot_id"];
  roundId: OfflineSyncSnapshotRow["round_id"];
  payload: OfflineSyncSnapshotRow["payload"];
  syncedAt: OfflineSyncSnapshotRow["synced_at"];
};

export type OfflineSyncPushCommand = {
  clientSnapshotId: OfflineSyncSnapshotRow["client_snapshot_id"];
  /** Treść zgodna z `offline_sync_snapshots.payload` (Json). */
  payload: OfflineSyncSnapshotRow["payload"];
};

export type OfflineSyncPushResponseDto = {
  applied: true;
  snapshotId: OfflineSyncSnapshotRow["id"];
  conflictResolution: "local_wins";
};

// ---------------------------------------------------------------------------
// 2.14 Import
// ---------------------------------------------------------------------------

export type ImportTournamentCommand = {
  sourceType: ImportRunRow["source_type"];
  sourceUrl: ImportRunRow["source_url"];
  teamId: TeamRow["id"];
};

export type ImportTournamentAcceptedResponseDto = {
  importRunId: ImportRunRow["id"];
  status: ImportRunRow["status"];
  usedCache: boolean;
  tournamentId: TournamentRow["id"];
};

export type ImportTournamentFallbackCommand = {
  teamId: TeamRow["id"];
  sourceUrl?: ImportRunRow["source_url"];
  /** Tekst wklejany — mapowany do `import_runs` (np. `raw_payload`) po stronie serwera. */
  rawText: string;
};

export type ImportTournamentFallbackResponseDto = {
  importRunId: ImportRunRow["id"];
  status: ImportRunRow["status"];
  tournamentId: TournamentRow["id"];
  warnings: string[];
};

export type ImportRunListItemDto = {
  id: ImportRunRow["id"];
  sourceType: ImportRunRow["source_type"];
  sourceUrl: ImportRunRow["source_url"];
  status: ImportRunRow["status"];
  createdAt: ImportRunRow["created_at"];
};

export type ImportRunDetailDto = {
  id: ImportRunRow["id"];
  sourceType: ImportRunRow["source_type"];
  sourceUrl: ImportRunRow["source_url"];
  sourceHash: ImportRunRow["source_hash"];
  status: ImportRunRow["status"];
  createdByUserId: ImportRunRow["created_by_user_id"];
  errorMessage: ImportRunRow["error_message"];
  normalizedPayload: ImportRunRow["normalized_payload"];
  rawPayload: ImportRunRow["raw_payload"];
  createdAt: ImportRunRow["created_at"];
};

// ---------------------------------------------------------------------------
// 2.15 Audyt
// ---------------------------------------------------------------------------

export type AuditEventDto = {
  id: AuditEventRow["id"];
  eventType: AuditEventRow["event_type"];
  teamId: AuditEventRow["team_id"];
  tournamentId: AuditEventRow["tournament_id"];
  roundId: AuditEventRow["round_id"];
  metadata: AuditEventRow["metadata"];
  createdAt: AuditEventRow["created_at"];
};

// ---------------------------------------------------------------------------
// 2.16 Operacje biznesowe (runda)
// ---------------------------------------------------------------------------

export type HardResetCommand = {
  reason: string;
};

export type HardResetDeletedCountsDto = {
  pairingRuns: number;
  estimations: number;
  preferences: number;
  offlineSnapshots: number;
  opponents: number;
};

export type HardResetResponseDto = {
  reset: true;
  deleted: HardResetDeletedCountsDto;
};

export type OpponentTeamUpdateCommand = {
  opponentTeamName: NonNullable<RoundRow["opponent_team_name"]>;
};

export type OpponentTeamUpdateResponseDto = {
  id: RoundRow["id"];
  opponentTeamName: RoundRow["opponent_team_name"];
  hardResetTriggered: boolean;
};
