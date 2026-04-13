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
  CloseTournamentCommand,
  CreateTournamentCommand,
  Database,
  PaginatedListDto,
  PatchTournamentCommand,
  PutTournamentRosterCommand,
  PutTournamentRosterResponseDto,
  TournamentClosedResponseDto,
  TournamentDetailDto,
  TournamentDto,
  TournamentRosterRowDto,
  TournamentSummaryDto,
  LockSetupResponseDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type TournamentRow = Database['public']['Tables']['tournaments']['Row'];
type RosterRow = Database['public']['Tables']['tournament_rosters']['Row'];

type TournamentsListParams = {
  userId: string;
  page: number;
  pageSize: number;
  sort: 'name' | '-name' | 'createdAt' | '-createdAt';
  status?: 'active' | 'closed';
  teamId?: string;
};

type CreateTournamentParams = {
  actorUserId: string;
  command: CreateTournamentCommand;
};

type PatchTournamentParams = {
  actorUserId: string;
  tournamentId: string;
  command: PatchTournamentCommand;
};

type RosterListParams = {
  actorUserId: string;
  tournamentId: string;
  sort: 'slotNo' | '-slotNo' | 'role' | '-role';
  role?: 'captain' | 'player';
  isPlaying?: boolean;
};

type ReplaceRosterParams = {
  actorUserId: string;
  tournamentId: string;
  command: PutTournamentRosterCommand;
};

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** List tournaments visible to the authenticated user's team memberships. */
  async listTournaments(params: TournamentsListParams): Promise<PaginatedListDto<TournamentSummaryDto>> {
    const teamIds = await this.fetchUserTeamIds(params.userId);
    if (teamIds.length === 0) {
      return this.createEmptyPaginatedResponse(params.page, params.pageSize);
    }
    const filterTeamIds = params.teamId ? [params.teamId] : teamIds;
    if (params.teamId && !teamIds.includes(params.teamId)) {
      return this.createEmptyPaginatedResponse(params.page, params.pageSize);
    }
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveTournamentsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('tournaments')
      .select('id, name, status, team_size, setup_locked_at', { count: 'exact' })
      .in('team_id', filterTeamIds);
    if (params.status) {
      query = query.eq('status', params.status);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list tournaments', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapTournamentToSummary(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Create a new tournament within a team. */
  async createTournament(params: CreateTournamentParams): Promise<TournamentDto> {
    const membershipId = await this.resolveCaptainMembership(params.actorUserId, params.command.teamId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .insert({
        name: params.command.name,
        team_id: params.command.teamId,
        team_size: params.command.teamSize,
        source_type: params.command.sourceType ?? null,
        source_url: params.command.sourceUrl ?? null,
        created_by_membership_id: membershipId,
      })
      .select('*')
      .single();
    if (error || !data) {
      if (this.isForbiddenError(error)) {
        throw this.createForbiddenException();
      }
      if (this.isValidationError(error)) {
        this.logger.warn('Tournament creation validation error', error);
        throw this.createValidationException('Tournament data does not satisfy constraints.');
      }
      this.logger.error('Failed to create tournament', error);
      throw this.createInternalErrorException();
    }
    return this.mapTournamentRow(data);
  }

  /** Get tournament details with round stats. */
  async getTournamentDetail(actorUserId: string, tournamentId: string): Promise<TournamentDetailDto> {
    const tournament = await this.fetchTournamentWithAccess(actorUserId, tournamentId);
    const { roundCount, activeRoundId } = await this.fetchRoundStats(tournamentId);
    return {
      ...this.mapTournamentRow(tournament),
      roundCount,
      activeRoundId,
    };
  }

  /** Update tournament fields while active. */
  async patchTournament(params: PatchTournamentParams): Promise<TournamentDto> {
    const tournament = await this.fetchTournamentWithCaptainAccess(params.actorUserId, params.tournamentId);
    if (params.command.status === 'closed') {
      throw this.createValidationException('Use the /close endpoint to close a tournament.');
    }
    const updatePayload: Database['public']['Tables']['tournaments']['Update'] = {};
    if (params.command.name !== undefined) {
      updatePayload.name = params.command.name;
    }
    if (params.command.status !== undefined) {
      updatePayload.status = params.command.status;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .update(updatePayload)
      .eq('id', tournament.id)
      .select('*')
      .single();
    if (error || !data) {
      if (this.isValidationError(error)) {
        this.logger.warn('Tournament patch validation error', error);
        throw this.createValidationException('Tournament data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch tournament', error);
      throw this.createInternalErrorException();
    }
    return this.mapTournamentRow(data);
  }

  /** Lock setup — freeze team_size and mutable setup fields. */
  async lockSetup(actorUserId: string, tournamentId: string): Promise<LockSetupResponseDto> {
    const tournament = await this.fetchTournamentWithCaptainAccess(actorUserId, tournamentId);
    if (tournament.setup_locked_at) {
      throw new ConflictException({
        error: { code: 'SETUP_ALREADY_LOCKED', message: 'Setup is already locked.', details: {} },
      });
    }
    const now = new Date().toISOString();
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .update({ setup_locked_at: now })
      .eq('id', tournament.id)
      .select('id, setup_locked_at')
      .single();
    if (error || !data) {
      this.logger.error('Failed to lock setup', error);
      throw this.createInternalErrorException();
    }
    return {
      id: data.id,
      setupLockedAt: data.setup_locked_at!,
    };
  }

  /** Close tournament and make all dependent data read-only. */
  async closeTournament(
    actorUserId: string,
    tournamentId: string,
    command: CloseTournamentCommand,
  ): Promise<TournamentClosedResponseDto> {
    const tournament = await this.fetchTournamentWithCaptainAccess(actorUserId, tournamentId);
    if (tournament.status === 'closed') {
      throw new ConflictException({
        error: { code: 'TOURNAMENT_ALREADY_CLOSED', message: 'Tournament is already closed.', details: {} },
      });
    }
    const closedAt = command.closedAt ?? new Date().toISOString();
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .update({ status: 'closed' as const, closed_at: closedAt })
      .eq('id', tournament.id)
      .select('id, status, closed_at')
      .single();
    if (error || !data) {
      this.logger.error('Failed to close tournament', error);
      throw this.createInternalErrorException();
    }
    return {
      id: data.id,
      status: data.status as 'closed',
      closedAt: data.closed_at!,
    };
  }

  /** Read frozen roster snapshot for tournament. */
  async listRoster(params: RosterListParams): Promise<{ data: TournamentRosterRowDto[] }> {
    await this.fetchTournamentWithAccess(params.actorUserId, params.tournamentId);
    const { column, ascending } = this.resolveRosterSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('tournament_rosters')
      .select('id, membership_id, slot_no, role, is_playing')
      .eq('tournament_id', params.tournamentId);
    if (params.role) {
      query = query.eq('role', params.role);
    }
    if (params.isPlaying !== undefined) {
      query = query.eq('is_playing', params.isPlaying);
    }
    const { data, error } = await query.order(column, { ascending });
    if (error || !data) {
      this.logger.error('Failed to list roster', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapRosterRow(row)),
    };
  }

  /** Replace roster snapshot atomically (delete all + insert batch). */
  async replaceRoster(params: ReplaceRosterParams): Promise<PutTournamentRosterResponseDto> {
    await this.fetchTournamentWithCaptainAccess(params.actorUserId, params.tournamentId);
    this.validateRosterUniqueness(params.command);
    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('tournament_rosters')
      .delete()
      .eq('tournament_id', params.tournamentId);
    if (deleteError) {
      this.logger.error('Failed to delete existing roster', deleteError);
      throw this.createInternalErrorException();
    }
    const insertRows = params.command.members.map((member) => ({
      tournament_id: params.tournamentId,
      membership_id: member.membershipId,
      slot_no: member.slotNo,
      role: member.role as 'captain' | 'player',
      is_playing: member.isPlaying,
    }));
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournament_rosters')
      .insert(insertRows)
      .select('id, membership_id, slot_no, role, is_playing');
    if (error || !data) {
      if (this.isConflictError(error)) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_SLOT_OR_MEMBERSHIP',
            message: 'Duplicate slot number or membership in roster.',
            details: {},
          },
        });
      }
      if (this.isValidationError(error)) {
        this.logger.warn('Roster validation error', error);
        throw this.createValidationException('Roster data does not satisfy constraints.');
      }
      this.logger.error('Failed to insert roster', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapRosterRow(row)),
    };
  }

  // -------------------------------------------------------------------------
  // Access control helpers
  // -------------------------------------------------------------------------

  private async fetchUserTeamIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)
      .is('left_at', null);
    if (error || !data) {
      this.logger.error('Failed to fetch team ids for user', error);
      throw this.createInternalErrorException();
    }
    return [...new Set(data.map((row) => row.team_id))];
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

  // -------------------------------------------------------------------------
  // Round stats (for tournament detail)
  // -------------------------------------------------------------------------

  private async fetchRoundStats(tournamentId: string): Promise<{ roundCount: number; activeRoundId: string | null }> {
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('rounds')
      .select('id, is_active', { count: 'exact' })
      .eq('tournament_id', tournamentId);
    if (error) {
      this.logger.error('Failed to fetch round stats', error);
      throw this.createInternalErrorException();
    }
    const activeRound = (data ?? []).find((r) => r.is_active);
    return {
      roundCount: count ?? 0,
      activeRoundId: activeRound?.id ?? null,
    };
  }

  // -------------------------------------------------------------------------
  // Validation helpers
  // -------------------------------------------------------------------------

  private validateRosterUniqueness(command: PutTournamentRosterCommand): void {
    const membershipIds = new Set<string>();
    const slotNos = new Set<number>();
    for (const member of command.members) {
      if (membershipIds.has(member.membershipId)) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_SLOT_OR_MEMBERSHIP',
            message: 'Duplicate membership in roster.',
            details: {},
          },
        });
      }
      membershipIds.add(member.membershipId);
      if (slotNos.has(member.slotNo)) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_SLOT_OR_MEMBERSHIP',
            message: 'Duplicate slot number in roster.',
            details: {},
          },
        });
      }
      slotNos.add(member.slotNo);
    }
  }

  // -------------------------------------------------------------------------
  // Sort resolvers
  // -------------------------------------------------------------------------

  private resolveTournamentsSort(sort: TournamentsListParams['sort']): { column: 'name' | 'created_at'; ascending: boolean } {
    if (sort === 'name') return { column: 'name', ascending: true };
    if (sort === '-name') return { column: 'name', ascending: false };
    if (sort === 'createdAt') return { column: 'created_at', ascending: true };
    return { column: 'created_at', ascending: false };
  }

  private resolveRosterSort(sort: RosterListParams['sort']): { column: 'slot_no' | 'role'; ascending: boolean } {
    if (sort === 'slotNo') return { column: 'slot_no', ascending: true };
    if (sort === '-slotNo') return { column: 'slot_no', ascending: false };
    if (sort === 'role') return { column: 'role', ascending: true };
    return { column: 'role', ascending: false };
  }

  // -------------------------------------------------------------------------
  // Row mappers
  // -------------------------------------------------------------------------

  private mapTournamentToSummary(
    row: Pick<TournamentRow, 'id' | 'name' | 'status' | 'team_size' | 'setup_locked_at'>,
  ): TournamentSummaryDto {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      teamSize: row.team_size,
      setupLockedAt: row.setup_locked_at,
    };
  }

  private mapTournamentRow(row: TournamentRow): TournamentDto {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      teamId: row.team_id,
      teamSize: row.team_size,
      setupLockedAt: row.setup_locked_at,
      closedAt: row.closed_at,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      createdByMembershipId: row.created_by_membership_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRosterRow(
    row: Pick<RosterRow, 'id' | 'membership_id' | 'slot_no' | 'role' | 'is_playing'>,
  ): TournamentRosterRowDto {
    return {
      id: row.id,
      membershipId: row.membership_id,
      slotNo: row.slot_no,
      role: row.role,
      isPlaying: row.is_playing,
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

  private createEmptyPaginatedResponse(page: number, pageSize: number): PaginatedListDto<never> {
    return {
      data: [],
      pagination: this.createPagination(page, pageSize, 0),
    };
  }

  private isForbiddenError(error: { code?: string } | null): boolean {
    return error?.code === '42501';
  }

  private isConflictError(error: { code?: string } | null): boolean {
    return error?.code === '23505';
  }

  private isValidationError(error: { code?: string } | null): boolean {
    return error?.code === '23514' || error?.code === '22P02';
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
