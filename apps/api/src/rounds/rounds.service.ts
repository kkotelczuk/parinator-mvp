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
  CreateRoundCommand,
  Database,
  DeletedSuccessDto,
  LockRoundResponseDto,
  OpponentPlayerDto,
  PaginatedListDto,
  PatchRoundCommand,
  PatchOpponentCommand,
  PutRoundTablesCommand,
  PutRoundTablesResponseDto,
  ReorderRoundResponseDto,
  RoundTableDto,
  RoundDto,
  RoundSummaryDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type RoundRow = Database['public']['Tables']['rounds']['Row'];
type OpponentPlayerRow = Database['public']['Tables']['opponent_players']['Row'];
type RoundTableRow = Database['public']['Tables']['round_tables']['Row'];
type TournamentRow = Database['public']['Tables']['tournaments']['Row'];

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
