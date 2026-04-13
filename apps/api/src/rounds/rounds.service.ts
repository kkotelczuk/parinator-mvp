import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ActivateRoundResponseDto,
  AppendEstimatorEventCommand,
  CreatePairingRunCommand,
  CreateEstimatorSessionResponseDto,
  CreateRoundCommand,
  Database,
  DeleteTablePreferenceResponseDto,
  DeletedSuccessDto,
  EstimatorEventDto,
  EstimatorSessionDto,
  FinalPairingsResponseDto,
  LockRoundResponseDto,
  MatrixCellDetailDto,
  MatrixCellDto,
  MatchupEstimationDto,
  OfflineSyncPushCommand,
  OfflineSyncPushResponseDto,
  OfflineSyncSnapshotDto,
  OpponentPlayerDto,
  PaginatedListDto,
  PairingAssignmentDto,
  PairingRunDto,
  PairingRunFinalizeResponseDto,
  PairingRunSummaryDto,
  PairingStepDto,
  PatchPairingAssignmentResultCommand,
  PatchPairingRunCommand,
  PatchRoundCommand,
  PatchOpponentCommand,
  PlayerEstimationStatusDto,
  PutPairingAssignmentsCommand,
  PutPairingAssignmentsResponseDto,
  PutPairingStepsCommand,
  PutPairingStepsResponseDto,
  PutRoundTablesCommand,
  PutRoundTablesResponseDto,
  ReorderRoundResponseDto,
  RoundTableDto,
  RoundDto,
  RoundMatrixDto,
  RoundSummaryDto,
  TablePreferenceDto,
  UpsertMatchupEstimationCommand,
  UpsertTablePreferenceCommand,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type RoundRow = Database['public']['Tables']['rounds']['Row'];
type OpponentPlayerRow = Database['public']['Tables']['opponent_players']['Row'];
type RoundTableRow = Database['public']['Tables']['round_tables']['Row'];
type TournamentRow = Database['public']['Tables']['tournaments']['Row'];
type MatchupEstimationRow = Database['public']['Tables']['matchup_estimations']['Row'];
type TablePreferenceRow = Database['public']['Tables']['table_preferences']['Row'];
type TeamMembershipRow = Database['public']['Tables']['team_memberships']['Row'];
type PairingRunRow = Database['public']['Tables']['pairing_runs']['Row'];
type PairingStepRow = Database['public']['Tables']['pairing_steps']['Row'];
type PairingAssignmentRow = Database['public']['Tables']['pairing_assignments']['Row'];
type EstimatorSessionRow = Database['public']['Tables']['estimator_sessions']['Row'];
type EstimatorEventRow = Database['public']['Tables']['estimator_events']['Row'];
type OfflineSyncSnapshotRow = Database['public']['Tables']['offline_sync_snapshots']['Row'];

type RoundsListParams = {
  actorUserId: string;
  tournamentId: string;
  page: number;
  pageSize: number;
  sort: 'roundNumber' | '-roundNumber' | 'sortOrder' | '-sortOrder' | 'createdAt' | '-createdAt';
  status?: 'editable' | 'locked';
  isActive?: boolean;
};

type CreateRoundParams = {
  actorUserId: string;
  tournamentId: string;
  command: CreateRoundCommand;
};

type PatchRoundParams = {
  actorUserId: string;
  roundId: string;
  command: PatchRoundCommand;
};

type OpponentsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'name' | '-name' | 'createdAt' | '-createdAt';
  name?: string;
};

type CreateOpponentParams = {
  actorUserId: string;
  roundId: string;
  command: CreateRoundOpponentCommand;
};

type PatchOpponentParams = {
  actorUserId: string;
  roundId: string;
  opponentId: string;
  command: PatchOpponentCommand;
};

type DeleteOpponentParams = {
  actorUserId: string;
  roundId: string;
  opponentId: string;
};

type TablesListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'tableNo' | '-tableNo' | 'createdAt' | '-createdAt';
  tableNo?: number;
};

type ReplaceTablesParams = {
  actorUserId: string;
  roundId: string;
  command: PutRoundTablesCommand;
};

type EstimationsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt';
  playerMembershipId?: string;
  opponentPlayerId?: string;
};

type UpsertEstimationParams = {
  actorUserId: string;
  roundId: string;
  opponentPlayerId: string;
  command: UpsertMatchupEstimationCommand;
};

type DeleteEstimationParams = {
  actorUserId: string;
  roundId: string;
  estimationId: string;
};

type TablePreferencesListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt';
  playerMembershipId?: string;
  roundTableId?: string;
};

type UpsertTablePreferenceParams = {
  actorUserId: string;
  roundId: string;
  roundTableId: string;
  command: UpsertTablePreferenceCommand;
};

type DeleteTablePreferenceParams = {
  actorUserId: string;
  roundId: string;
  roundTableId: string;
};

type RoundMatrixParams = {
  actorUserId: string;
  roundId: string;
  view: 'captain' | 'player';
};

type RoundMatrixCellsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'playerMembershipId' | '-playerMembershipId' | 'opponentPlayerId' | '-opponentPlayerId';
  playerMembershipId?: string;
  opponentPlayerId?: string;
};

type RoundMatrixCellParams = {
  actorUserId: string;
  roundId: string;
  playerMembershipId: string;
  opponentPlayerId: string;
};

type PairingRunsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt' | 'sortOrder' | '-sortOrder' | 'finalizedAt' | '-finalizedAt';
  mode?: 'simulation' | 'live';
  isFinal?: boolean;
  simulationRating?: 'better' | 'worse' | 'neutral';
};

type CreatePairingRunParams = {
  actorUserId: string;
  roundId: string;
  command: CreatePairingRunCommand;
};

type PatchPairingRunParams = {
  actorUserId: string;
  pairingRunId: string;
  command: PatchPairingRunCommand;
};

type FinalizePairingRunParams = {
  actorUserId: string;
  pairingRunId: string;
};

type DeletePairingRunParams = {
  actorUserId: string;
  pairingRunId: string;
};

type PairingStepsListParams = {
  actorUserId: string;
  pairingRunId: string;
  page: number;
  pageSize: number;
  sort: 'stepNo' | '-stepNo' | 'createdAt' | '-createdAt';
};

type PutPairingStepsParams = {
  actorUserId: string;
  pairingRunId: string;
  command: PutPairingStepsCommand;
};

type PairingAssignmentsListParams = {
  actorUserId: string;
  pairingRunId: string;
  page: number;
  pageSize: number;
  sort: 'playerMembershipId' | '-playerMembershipId' | 'opponentPlayerId' | '-opponentPlayerId' | 'createdAt' | '-createdAt';
  playerMembershipId?: string;
  opponentPlayerId?: string;
};

type PutPairingAssignmentsParams = {
  actorUserId: string;
  pairingRunId: string;
  command: PutPairingAssignmentsCommand;
};

type PatchPairingAssignmentResultParams = {
  actorUserId: string;
  assignmentId: string;
  command: PatchPairingAssignmentResultCommand;
};

type EstimatorSessionsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt';
};

type CreateEstimatorSessionParams = {
  actorUserId: string;
  roundId: string;
};

type EstimatorEventsListParams = {
  actorUserId: string;
  sessionId: string;
  page: number;
  pageSize: number;
  sort: 'eventOrder' | '-eventOrder' | 'clickedAt' | '-clickedAt';
};

type AppendEstimatorEventParams = {
  actorUserId: string;
  sessionId: string;
  command: AppendEstimatorEventCommand;
};

type PushOfflineSyncParams = {
  actorUserId: string;
  roundId: string;
  command: OfflineSyncPushCommand;
};

type OfflineSyncSnapshotsListParams = {
  actorUserId: string;
  roundId: string;
  page: number;
  pageSize: number;
  sort: 'syncedAt' | '-syncedAt';
};

type CreateRoundOpponentCommand = {
  name: string;
  faction: string | null;
  listText: string | null;
  externalRef: string | null;
  listOpenedRequired: boolean;
};

@Injectable()
export class RoundsService {
  private readonly logger = new Logger(RoundsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** List rounds for a tournament with pagination and filters. */
  async listRounds(params: RoundsListParams): Promise<PaginatedListDto<RoundSummaryDto>> {
    const tournament = await this.fetchTournamentWithAccess(params.actorUserId, params.tournamentId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveRoundsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('rounds')
      .select('id, round_number, display_name, status, is_active, sort_order', { count: 'exact' })
      .eq('tournament_id', tournament.id);
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list rounds', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapRoundToSummary(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Create a new round in a tournament. */
  async createRound(params: CreateRoundParams): Promise<RoundDto> {
    const tournament = await this.fetchTournamentWithCaptainAccess(params.actorUserId, params.tournamentId);
    this.ensureTournamentActive(tournament);
    await this.ensureRoundLimitNotReached(tournament.id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .insert({
        tournament_id: tournament.id,
        round_number: params.command.roundNumber,
        display_name: params.command.displayName,
        mission: params.command.mission,
        deployment: params.command.deployment,
        opponent_team_name: params.command.opponentTeamName ?? null,
        is_active: params.command.isActive,
        sort_order: params.command.sortOrder,
      })
      .select('*')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        const conflictCode = this.resolveRoundInsertConflict(error);
        throw new ConflictException({
          error: { code: conflictCode.code, message: conflictCode.message, details: {} },
        });
      }
      if (this.isCheckViolation(error)) {
        throw this.createValidationException('Round data does not satisfy constraints.');
      }
      this.logger.error('Failed to create round', error);
      throw this.createInternalErrorException();
    }
    return this.mapRoundRow(data);
  }

  /** Get round details by ID. */
  async getRound(actorUserId: string, roundId: string): Promise<RoundDto> {
    const round = await this.fetchRoundWithAccess(actorUserId, roundId);
    return this.mapRoundRow(round);
  }

  /** Update round fields while editable. */
  async patchRound(params: PatchRoundParams): Promise<RoundDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    this.ensureTournamentActive(tournament);
    this.ensureRoundEditable(round);
    const updatePayload: Database['public']['Tables']['rounds']['Update'] = {};
    if (params.command.displayName !== undefined) {
      updatePayload.display_name = params.command.displayName;
    }
    if (params.command.mission !== undefined) {
      updatePayload.mission = params.command.mission;
    }
    if (params.command.deployment !== undefined) {
      updatePayload.deployment = params.command.deployment;
    }
    if (params.command.opponentTeamName !== undefined) {
      updatePayload.opponent_team_name = params.command.opponentTeamName;
    }
    if (params.command.isActive !== undefined) {
      updatePayload.is_active = params.command.isActive;
    }
    if (params.command.sortOrder !== undefined) {
      updatePayload.sort_order = params.command.sortOrder;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .update(updatePayload)
      .eq('id', round.id)
      .select('*')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        const conflictCode = this.resolveRoundInsertConflict(error);
        throw new ConflictException({
          error: { code: conflictCode.code, message: conflictCode.message, details: {} },
        });
      }
      if (this.isCheckViolation(error)) {
        throw this.createValidationException('Round data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch round', error);
      throw this.createInternalErrorException();
    }
    return this.mapRoundRow(data);
  }

  /** Activate a round, deactivating any other active round in the same tournament. */
  async activateRound(actorUserId: string, roundId: string): Promise<ActivateRoundResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(actorUserId, roundId);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    this.ensureTournamentActive(tournament);
    this.ensureRoundEditable(round);
    await this.supabaseService
      .getClient()
      .from('rounds')
      .update({ is_active: false })
      .eq('tournament_id', round.tournament_id)
      .eq('is_active', true)
      .neq('id', round.id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .update({ is_active: true })
      .eq('id', round.id)
      .select('id, is_active')
      .single();
    if (error || !data) {
      this.logger.error('Failed to activate round', error);
      throw this.createInternalErrorException();
    }
    return { roundId: data.id, isActive: data.is_active };
  }

  /** Update sortOrder for a round (drag-and-drop reorder). */
  async reorderRound(actorUserId: string, roundId: string, sortOrder: number): Promise<ReorderRoundResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(actorUserId, roundId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .update({ sort_order: sortOrder })
      .eq('id', round.id)
      .select('id, sort_order')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: { code: 'DUPLICATE_SORT_ORDER', message: 'Sort order already exists in this tournament.', details: {} },
        });
      }
      this.logger.error('Failed to reorder round', error);
      throw this.createInternalErrorException();
    }
    return { roundId: data.id, sortOrder: data.sort_order };
  }

  /** Lock a round, making it read-only. */
  async lockRound(actorUserId: string, roundId: string): Promise<LockRoundResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(actorUserId, roundId);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    this.ensureTournamentActive(tournament);
    if (round.status === 'locked') {
      throw new ConflictException({
        error: { code: 'ROUND_ALREADY_LOCKED', message: 'Round is already locked.', details: {} },
      });
    }
    const membershipId = await this.resolveCaptainMembership(actorUserId, tournament.team_id);
    const now = new Date().toISOString();
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .update({
        status: 'locked' as const,
        locked_at: now,
        locked_by_membership_id: membershipId,
      })
      .eq('id', round.id)
      .select('id, status, locked_at, locked_by_membership_id')
      .single();
    if (error || !data) {
      this.logger.error('Failed to lock round', error);
      throw this.createInternalErrorException();
    }
    await this.insertAuditEvent({
      teamId: tournament.team_id,
      tournamentId: tournament.id,
      roundId: round.id,
      actorUserId,
      eventType: 'round_locked',
    });
    return {
      id: data.id,
      status: data.status as 'locked',
      lockedAt: data.locked_at!,
      lockedByMembershipId: data.locked_by_membership_id!,
    };
  }

  /** List opponents for a round with pagination and optional name filter. */
  async listOpponents(params: OpponentsListParams): Promise<PaginatedListDto<OpponentPlayerDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveOpponentsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('opponent_players')
      .select('id, name, faction, list_text, external_ref, list_opened_required, created_at', { count: 'exact' })
      .eq('round_id', round.id);
    if (params.name) {
      query = query.ilike('name', `%${params.name}%`);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list opponents', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapOpponentRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Create opponent player in round (captain only). */
  async createOpponent(params: CreateOpponentParams): Promise<OpponentPlayerDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .insert({
        round_id: round.id,
        name: params.command.name,
        faction: params.command.faction,
        list_text: params.command.listText,
        external_ref: params.command.externalRef,
        list_opened_required: params.command.listOpenedRequired,
      })
      .select('id, name, faction, list_text, external_ref, list_opened_required')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: { code: 'DUPLICATE_OPPONENT_NAME', message: 'Opponent name already exists in this round.', details: {} },
        });
      }
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Opponent data does not satisfy constraints.');
      }
      this.logger.error('Failed to create opponent', error);
      throw this.createInternalErrorException();
    }
    return this.mapOpponentRow(data);
  }

  /** Update opponent metadata (captain only). */
  async patchOpponent(params: PatchOpponentParams): Promise<OpponentPlayerDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    await this.fetchOpponentOrFail(params.roundId, params.opponentId);
    const updatePayload: Database['public']['Tables']['opponent_players']['Update'] = {};
    if (params.command.faction !== undefined) {
      updatePayload.faction = params.command.faction;
    }
    if (params.command.listText !== undefined) {
      updatePayload.list_text = params.command.listText;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .update(updatePayload)
      .eq('id', params.opponentId)
      .eq('round_id', params.roundId)
      .select('id, name, faction, list_text, external_ref, list_opened_required')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: { code: 'DUPLICATE_OPPONENT_NAME', message: 'Opponent name already exists in this round.', details: {} },
        });
      }
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Opponent data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch opponent', error);
      throw this.createInternalErrorException();
    }
    return this.mapOpponentRow(data);
  }

  /** Delete opponent from round (captain only). */
  async deleteOpponent(params: DeleteOpponentParams): Promise<DeletedSuccessDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    await this.fetchOpponentOrFail(params.roundId, params.opponentId);
    const { error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .delete()
      .eq('id', params.opponentId)
      .eq('round_id', params.roundId);
    if (error) {
      this.logger.error('Failed to delete opponent', error);
      throw this.createInternalErrorException();
    }
    return { deleted: true };
  }

  /** List round tables with pagination and optional table number filter. */
  async listTables(params: TablesListParams): Promise<PaginatedListDto<RoundTableDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveTablesSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('round_tables')
      .select('id, table_no, table_name, image_asset_id, created_at', { count: 'exact' })
      .eq('round_id', round.id);
    if (params.tableNo !== undefined) {
      query = query.eq('table_no', params.tableNo);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list tables', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapRoundTableRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Replace full set of round tables (captain only). */
  async replaceTables(params: ReplaceTablesParams): Promise<PutRoundTablesResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    this.ensureNoDuplicateTableNumbers(params.command.tables);
    const inputTableNos = params.command.tables.map((table) => table.tableNo);
    const upsertPayload = params.command.tables.map((table) => ({
      round_id: round.id,
      table_no: table.tableNo,
      table_name: table.tableName ?? null,
      image_asset_id: table.imageAssetId ?? null,
    }));
    if (upsertPayload.length > 0) {
      const { error: upsertError } = await this.supabaseService
        .getClient()
        .from('round_tables')
        .upsert(upsertPayload, { onConflict: 'round_id,table_no' });
      if (upsertError) {
        if (this.isUniqueViolation(upsertError)) {
          throw new ConflictException({
            error: { code: 'DUPLICATE_TABLE_NO', message: 'Table number already exists in this round.', details: {} },
          });
        }
        if (this.isCheckViolation(upsertError) || this.isForeignKeyViolation(upsertError)) {
          throw this.createValidationException('Round table data does not satisfy constraints.');
        }
        this.logger.error('Failed to upsert round tables', upsertError);
        throw this.createInternalErrorException();
      }
    }
    if (inputTableNos.length === 0) {
      const { error: deleteAllError } = await this.supabaseService
        .getClient()
        .from('round_tables')
        .delete()
        .eq('round_id', round.id);
      if (deleteAllError) {
        this.logger.error('Failed to clear round tables', deleteAllError);
        throw this.createInternalErrorException();
      }
    } else {
      const { error: cleanupError } = await this.supabaseService
        .getClient()
        .from('round_tables')
        .delete()
        .eq('round_id', round.id)
        .not('table_no', 'in', `(${inputTableNos.join(',')})`);
      if (cleanupError) {
        this.logger.error('Failed to cleanup round tables', cleanupError);
        throw this.createInternalErrorException();
      }
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('round_tables')
      .select('id, table_no, table_name, image_asset_id')
      .eq('round_id', round.id)
      .order('table_no', { ascending: true });
    if (error || !data) {
      this.logger.error('Failed to read replaced round tables', error);
      throw this.createInternalErrorException();
    }
    return { data: data.map((row) => this.mapRoundTableRow(row)) };
  }

  /** List matchup estimations with player completion visibility gating. */
  async listEstimations(params: EstimationsListParams): Promise<PaginatedListDto<MatchupEstimationDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const membership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    const isCaptain = membership.role === 'captain';
    const hasCompleted = isCaptain
      ? true
      : await this.checkMembershipCompletedEstimations(round.id, membership.id);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveEstimationsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select(
        'id, player_membership_id, opponent_player_id, list_opened_at, has_first_turn_impact, score_single, score_go_first, score_go_second, comment',
        { count: 'exact' },
      )
      .eq('round_id', round.id);
    if (!isCaptain && !hasCompleted) {
      query = query.eq('player_membership_id', membership.id);
    }
    if (params.playerMembershipId) {
      query = query.eq('player_membership_id', params.playerMembershipId);
    }
    if (params.opponentPlayerId) {
      query = query.eq('opponent_player_id', params.opponentPlayerId);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list estimations', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapMatchupEstimationRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Upsert current player estimation for a round opponent. */
  async upsertEstimation(params: UpsertEstimationParams): Promise<MatchupEstimationDto> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const membership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    this.ensurePlayerMembership(membership);
    await this.ensureOpponentBelongsToRound(params.roundId, params.opponentPlayerId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .upsert(
        {
          round_id: round.id,
          player_membership_id: membership.id,
          opponent_player_id: params.opponentPlayerId,
          list_opened_at: params.command.listOpenedAt,
          has_first_turn_impact: params.command.hasFirstTurnImpact,
          score_single: params.command.scoreSingle,
          score_go_first: params.command.scoreGoFirst,
          score_go_second: params.command.scoreGoSecond,
          comment: params.command.comment,
        },
        { onConflict: 'round_id,player_membership_id,opponent_player_id' },
      )
      .select(
        'id, player_membership_id, opponent_player_id, list_opened_at, has_first_turn_impact, score_single, score_go_first, score_go_second, comment',
      )
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Estimation data does not satisfy constraints.');
      }
      this.logger.error('Failed to upsert estimation', error);
      throw this.createInternalErrorException();
    }
    return this.mapMatchupEstimationRow(data);
  }

  /** Delete estimation row in a round (captain only). */
  async deleteEstimation(params: DeleteEstimationParams): Promise<DeletedSuccessDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const estimation = await this.fetchEstimationOrFail(params.roundId, params.estimationId);
    const { error } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .delete()
      .eq('id', estimation.id)
      .eq('round_id', params.roundId);
    if (error) {
      this.logger.error('Failed to delete estimation', error);
      throw this.createInternalErrorException();
    }
    return { deleted: true };
  }

  /** List table preference rows for a round. */
  async listTablePreferences(params: TablePreferencesListParams): Promise<PaginatedListDto<TablePreferenceDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveTablePreferencesSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('table_preferences')
      .select('id, player_membership_id, round_table_id, preference', { count: 'exact' })
      .eq('round_id', round.id);
    if (params.playerMembershipId) {
      query = query.eq('player_membership_id', params.playerMembershipId);
    }
    if (params.roundTableId) {
      query = query.eq('round_table_id', params.roundTableId);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list table preferences', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapTablePreferenceRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Upsert current player table preference for a round table. */
  async upsertTablePreference(params: UpsertTablePreferenceParams): Promise<TablePreferenceDto> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const membership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    this.ensurePlayerMembership(membership);
    await this.ensureRoundTableBelongsToRound(params.roundId, params.roundTableId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('table_preferences')
      .upsert(
        {
          round_id: params.roundId,
          player_membership_id: membership.id,
          round_table_id: params.roundTableId,
          preference: params.command.preference,
        },
        { onConflict: 'round_id,player_membership_id,round_table_id' },
      )
      .select('id, player_membership_id, round_table_id, preference')
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Table preference data does not satisfy constraints.');
      }
      this.logger.error('Failed to upsert table preference', error);
      throw this.createInternalErrorException();
    }
    return this.mapTablePreferenceRow(data);
  }

  /** Delete current player table preference row for a table. */
  async deleteTablePreference(params: DeleteTablePreferenceParams): Promise<DeleteTablePreferenceResponseDto> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const membership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    if (membership.role !== 'player') {
      throw this.createForbiddenException();
    }
    const preference = await this.fetchTablePreferenceOrFail({
      roundId: params.roundId,
      roundTableId: params.roundTableId,
      playerMembershipId: membership.id,
    });
    const { error } = await this.supabaseService
      .getClient()
      .from('table_preferences')
      .delete()
      .eq('id', preference.id)
      .eq('round_id', params.roundId);
    if (error) {
      this.logger.error('Failed to delete table preference', error);
      throw this.createInternalErrorException();
    }
    return { deleted: true, interpretedAs: 'neutral' };
  }

  /** Return estimation completion status for current player in round. */
  async getMyEstimationStatus(actorUserId: string, roundId: string): Promise<PlayerEstimationStatusDto> {
    const round = await this.fetchRoundWithAccess(actorUserId, roundId);
    const membership = await this.resolveActiveMembership(actorUserId, round.tournament_id);
    if (membership.role !== 'player') {
      throw this.createForbiddenException();
    }
    const opponentCount = await this.countOpponentsForRound(round.id);
    const myEstimationsCount = await this.countEstimationsForMembership(round.id, membership.id);
    const completed = await this.checkMembershipCompletedEstimations(round.id, membership.id);
    return {
      completed,
      opponentCount,
      myEstimationsCount,
    };
  }

  /** Return aggregate matrix payload for captain/player view. */
  async getRoundMatrix(params: RoundMatrixParams): Promise<RoundMatrixDto> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const actorMembership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    if (actorMembership.role === 'player' && params.view !== 'player') {
      throw this.createForbiddenException();
    }
    const visiblePlayerMembershipIds = actorMembership.role === 'player'
      ? [actorMembership.id]
      : undefined;
    const cells = await this.buildRoundMatrixCells(round.id, visiblePlayerMembershipIds);
    const playerMemberships = await this.listRoundPlayerMemberships(round.tournament_id, visiblePlayerMembershipIds);
    const opponents = await this.listRoundOpponents(round.id);
    const rows = playerMemberships.map((membership) => ({ playerMembershipId: membership.id }));
    const columns = opponents.map((opponent) => ({ opponentPlayerId: opponent.id, name: opponent.name }));
    return {
      rows: rows as RoundMatrixDto['rows'],
      columns: columns as RoundMatrixDto['columns'],
      cells,
    };
  }

  /** Return matrix cells list for captain dashboard (with conditional player visibility). */
  async listRoundMatrixCells(params: RoundMatrixCellsListParams): Promise<PaginatedListDto<MatrixCellDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const actorMembership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    if (actorMembership.role === 'player' && params.playerMembershipId && params.playerMembershipId !== actorMembership.id) {
      throw this.createForbiddenException();
    }
    const visiblePlayerMembershipIds = actorMembership.role === 'player' ? [actorMembership.id] : undefined;
    let cells = await this.buildRoundMatrixCells(round.id, visiblePlayerMembershipIds);
    if (params.playerMembershipId) {
      cells = cells.filter((cell) => cell.playerMembershipId === params.playerMembershipId);
    }
    if (params.opponentPlayerId) {
      cells = cells.filter((cell) => cell.opponentPlayerId === params.opponentPlayerId);
    }
    const sortedCells = this.sortMatrixCells(cells, params.sort);
    const offset = (params.page - 1) * params.pageSize;
    const paginatedCells = sortedCells.slice(offset, offset + params.pageSize);
    return {
      data: paginatedCells,
      pagination: this.createPagination(params.page, params.pageSize, sortedCells.length),
    };
  }

  /** Return matrix modal details for one player/opponent cell. */
  async getRoundMatrixCell(params: RoundMatrixCellParams): Promise<MatrixCellDetailDto> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const actorMembership = await this.resolveActiveMembership(params.actorUserId, round.tournament_id);
    if (actorMembership.role === 'player' && actorMembership.id !== params.playerMembershipId) {
      throw this.createForbiddenException();
    }
    await this.ensurePlayerMembershipBelongsToTournament(round.tournament_id, params.playerMembershipId);
    await this.ensureOpponentBelongsToRound(round.id, params.opponentPlayerId);
    const { data: estimationData, error: estimationError } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select(
        'id, player_membership_id, opponent_player_id, list_opened_at, has_first_turn_impact, score_single, score_go_first, score_go_second, comment',
      )
      .eq('round_id', round.id)
      .eq('player_membership_id', params.playerMembershipId)
      .eq('opponent_player_id', params.opponentPlayerId)
      .maybeSingle();
    if (estimationError) {
      this.logger.error('Failed to fetch matrix cell estimation', estimationError);
      throw this.createInternalErrorException();
    }
    const { data: tablePreferenceData, error: tablePreferenceError } = await this.supabaseService
      .getClient()
      .from('table_preferences')
      .select('id, player_membership_id, round_table_id, preference')
      .eq('round_id', round.id)
      .eq('player_membership_id', params.playerMembershipId);
    if (tablePreferenceError || !tablePreferenceData) {
      this.logger.error('Failed to fetch matrix cell table preferences', tablePreferenceError);
      throw this.createInternalErrorException();
    }
    if (!estimationData && tablePreferenceData.length === 0) {
      throw this.createCellNotFoundException();
    }
    return {
      playerMembershipId: params.playerMembershipId,
      opponentPlayerId: params.opponentPlayerId,
      estimation: estimationData ? this.mapMatchupEstimationRow(estimationData) : null,
      tablePreferences: tablePreferenceData.map((preferenceRow) => this.mapTablePreferenceRow(preferenceRow)),
      comment: estimationData?.comment ?? null,
    };
  }

  /** List pairing runs (simulations + live flow) for a round. */
  async listPairingRuns(params: PairingRunsListParams): Promise<PaginatedListDto<PairingRunSummaryDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolvePairingRunsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('pairing_runs')
      .select('id, mode, name, simulation_rating, is_final, finalized_at', { count: 'exact' })
      .eq('round_id', round.id);
    if (params.mode) {
      query = query.eq('mode', params.mode);
    }
    if (params.isFinal !== undefined) {
      query = query.eq('is_final', params.isFinal);
    }
    if (params.simulationRating) {
      query = query.eq('simulation_rating', params.simulationRating);
    }
    const { data, error, count } = await query.order(column, { ascending }).range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list pairing runs', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapPairingRunSummaryRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** Create pairing simulation or live run for a round (captain). */
  async createPairingRun(params: CreatePairingRunParams): Promise<PairingRunDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    const captainMembershipId = await this.resolveCaptainMembership(params.actorUserId, tournament.team_id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .insert({
        round_id: round.id,
        mode: params.command.mode,
        name: params.command.name ?? null,
        simulation_rating: params.command.simulationRating ?? null,
        sort_order: params.command.sortOrder ?? null,
        created_by_membership_id: captainMembershipId,
      })
      .select('*')
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Pairing run data does not satisfy constraints.');
      }
      this.logger.error('Failed to create pairing run', error);
      throw this.createInternalErrorException();
    }
    return this.mapPairingRunRow(data);
  }

  /** Update pairing run metadata (captain). */
  async patchPairingRun(params: PatchPairingRunParams): Promise<PairingRunDto> {
    const pairingRun = await this.fetchPairingRunOrFail(params.pairingRunId);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    this.ensureRoundEditable(round);
    const updatePayload: Database['public']['Tables']['pairing_runs']['Update'] = {};
    if (params.command.name !== undefined) {
      updatePayload.name = params.command.name;
    }
    if (params.command.simulationRating !== undefined) {
      updatePayload.simulation_rating = params.command.simulationRating;
    }
    if (params.command.sortOrder !== undefined) {
      updatePayload.sort_order = params.command.sortOrder;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .update(updatePayload)
      .eq('id', pairingRun.id)
      .select('*')
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error)) {
        throw this.createValidationException('Pairing run data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch pairing run', error);
      throw this.createInternalErrorException();
    }
    return this.mapPairingRunRow(data);
  }

  /** Finalize one live pairing run and mark it as final. */
  async finalizePairingRun(params: FinalizePairingRunParams): Promise<PairingRunFinalizeResponseDto> {
    const pairingRun = await this.fetchPairingRunOrFail(params.pairingRunId);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    this.ensureRoundEditable(round);
    if (pairingRun.mode !== 'live') {
      throw this.createInvalidModeException();
    }
    const { data: existingFinalLiveRun, error: existingFinalLiveRunError } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .select('id')
      .eq('round_id', pairingRun.round_id)
      .eq('mode', 'live')
      .eq('is_final', true)
      .neq('id', pairingRun.id)
      .maybeSingle();
    if (existingFinalLiveRunError) {
      this.logger.error('Failed to check existing final live run', existingFinalLiveRunError);
      throw this.createInternalErrorException();
    }
    if (pairingRun.is_final || existingFinalLiveRun) {
      throw this.createLiveFinalAlreadyExistsException();
    }
    const finalizedAt = new Date().toISOString();
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .update({ is_final: true, finalized_at: finalizedAt })
      .eq('id', pairingRun.id)
      .select('id, mode, is_final, finalized_at')
      .single();
    if (error || !data) {
      this.logger.error('Failed to finalize pairing run', error);
      throw this.createInternalErrorException();
    }
    return {
      id: data.id,
      mode: 'live',
      isFinal: true,
      finalizedAt: data.finalized_at!,
    };
  }

  /** Delete pairing run with all dependent rows (captain). */
  async deletePairingRun(params: DeletePairingRunParams): Promise<DeletedSuccessDto> {
    const pairingRun = await this.fetchPairingRunOrFail(params.pairingRunId);
    await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    if (pairingRun.mode === 'live' && pairingRun.is_final) {
      throw this.createCannotDeleteFinalLiveRunException();
    }
    const { error } = await this.supabaseService.getClient().from('pairing_runs').delete().eq('id', pairingRun.id);
    if (error) {
      this.logger.error('Failed to delete pairing run', error);
      throw this.createInternalErrorException();
    }
    return { deleted: true };
  }

  /** List steps in pairing run. */
  async listPairingSteps(params: PairingStepsListParams): Promise<PaginatedListDto<PairingStepDto>> {
    const pairingRun = await this.fetchPairingRunWithAccess(params.actorUserId, params.pairingRunId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolvePairingStepsSort(params.sort);
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('pairing_steps')
      .select('id, step_no, phase_key, payload', { count: 'exact' })
      .eq('pairing_run_id', pairingRun.id)
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list pairing steps', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapPairingStepRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** Replace ordered full step sequence in pairing run (captain). */
  async putPairingSteps(params: PutPairingStepsParams): Promise<PutPairingStepsResponseDto> {
    const pairingRun = await this.fetchPairingRunOrFail(params.pairingRunId);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    this.ensureRoundEditable(round);
    this.ensureNoDuplicateStepNumbers(params.command.steps);
    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('pairing_steps')
      .delete()
      .eq('pairing_run_id', pairingRun.id);
    if (deleteError) {
      this.logger.error('Failed to clear pairing steps', deleteError);
      throw this.createInternalErrorException();
    }
    if (params.command.steps.length === 0) {
      return { data: [] };
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_steps')
      .insert(
        params.command.steps.map((step) => ({
          pairing_run_id: pairingRun.id,
          step_no: step.stepNo,
          phase_key: step.phaseKey,
          payload: step.payload,
        })),
      )
      .select('id, step_no, phase_key, payload')
      .order('step_no', { ascending: true });
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw this.createDuplicateStepNoException();
      }
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Pairing step data does not satisfy constraints.');
      }
      this.logger.error('Failed to put pairing steps', error);
      throw this.createInternalErrorException();
    }
    return { data: data.map((row) => this.mapPairingStepRow(row)) };
  }

  /** List assignments in pairing run. */
  async listPairingAssignments(params: PairingAssignmentsListParams): Promise<PaginatedListDto<PairingAssignmentDto>> {
    const pairingRun = await this.fetchPairingRunWithAccess(params.actorUserId, params.pairingRunId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolvePairingAssignmentsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .select('id, player_membership_id, opponent_player_id, round_table_id, estimation_id, game_result', { count: 'exact' })
      .eq('pairing_run_id', pairingRun.id);
    if (params.playerMembershipId) {
      query = query.eq('player_membership_id', params.playerMembershipId);
    }
    if (params.opponentPlayerId) {
      query = query.eq('opponent_player_id', params.opponentPlayerId);
    }
    const { data, error, count } = await query.order(column, { ascending }).range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list pairing assignments', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapPairingAssignmentRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** Replace full set of assignments in pairing run (captain). */
  async putPairingAssignments(params: PutPairingAssignmentsParams): Promise<PutPairingAssignmentsResponseDto> {
    const pairingRun = await this.fetchPairingRunOrFail(params.pairingRunId);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    this.ensureRoundEditable(round);
    this.ensureNoDuplicatePlayersOrOpponents(params.command.assignments);
    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .delete()
      .eq('pairing_run_id', pairingRun.id);
    if (deleteError) {
      this.logger.error('Failed to clear pairing assignments', deleteError);
      throw this.createInternalErrorException();
    }
    if (params.command.assignments.length === 0) {
      return { data: [] };
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .insert(
        params.command.assignments.map((assignment) => ({
          pairing_run_id: pairingRun.id,
          player_membership_id: assignment.playerMembershipId,
          opponent_player_id: assignment.opponentPlayerId,
          round_table_id: assignment.roundTableId ?? null,
          estimation_id: assignment.estimationId ?? null,
        })),
      )
      .select('id, player_membership_id, opponent_player_id, round_table_id, estimation_id, game_result');
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw this.createDuplicatePlayerOrOpponentException();
      }
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Pairing assignment data does not satisfy constraints.');
      }
      this.logger.error('Failed to put pairing assignments', error);
      throw this.createInternalErrorException();
    }
    return { data: data.map((row) => this.mapPairingAssignmentRow(row)) };
  }

  /** Update one assignment game result (captain). */
  async patchPairingAssignmentResult(params: PatchPairingAssignmentResultParams): Promise<PairingAssignmentDto> {
    const assignment = await this.fetchPairingAssignmentOrFail(params.assignmentId);
    const pairingRun = await this.fetchPairingRunOrFail(assignment.pairing_run_id);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, pairingRun.round_id);
    this.ensureRoundEditable(round);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .update({ game_result: params.command.gameResult })
      .eq('id', assignment.id)
      .select('id, player_membership_id, opponent_player_id, round_table_id, estimation_id, game_result')
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error)) {
        throw this.createValidationException('Pairing assignment result does not satisfy constraints.');
      }
      this.logger.error('Failed to patch pairing assignment result', error);
      throw this.createInternalErrorException();
    }
    return this.mapPairingAssignmentRow(data);
  }

  /** Return final live pairing summary for read-only post-live screen. */
  async getFinalPairings(actorUserId: string, roundId: string): Promise<FinalPairingsResponseDto> {
    const round = await this.fetchRoundWithAccess(actorUserId, roundId);
    const { data: finalRun, error: finalRunError } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .select('id')
      .eq('round_id', round.id)
      .eq('mode', 'live')
      .eq('is_final', true)
      .maybeSingle();
    if (finalRunError) {
      this.logger.error('Failed to fetch final live pairing run', finalRunError);
      throw this.createInternalErrorException();
    }
    if (!finalRun) {
      throw this.createFinalLiveRunNotFoundException();
    }
    const { data: assignmentRows, error: assignmentsError } = await this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .select('id, player_membership_id, opponent_player_id, round_table_id, estimation_id, game_result')
      .eq('pairing_run_id', finalRun.id)
      .order('created_at', { ascending: true });
    if (assignmentsError || !assignmentRows) {
      this.logger.error('Failed to fetch final pairing assignments', assignmentsError);
      throw this.createInternalErrorException();
    }
    const tableIds = assignmentRows
      .map((row) => row.round_table_id)
      .filter((tableId): tableId is string => Boolean(tableId));
    const estimationIds = assignmentRows
      .map((row) => row.estimation_id)
      .filter((estimationId): estimationId is string => Boolean(estimationId));
    const tableById = await this.fetchRoundTablesByIds(tableIds);
    const estimationById = await this.fetchEstimationsByIds(estimationIds);
    return {
      roundId: round.id,
      pairings: assignmentRows.map((assignmentRow) => {
        const estimation = assignmentRow.estimation_id ? estimationById.get(assignmentRow.estimation_id) ?? null : null;
        const table = assignmentRow.round_table_id ? tableById.get(assignmentRow.round_table_id) ?? null : null;
        return {
          playerMembershipId: assignmentRow.player_membership_id,
          opponentPlayerId: assignmentRow.opponent_player_id,
          estimation,
          table,
          comment: estimation?.comment ?? null,
          gameResult: assignmentRow.game_result,
        };
      }),
    };
  }

  /** Create estimator session for round (captain). */
  async createEstimatorSession(params: CreateEstimatorSessionParams): Promise<CreateEstimatorSessionResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    const captainMembershipId = await this.resolveCaptainMembership(params.actorUserId, tournament.team_id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('estimator_sessions')
      .insert({
        round_id: round.id,
        created_by_membership_id: captainMembershipId,
      })
      .select('id, round_id, created_by_membership_id, created_at')
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Estimator session data does not satisfy constraints.');
      }
      this.logger.error('Failed to create estimator session', error);
      throw this.createInternalErrorException();
    }
    return this.mapEstimatorSessionRow(data);
  }

  /** List estimator sessions for round. */
  async listEstimatorSessions(params: EstimatorSessionsListParams): Promise<PaginatedListDto<EstimatorSessionDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveEstimatorSessionsSort(params.sort);
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('estimator_sessions')
      .select('id, round_id, created_by_membership_id, created_at', { count: 'exact' })
      .eq('round_id', round.id)
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list estimator sessions', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapEstimatorSessionRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** List estimator click events for session. */
  async listEstimatorEvents(params: EstimatorEventsListParams): Promise<PaginatedListDto<EstimatorEventDto>> {
    const session = await this.fetchEstimatorSessionWithAccess(params.actorUserId, params.sessionId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveEstimatorEventsSort(params.sort);
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('estimator_events')
      .select('id, actor_membership_id, tile_label, tile_value, event_order, clicked_at', { count: 'exact' })
      .eq('session_id', session.id)
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list estimator events', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapEstimatorEventRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** Append estimator click event to session (captain). */
  async appendEstimatorEvent(params: AppendEstimatorEventParams): Promise<EstimatorEventDto> {
    const session = await this.fetchEstimatorSessionOrFail(params.sessionId);
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, session.round_id);
    this.ensureRoundEditable(round);
    const insertPayload: Database['public']['Tables']['estimator_events']['Insert'] = {
      session_id: session.id,
      actor_membership_id: params.command.actorMembershipId,
      tile_label: params.command.tileLabel,
      tile_value: params.command.tileValue,
      event_order: params.command.eventOrder,
    };
    if (params.command.clickedAt !== undefined) {
      insertPayload.clicked_at = params.command.clickedAt;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('estimator_events')
      .insert(insertPayload)
      .select('id, actor_membership_id, tile_label, tile_value, event_order, clicked_at')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw this.createDuplicateEventOrderException();
      }
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Estimator event data does not satisfy constraints.');
      }
      this.logger.error('Failed to append estimator event', error);
      throw this.createInternalErrorException();
    }
    return this.mapEstimatorEventRow(data);
  }

  /** Push offline snapshot using local-wins conflict policy (captain). */
  async pushOfflineSync(params: PushOfflineSyncParams): Promise<OfflineSyncPushResponseDto> {
    const round = await this.fetchRoundWithCaptainAccess(params.actorUserId, params.roundId);
    this.ensureRoundEditable(round);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    const captainMembershipId = await this.resolveCaptainMembership(params.actorUserId, tournament.team_id);
    const syncedAt = new Date().toISOString();
    const { data: existingSnapshot, error: existingSnapshotError } = await this.supabaseService
      .getClient()
      .from('offline_sync_snapshots')
      .select('id, round_id')
      .eq('client_snapshot_id', params.command.clientSnapshotId)
      .maybeSingle();
    if (existingSnapshotError) {
      this.logger.error('Failed to check offline sync snapshot conflicts', existingSnapshotError);
      throw this.createInternalErrorException();
    }
    if (existingSnapshot && existingSnapshot.round_id !== round.id) {
      throw this.createValidationException('clientSnapshotId already exists for another round.');
    }
    const selectColumns = 'id, captain_membership_id, client_snapshot_id, round_id, payload, synced_at';
    if (!existingSnapshot) {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('offline_sync_snapshots')
        .insert({
          round_id: round.id,
          captain_membership_id: captainMembershipId,
          client_snapshot_id: params.command.clientSnapshotId,
          payload: params.command.payload,
          synced_at: syncedAt,
        })
        .select(selectColumns)
        .single();
      if (error || !data) {
        if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
          throw this.createValidationException('Offline sync snapshot data does not satisfy constraints.');
        }
        this.logger.error('Failed to insert offline sync snapshot', error);
        throw this.createInternalErrorException();
      }
      return { applied: true, snapshotId: data.id, conflictResolution: 'local_wins' };
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('offline_sync_snapshots')
      .update({
        round_id: round.id,
        captain_membership_id: captainMembershipId,
        payload: params.command.payload,
        synced_at: syncedAt,
      })
      .eq('id', existingSnapshot.id)
      .select(selectColumns)
      .single();
    if (error || !data) {
      if (this.isCheckViolation(error) || this.isForeignKeyViolation(error)) {
        throw this.createValidationException('Offline sync snapshot data does not satisfy constraints.');
      }
      this.logger.error('Failed to update offline sync snapshot', error);
      throw this.createInternalErrorException();
    }
    return { applied: true, snapshotId: data.id, conflictResolution: 'local_wins' };
  }

  /** List offline sync snapshots for diagnostics. */
  async listOfflineSyncSnapshots(
    params: OfflineSyncSnapshotsListParams,
  ): Promise<PaginatedListDto<OfflineSyncSnapshotDto>> {
    const round = await this.fetchRoundWithAccess(params.actorUserId, params.roundId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveOfflineSyncSnapshotsSort(params.sort);
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('offline_sync_snapshots')
      .select('id, captain_membership_id, client_snapshot_id, round_id, payload, synced_at', { count: 'exact' })
      .eq('round_id', round.id)
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list offline sync snapshots', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapOfflineSyncSnapshotRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  // -------------------------------------------------------------------------
  // Access control helpers
  // -------------------------------------------------------------------------

  private async fetchTournamentWithAccess(actorUserId: string, tournamentId: string): Promise<TournamentRow> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    await this.ensureTeamMember(actorUserId, tournament.team_id);
    return tournament;
  }

  private async fetchTournamentWithCaptainAccess(actorUserId: string, tournamentId: string): Promise<TournamentRow> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    await this.resolveCaptainMembership(actorUserId, tournament.team_id);
    return tournament;
  }

  private async fetchRoundWithAccess(actorUserId: string, roundId: string): Promise<RoundRow> {
    const round = await this.fetchRoundOrFail(roundId);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    await this.ensureTeamMember(actorUserId, tournament.team_id);
    return round;
  }

  private async fetchRoundWithCaptainAccess(actorUserId: string, roundId: string): Promise<RoundRow> {
    const round = await this.fetchRoundOrFail(roundId);
    const tournament = await this.fetchTournamentOrFail(round.tournament_id);
    await this.resolveCaptainMembership(actorUserId, tournament.team_id);
    return round;
  }

  private async fetchPairingRunWithAccess(actorUserId: string, pairingRunId: string): Promise<PairingRunRow> {
    const pairingRun = await this.fetchPairingRunOrFail(pairingRunId);
    await this.fetchRoundWithAccess(actorUserId, pairingRun.round_id);
    return pairingRun;
  }

  private async fetchEstimatorSessionWithAccess(actorUserId: string, sessionId: string): Promise<EstimatorSessionRow> {
    const session = await this.fetchEstimatorSessionOrFail(sessionId);
    await this.fetchRoundWithAccess(actorUserId, session.round_id);
    return session;
  }

  private async fetchTournamentOrFail(tournamentId: string): Promise<TournamentRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch tournament', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found.', details: {} },
      });
    }
    return data;
  }

  private async fetchRoundOrFail(roundId: string): Promise<RoundRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch round', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'ROUND_NOT_FOUND', message: 'Round not found.', details: {} },
      });
    }
    return data;
  }

  private async fetchOpponentOrFail(roundId: string, opponentId: string): Promise<OpponentPlayerRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .select('*')
      .eq('id', opponentId)
      .eq('round_id', roundId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch opponent', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'OPPONENT_NOT_FOUND', message: 'Opponent not found.', details: {} },
      });
    }
    return data;
  }

  private async fetchEstimationOrFail(roundId: string, estimationId: string): Promise<MatchupEstimationRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select('*')
      .eq('id', estimationId)
      .eq('round_id', roundId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch estimation', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'ESTIMATION_NOT_FOUND', message: 'Estimation not found.', details: {} },
      });
    }
    return data;
  }

  private async fetchTablePreferenceOrFail(params: {
    roundId: string;
    roundTableId: string;
    playerMembershipId: string;
  }): Promise<TablePreferenceRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('table_preferences')
      .select('*')
      .eq('round_id', params.roundId)
      .eq('round_table_id', params.roundTableId)
      .eq('player_membership_id', params.playerMembershipId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch table preference', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'PREFERENCE_NOT_FOUND', message: 'Table preference not found.', details: {} },
      });
    }
    return data;
  }

  private async fetchPairingRunOrFail(pairingRunId: string): Promise<PairingRunRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_runs')
      .select('*')
      .eq('id', pairingRunId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch pairing run', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createPairingRunNotFoundException();
    }
    return data;
  }

  private async fetchPairingAssignmentOrFail(assignmentId: string): Promise<PairingAssignmentRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pairing_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch pairing assignment', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createAssignmentNotFoundException();
    }
    return data;
  }

  private async fetchEstimatorSessionOrFail(sessionId: string): Promise<EstimatorSessionRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('estimator_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch estimator session', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createSessionNotFoundException();
    }
    return data;
  }

  private async ensureTeamMember(actorUserId: string, teamId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', actorUserId)
      .is('left_at', null)
      .limit(1);
    if (error) {
      this.logger.error('Failed to check team member access', error);
      throw this.createInternalErrorException();
    }
    if (!data || data.length === 0) {
      throw this.createForbiddenException();
    }
  }

  private async resolveCaptainMembership(actorUserId: string, teamId: string): Promise<string> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', actorUserId)
      .eq('role', 'captain')
      .is('left_at', null)
      .single();
    if (error || !data) {
      throw this.createForbiddenException();
    }
    return data.id;
  }

  private async resolveActiveMembership(actorUserId: string, tournamentId: string): Promise<TeamMembershipRow> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('*')
      .eq('team_id', tournament.team_id)
      .eq('user_id', actorUserId)
      .is('left_at', null)
      .single();
    if (error || !data) {
      throw this.createForbiddenException();
    }
    return data;
  }

  // -------------------------------------------------------------------------
  // Business rule guards
  // -------------------------------------------------------------------------

  private ensureTournamentActive(tournament: TournamentRow): void {
    if (tournament.status === 'closed') {
      throw new ConflictException({
        error: { code: 'TOURNAMENT_CLOSED', message: 'Tournament is closed.', details: {} },
      });
    }
  }

  private ensureRoundEditable(round: RoundRow): void {
    if (round.status === 'locked') {
      throw new ConflictException({
        error: { code: 'ROUND_LOCKED', message: 'Round is read-only.', details: {} },
      });
    }
  }

  private async ensureRoundLimitNotReached(tournamentId: string): Promise<void> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);
    if (error) {
      this.logger.error('Failed to count rounds', error);
      throw this.createInternalErrorException();
    }
    if ((count ?? 0) >= 200) {
      throw new ConflictException({
        error: { code: 'ROUND_LIMIT_REACHED', message: 'Round limit reached for this tournament.', details: {} },
      });
    }
  }

  private ensureNoDuplicateTableNumbers(tables: PutRoundTablesCommand['tables']): void {
    const tableNumbers = tables.map((table) => table.tableNo);
    const uniqueTableNumbers = new Set(tableNumbers);
    if (uniqueTableNumbers.size !== tableNumbers.length) {
      throw new ConflictException({
        error: { code: 'DUPLICATE_TABLE_NO', message: 'Table number must be unique in request payload.', details: {} },
      });
    }
  }

  private ensureNoDuplicateStepNumbers(steps: PutPairingStepsCommand['steps']): void {
    const stepNumbers = steps.map((step) => step.stepNo);
    const uniqueStepNumbers = new Set(stepNumbers);
    if (uniqueStepNumbers.size !== stepNumbers.length) {
      throw this.createDuplicateStepNoException();
    }
  }

  private ensureNoDuplicatePlayersOrOpponents(assignments: PutPairingAssignmentsCommand['assignments']): void {
    const playerMembershipIds = assignments.map((assignment) => assignment.playerMembershipId);
    const opponentPlayerIds = assignments.map((assignment) => assignment.opponentPlayerId);
    if (new Set(playerMembershipIds).size !== playerMembershipIds.length) {
      throw this.createDuplicatePlayerOrOpponentException();
    }
    if (new Set(opponentPlayerIds).size !== opponentPlayerIds.length) {
      throw this.createDuplicatePlayerOrOpponentException();
    }
  }

  private ensurePlayerMembership(membership: TeamMembershipRow): void {
    if (membership.role !== 'player') {
      throw this.createOnlyPlayerRoleAllowedException();
    }
  }

  private async ensureOpponentBelongsToRound(roundId: string, opponentPlayerId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .select('id')
      .eq('id', opponentPlayerId)
      .eq('round_id', roundId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to validate opponent for round', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createValidationException('Opponent does not belong to this round.');
    }
  }

  private async ensureRoundTableBelongsToRound(roundId: string, roundTableId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('round_tables')
      .select('id')
      .eq('id', roundTableId)
      .eq('round_id', roundId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to validate table for round', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createValidationException('Round table does not belong to this round.');
    }
  }

  private async countOpponentsForRound(roundId: string): Promise<number> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId);
    if (error) {
      this.logger.error('Failed to count opponents', error);
      throw this.createInternalErrorException();
    }
    return count ?? 0;
  }

  private async countEstimationsForMembership(roundId: string, membershipId: string): Promise<number> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId)
      .eq('player_membership_id', membershipId);
    if (error) {
      this.logger.error('Failed to count estimations', error);
      throw this.createInternalErrorException();
    }
    return count ?? 0;
  }

  private async checkMembershipCompletedEstimations(roundId: string, membershipId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('has_completed_round_estimations', { _membership_id: membershipId, _round_id: roundId });
    if (error) {
      this.logger.error('Failed to check completed estimations', error);
      throw this.createInternalErrorException();
    }
    return Boolean(data);
  }

  private async listRoundPlayerMemberships(
    tournamentId: string,
    onlyMembershipIds?: string[],
  ): Promise<Array<Pick<TeamMembershipRow, 'id'>>> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    let query = this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', tournament.team_id)
      .eq('role', 'player')
      .eq('is_playing', true)
      .is('left_at', null);
    if (onlyMembershipIds && onlyMembershipIds.length > 0) {
      query = query.in('id', onlyMembershipIds);
    }
    const { data, error } = await query.order('joined_at', { ascending: true });
    if (error || !data) {
      this.logger.error('Failed to list round player memberships', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async listRoundOpponents(roundId: string): Promise<Array<Pick<OpponentPlayerRow, 'id' | 'name'>>> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('opponent_players')
      .select('id, name')
      .eq('round_id', roundId)
      .order('name', { ascending: true });
    if (error || !data) {
      this.logger.error('Failed to list round opponents for matrix', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async fetchEstimationsByIds(estimationIds: string[]): Promise<Map<string, MatchupEstimationDto>> {
    if (estimationIds.length === 0) {
      return new Map<string, MatchupEstimationDto>();
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select(
        'id, player_membership_id, opponent_player_id, list_opened_at, has_first_turn_impact, score_single, score_go_first, score_go_second, comment',
      )
      .in('id', estimationIds);
    if (error || !data) {
      this.logger.error('Failed to fetch estimations by ids', error);
      throw this.createInternalErrorException();
    }
    const estimationById = new Map<string, MatchupEstimationDto>();
    data.forEach((row) => {
      estimationById.set(row.id, this.mapMatchupEstimationRow(row));
    });
    return estimationById;
  }

  private async fetchRoundTablesByIds(tableIds: string[]): Promise<Map<string, RoundTableDto>> {
    if (tableIds.length === 0) {
      return new Map<string, RoundTableDto>();
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('round_tables')
      .select('id, table_no, table_name, image_asset_id')
      .in('id', tableIds);
    if (error || !data) {
      this.logger.error('Failed to fetch round tables by ids', error);
      throw this.createInternalErrorException();
    }
    const tableById = new Map<string, RoundTableDto>();
    data.forEach((row) => {
      tableById.set(row.id, this.mapRoundTableRow(row));
    });
    return tableById;
  }

  private async buildRoundMatrixCells(roundId: string, onlyPlayerMembershipIds?: string[]): Promise<MatrixCellDto[]> {
    const players = await this.listRoundPlayerMemberships((await this.fetchRoundOrFail(roundId)).tournament_id, onlyPlayerMembershipIds);
    const opponents = await this.listRoundOpponents(roundId);
    const playerIds = players.map((player) => player.id);
    if (playerIds.length === 0 || opponents.length === 0) {
      return [];
    }
    const { data: estimationData, error: estimationError } = await this.supabaseService
      .getClient()
      .from('matchup_estimations')
      .select(
        'id, player_membership_id, opponent_player_id, list_opened_at, has_first_turn_impact, score_single, score_go_first, score_go_second, comment',
      )
      .eq('round_id', roundId)
      .in('player_membership_id', playerIds);
    if (estimationError || !estimationData) {
      this.logger.error('Failed to list matrix estimations', estimationError);
      throw this.createInternalErrorException();
    }
    const estimationByCell = new Map<string, MatchupEstimationDto>();
    estimationData.forEach((row) => {
      estimationByCell.set(this.createMatrixCellKey(row.player_membership_id, row.opponent_player_id), this.mapMatchupEstimationRow(row));
    });
    const { data: preferenceData, error: preferenceError } = await this.supabaseService
      .getClient()
      .from('table_preferences')
      .select('player_membership_id, preference')
      .eq('round_id', roundId)
      .in('player_membership_id', playerIds);
    if (preferenceError || !preferenceData) {
      this.logger.error('Failed to list matrix table preferences', preferenceError);
      throw this.createInternalErrorException();
    }
    const preferenceSummaryByPlayer = new Map<string, { preferred: number; notPreferred: number }>();
    preferenceData.forEach((preferenceRow) => {
      const currentSummary = preferenceSummaryByPlayer.get(preferenceRow.player_membership_id) ?? { preferred: 0, notPreferred: 0 };
      if (preferenceRow.preference === 'preferred') {
        currentSummary.preferred += 1;
      }
      if (preferenceRow.preference === 'not_preferred') {
        currentSummary.notPreferred += 1;
      }
      preferenceSummaryByPlayer.set(preferenceRow.player_membership_id, currentSummary);
    });
    const cells: MatrixCellDto[] = [];
    players.forEach((player) => {
      opponents.forEach((opponent) => {
        const estimation = estimationByCell.get(this.createMatrixCellKey(player.id, opponent.id)) ?? null;
        const preferenceSummary = preferenceSummaryByPlayer.get(player.id) ?? null;
        cells.push({
          playerMembershipId: player.id,
          opponentPlayerId: opponent.id,
          estimation,
          tablePreferenceSummary: preferenceSummary,
          comment: estimation?.comment ?? null,
        });
      });
    });
    return cells;
  }

  private sortMatrixCells(
    cells: MatrixCellDto[],
    sort: RoundMatrixCellsListParams['sort'],
  ): MatrixCellDto[] {
    const sortedCells = [...cells];
    sortedCells.sort((leftCell, rightCell) => {
      if (sort === 'playerMembershipId') {
        const byPlayer = leftCell.playerMembershipId.localeCompare(rightCell.playerMembershipId);
        return byPlayer !== 0 ? byPlayer : leftCell.opponentPlayerId.localeCompare(rightCell.opponentPlayerId);
      }
      if (sort === '-playerMembershipId') {
        const byPlayer = rightCell.playerMembershipId.localeCompare(leftCell.playerMembershipId);
        return byPlayer !== 0 ? byPlayer : leftCell.opponentPlayerId.localeCompare(rightCell.opponentPlayerId);
      }
      if (sort === 'opponentPlayerId') {
        const byOpponent = leftCell.opponentPlayerId.localeCompare(rightCell.opponentPlayerId);
        return byOpponent !== 0 ? byOpponent : leftCell.playerMembershipId.localeCompare(rightCell.playerMembershipId);
      }
      const byOpponent = rightCell.opponentPlayerId.localeCompare(leftCell.opponentPlayerId);
      return byOpponent !== 0 ? byOpponent : leftCell.playerMembershipId.localeCompare(rightCell.playerMembershipId);
    });
    return sortedCells;
  }

  private async ensurePlayerMembershipBelongsToTournament(tournamentId: string, playerMembershipId: string): Promise<void> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('id', playerMembershipId)
      .eq('team_id', tournament.team_id)
      .eq('role', 'player')
      .is('left_at', null)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to validate player membership for matrix', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createCellNotFoundException();
    }
  }

  private createMatrixCellKey(playerMembershipId: string, opponentPlayerId: string): string {
    return `${playerMembershipId}:${opponentPlayerId}`;
  }

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  private async insertAuditEvent(params: {
    teamId: string;
    tournamentId: string;
    roundId: string;
    actorUserId: string;
    eventType: string;
  }): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('audit_events')
      .insert({
        team_id: params.teamId,
        tournament_id: params.tournamentId,
        round_id: params.roundId,
        actor_user_id: params.actorUserId,
        event_type: params.eventType,
      });
    if (error) {
      this.logger.warn('Failed to insert audit event', error);
    }
  }

  // -------------------------------------------------------------------------
  // Sort resolver
  // -------------------------------------------------------------------------

  private resolveRoundsSort(sort: RoundsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      roundNumber: { column: 'round_number', ascending: true },
      '-roundNumber': { column: 'round_number', ascending: false },
      sortOrder: { column: 'sort_order', ascending: true },
      '-sortOrder': { column: 'sort_order', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'created_at', ascending: false };
  }

  private resolveOpponentsSort(sort: OpponentsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      name: { column: 'name', ascending: true },
      '-name': { column: 'name', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'name', ascending: true };
  }

  private resolveTablesSort(sort: TablesListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      tableNo: { column: 'table_no', ascending: true },
      '-tableNo': { column: 'table_no', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'table_no', ascending: true };
  }

  private resolveEstimationsSort(sort: EstimationsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
      updatedAt: { column: 'updated_at', ascending: true },
      '-updatedAt': { column: 'updated_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'created_at', ascending: false };
  }

  private resolveTablePreferencesSort(sort: TablePreferencesListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
      updatedAt: { column: 'updated_at', ascending: true },
      '-updatedAt': { column: 'updated_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'created_at', ascending: false };
  }

  private resolvePairingRunsSort(sort: PairingRunsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
      sortOrder: { column: 'sort_order', ascending: true },
      '-sortOrder': { column: 'sort_order', ascending: false },
      finalizedAt: { column: 'finalized_at', ascending: true },
      '-finalizedAt': { column: 'finalized_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'created_at', ascending: false };
  }

  private resolvePairingStepsSort(sort: PairingStepsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      stepNo: { column: 'step_no', ascending: true },
      '-stepNo': { column: 'step_no', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'step_no', ascending: true };
  }

  private resolvePairingAssignmentsSort(
    sort: PairingAssignmentsListParams['sort'],
  ): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      playerMembershipId: { column: 'player_membership_id', ascending: true },
      '-playerMembershipId': { column: 'player_membership_id', ascending: false },
      opponentPlayerId: { column: 'opponent_player_id', ascending: true },
      '-opponentPlayerId': { column: 'opponent_player_id', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'player_membership_id', ascending: true };
  }

  private resolveEstimatorSessionsSort(sort: EstimatorSessionsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'created_at', ascending: false };
  }

  private resolveEstimatorEventsSort(sort: EstimatorEventsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      eventOrder: { column: 'event_order', ascending: true },
      '-eventOrder': { column: 'event_order', ascending: false },
      clickedAt: { column: 'clicked_at', ascending: true },
      '-clickedAt': { column: 'clicked_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'event_order', ascending: true };
  }

  private resolveOfflineSyncSnapshotsSort(
    sort: OfflineSyncSnapshotsListParams['sort'],
  ): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      syncedAt: { column: 'synced_at', ascending: true },
      '-syncedAt': { column: 'synced_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'synced_at', ascending: false };
  }

  // -------------------------------------------------------------------------
  // Conflict resolver for unique violations
  // -------------------------------------------------------------------------

  private resolveRoundInsertConflict(error: { message?: string } | null): { code: string; message: string } {
    const msg = error?.message ?? '';
    if (msg.includes('round_number') || msg.includes('rounds_tournament_id_round_number')) {
      return { code: 'DUPLICATE_ROUND_NUMBER', message: 'Round number already exists in this tournament.' };
    }
    if (msg.includes('sort_order') || msg.includes('rounds_tournament_id_sort_order')) {
      return { code: 'DUPLICATE_SORT_ORDER', message: 'Sort order already exists in this tournament.' };
    }
    if (msg.includes('is_active')) {
      return { code: 'ACTIVE_ROUND_ALREADY_EXISTS', message: 'An active round already exists.' };
    }
    return { code: 'DUPLICATE_ROUND_NUMBER', message: 'Duplicate round data in this tournament.' };
  }

  // -------------------------------------------------------------------------
  // Row mappers
  // -------------------------------------------------------------------------

  private mapRoundToSummary(
    row: Pick<RoundRow, 'id' | 'round_number' | 'display_name' | 'status' | 'is_active' | 'sort_order'>,
  ): RoundSummaryDto {
    return {
      id: row.id,
      roundNumber: row.round_number,
      displayName: row.display_name,
      status: row.status,
      isActive: row.is_active,
      sortOrder: row.sort_order,
    };
  }

  private mapRoundRow(row: RoundRow): RoundDto {
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      roundNumber: row.round_number,
      displayName: row.display_name,
      mission: row.mission,
      deployment: row.deployment,
      opponentTeamName: row.opponent_team_name,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      status: row.status,
      lockedAt: row.locked_at,
      lockedByMembershipId: row.locked_by_membership_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapOpponentRow(
    row: Pick<OpponentPlayerRow, 'id' | 'name' | 'faction' | 'list_text' | 'external_ref' | 'list_opened_required'>,
  ): OpponentPlayerDto {
    return {
      id: row.id,
      name: row.name,
      faction: row.faction,
      listText: row.list_text,
      externalRef: row.external_ref,
      listOpenedRequired: row.list_opened_required,
    };
  }

  private mapRoundTableRow(
    row: Pick<RoundTableRow, 'id' | 'table_no' | 'table_name' | 'image_asset_id'>,
  ): RoundTableDto {
    return {
      id: row.id,
      tableNo: row.table_no,
      tableName: row.table_name,
      imageAssetId: row.image_asset_id,
    };
  }

  private mapMatchupEstimationRow(
    row: Pick<
      MatchupEstimationRow,
      | 'id'
      | 'player_membership_id'
      | 'opponent_player_id'
      | 'list_opened_at'
      | 'has_first_turn_impact'
      | 'score_single'
      | 'score_go_first'
      | 'score_go_second'
      | 'comment'
    >,
  ): MatchupEstimationDto {
    return {
      id: row.id,
      playerMembershipId: row.player_membership_id,
      opponentPlayerId: row.opponent_player_id,
      listOpenedAt: row.list_opened_at,
      hasFirstTurnImpact: row.has_first_turn_impact,
      scoreSingle: row.score_single,
      scoreGoFirst: row.score_go_first,
      scoreGoSecond: row.score_go_second,
      comment: row.comment,
    };
  }

  private mapTablePreferenceRow(
    row: Pick<TablePreferenceRow, 'id' | 'player_membership_id' | 'round_table_id' | 'preference'>,
  ): TablePreferenceDto {
    return {
      id: row.id,
      playerMembershipId: row.player_membership_id,
      roundTableId: row.round_table_id,
      preference: row.preference,
    };
  }

  private mapPairingRunSummaryRow(
    row: Pick<PairingRunRow, 'id' | 'mode' | 'name' | 'simulation_rating' | 'is_final' | 'finalized_at'>,
  ): PairingRunSummaryDto {
    return {
      id: row.id,
      mode: row.mode,
      name: row.name,
      simulationRating: row.simulation_rating,
      isFinal: row.is_final,
      finalizedAt: row.finalized_at,
    };
  }

  private mapPairingRunRow(row: PairingRunRow): PairingRunDto {
    return {
      id: row.id,
      mode: row.mode,
      name: row.name,
      simulationRating: row.simulation_rating,
      isFinal: row.is_final,
      finalizedAt: row.finalized_at,
      roundId: row.round_id,
      createdByMembershipId: row.created_by_membership_id,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPairingStepRow(row: Pick<PairingStepRow, 'id' | 'step_no' | 'phase_key' | 'payload'>): PairingStepDto {
    return {
      id: row.id,
      stepNo: row.step_no,
      phaseKey: row.phase_key,
      payload: row.payload,
    };
  }

  private mapPairingAssignmentRow(
    row: Pick<PairingAssignmentRow, 'id' | 'player_membership_id' | 'opponent_player_id' | 'round_table_id' | 'estimation_id' | 'game_result'>,
  ): PairingAssignmentDto {
    return {
      id: row.id,
      playerMembershipId: row.player_membership_id,
      opponentPlayerId: row.opponent_player_id,
      roundTableId: row.round_table_id,
      estimationId: row.estimation_id,
      gameResult: row.game_result,
    };
  }

  private mapEstimatorSessionRow(
    row: Pick<EstimatorSessionRow, 'id' | 'round_id' | 'created_by_membership_id' | 'created_at'>,
  ): EstimatorSessionDto {
    return {
      id: row.id,
      roundId: row.round_id,
      createdByMembershipId: row.created_by_membership_id,
      createdAt: row.created_at,
    };
  }

  private mapEstimatorEventRow(
    row: Pick<EstimatorEventRow, 'id' | 'actor_membership_id' | 'tile_label' | 'tile_value' | 'event_order' | 'clicked_at'>,
  ): EstimatorEventDto {
    return {
      id: row.id,
      actorMembershipId: row.actor_membership_id,
      tileLabel: row.tile_label,
      tileValue: row.tile_value,
      eventOrder: row.event_order,
      clickedAt: row.clicked_at,
    };
  }

  private mapOfflineSyncSnapshotRow(
    row: Pick<OfflineSyncSnapshotRow, 'id' | 'captain_membership_id' | 'client_snapshot_id' | 'round_id' | 'payload' | 'synced_at'>,
  ): OfflineSyncSnapshotDto {
    return {
      id: row.id,
      captainMembershipId: row.captain_membership_id,
      clientSnapshotId: row.client_snapshot_id,
      roundId: row.round_id,
      payload: row.payload,
      syncedAt: row.synced_at,
    };
  }

  // -------------------------------------------------------------------------
  // Pagination & error helpers
  // -------------------------------------------------------------------------

  private createPagination(page: number, pageSize: number, total: number): {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } {
    return {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private isUniqueViolation(error: { code?: string } | null): boolean {
    return error?.code === '23505';
  }

  private isCheckViolation(error: { code?: string } | null): boolean {
    return error?.code === '23514' || error?.code === '22P02';
  }

  private isForeignKeyViolation(error: { code?: string } | null): boolean {
    return error?.code === '23503';
  }

  private createForbiddenException(): ForbiddenException {
    return new ForbiddenException({
      error: { code: 'FORBIDDEN', message: 'Operation is forbidden.', details: {} },
    });
  }

  private createOnlyPlayerRoleAllowedException(): ForbiddenException {
    return new ForbiddenException({
      error: { code: 'ONLY_PLAYER_ROLE_ALLOWED', message: 'Only player role can perform this action.', details: {} },
    });
  }

  private createCellNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: { code: 'CELL_NOT_FOUND', message: 'Matrix cell not found.', details: {} },
    });
  }

  private createPairingRunNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: { code: 'PAIRING_RUN_NOT_FOUND', message: 'Pairing run not found.', details: {} },
    });
  }

  private createAssignmentNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: { code: 'ASSIGNMENT_NOT_FOUND', message: 'Pairing assignment not found.', details: {} },
    });
  }

  private createSessionNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: { code: 'SESSION_NOT_FOUND', message: 'Estimator session not found.', details: {} },
    });
  }

  private createFinalLiveRunNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: { code: 'FINAL_LIVE_RUN_NOT_FOUND', message: 'Final live pairing run not found.', details: {} },
    });
  }

  private createDuplicateStepNoException(): ConflictException {
    return new ConflictException({
      error: { code: 'DUPLICATE_STEP_NO', message: 'Step number must be unique.', details: {} },
    });
  }

  private createDuplicatePlayerOrOpponentException(): ConflictException {
    return new ConflictException({
      error: {
        code: 'DUPLICATE_PLAYER_OR_OPPONENT',
        message: 'Player and opponent assignments must be unique in payload.',
        details: {},
      },
    });
  }

  private createInvalidModeException(): BadRequestException {
    return new BadRequestException({
      error: { code: 'INVALID_MODE', message: 'Only live pairing run can be finalized.', details: {} },
    });
  }

  private createLiveFinalAlreadyExistsException(): ConflictException {
    return new ConflictException({
      error: { code: 'LIVE_FINAL_ALREADY_EXISTS', message: 'Final live pairing run already exists.', details: {} },
    });
  }

  private createCannotDeleteFinalLiveRunException(): ConflictException {
    return new ConflictException({
      error: { code: 'CANNOT_DELETE_FINAL_LIVE_RUN', message: 'Final live pairing run cannot be deleted.', details: {} },
    });
  }

  private createDuplicateEventOrderException(): ConflictException {
    return new ConflictException({
      error: { code: 'DUPLICATE_EVENT_ORDER', message: 'Event order must be unique in session.', details: {} },
    });
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }

  private createInternalErrorException(): InternalServerErrorException {
    return new InternalServerErrorException({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
    });
  }
}
