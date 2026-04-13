import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  CreateMembershipCommand,
  CreateTeamCommand,
  Database,
  MembershipDto,
  PaginatedListDto,
  PatchMembershipCommand,
  TeamCreatedDto,
  TeamListItemDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type TeamRow = Database['public']['Tables']['teams']['Row'];
type MembershipRow = Database['public']['Tables']['team_memberships']['Row'];

type TeamsListParams = {
  userId: string;
  page: number;
  pageSize: number;
  sort: 'name' | '-name' | 'createdAt' | '-createdAt';
  activeOnly?: boolean;
};

type MembershipsListParams = {
  actorUserId: string;
  teamId: string;
  page: number;
  pageSize: number;
  sort: 'role' | '-role' | 'joinedAt' | '-joinedAt' | 'leftAt' | '-leftAt';
  role?: 'captain' | 'player';
  active?: boolean;
};

type CreateMembershipParams = {
  actorUserId: string;
  teamId: string;
  command: CreateMembershipCommand;
};

type PatchMembershipParams = {
  actorUserId: string;
  teamId: string;
  membershipId: string;
  command: PatchMembershipCommand;
};

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** List teams available for memberships of the authenticated user. */
  async listTeams(params: TeamsListParams): Promise<PaginatedListDto<TeamListItemDto>> {
    const teamIds = await this.fetchUserTeamIds(params.userId, params.activeOnly);
    if (teamIds.length === 0) {
      return this.createEmptyPaginatedResponse(params.page, params.pageSize);
    }
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveTeamsSort(params.sort);
    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('teams')
      .select('id, name, created_at', { count: 'exact' })
      .in('id', teamIds)
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list teams', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapTeamRowToListItem(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Create a new team and auto-assign creator as captain member. */
  async createTeam(userId: string, command: CreateTeamCommand): Promise<TeamCreatedDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('teams')
      .insert({ name: command.name, created_by_user_id: userId })
      .select('id, name, created_by_user_id, created_at')
      .single();
    if (error || !data) {
      if (this.isForbiddenError(error)) {
        throw this.createForbiddenException();
      }
      if (this.isValidationError(error)) {
        this.logger.warn('Team creation validation error', error);
        throw this.createValidationException('Team data does not satisfy constraints.');
      }
      this.logger.error('Failed to create team', error);
      throw this.createInternalErrorException();
    }
    await this.createCaptainMembership(data.id, userId);
    return {
      id: data.id,
      name: data.name,
      createdByUserId: data.created_by_user_id,
      createdAt: data.created_at,
    };
  }

  /** List memberships for a specific team if actor belongs to that team. */
  async listMemberships(params: MembershipsListParams): Promise<PaginatedListDto<MembershipDto>> {
    await this.ensureTeamAccess(params.actorUserId, params.teamId);
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveMembershipsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id, user_id, role, is_playing, joined_at, left_at', { count: 'exact' })
      .eq('team_id', params.teamId);
    if (params.role) {
      query = query.eq('role', params.role);
    }
    if (params.active === true) {
      query = query.is('left_at', null);
    }
    if (params.active === false) {
      query = query.not('left_at', 'is', null);
    }
    const { data, error, count } = await query
      .order(column, { ascending, nullsFirst: !ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list team memberships', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapMembershipRowToDto(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Add new membership in team for captain user. */
  async createMembership(params: CreateMembershipParams): Promise<MembershipDto> {
    await this.ensureCaptainAccess(params.actorUserId, params.teamId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .insert({
        team_id: params.teamId,
        user_id: params.command.userId,
        role: params.command.role,
        is_playing: params.command.isPlaying,
      })
      .select('id, user_id, role, is_playing, joined_at, left_at')
      .single();
    if (error || !data) {
      if (this.isConflictError(error)) {
        throw new ConflictException({
          error: {
            code: 'ACTIVE_MEMBERSHIP_EXISTS',
            message: 'An active membership already exists for this user in team.',
            details: {},
          },
        });
      }
      if (this.isForbiddenError(error)) {
        throw this.createForbiddenException();
      }
      if (this.isValidationError(error)) {
        this.logger.warn('Membership creation validation error', error);
        throw this.createValidationException('Membership data does not satisfy constraints.');
      }
      this.logger.error('Failed to create team membership', error);
      throw this.createInternalErrorException();
    }
    return this.mapMembershipRowToDto(data);
  }

  /** Update team membership fields for captain user. */
  async patchMembership(params: PatchMembershipParams): Promise<MembershipDto> {
    await this.ensureCaptainAccess(params.actorUserId, params.teamId);
    if (params.command.leftAt !== undefined && params.command.leftAt !== null) {
      await this.validateLeftAtNotBeforeJoinedAt(params.teamId, params.membershipId, params.command.leftAt);
    }
    const updatePayload = this.createMembershipUpdatePayload(params.command);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .update(updatePayload)
      .eq('team_id', params.teamId)
      .eq('id', params.membershipId)
      .select('id, user_id, role, is_playing, joined_at, left_at')
      .single();
    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new NotFoundException({
          error: { code: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found.', details: {} },
        });
      }
      if (this.isForbiddenError(error)) {
        throw this.createForbiddenException();
      }
      if (this.isValidationError(error)) {
        this.logger.warn('Membership patch validation error', error);
        throw this.createValidationException('Membership data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch team membership', error);
      throw this.createInternalErrorException();
    }
    return this.mapMembershipRowToDto(data);
  }

  private async createCaptainMembership(teamId: string, userId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .insert({ team_id: teamId, user_id: userId, role: 'captain' as const, is_playing: false });
    if (error) {
      this.logger.error('Failed to create captain membership for new team', error);
      throw this.createInternalErrorException();
    }
  }

  private async validateLeftAtNotBeforeJoinedAt(
    teamId: string,
    membershipId: string,
    leftAt: string,
  ): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('joined_at')
      .eq('team_id', teamId)
      .eq('id', membershipId)
      .single();
    if (error || !data) {
      return;
    }
    if (new Date(leftAt) < new Date(data.joined_at)) {
      throw this.createValidationException('leftAt must not be before joinedAt.');
    }
  }

  private async fetchUserTeamIds(userId: string, activeOnly?: boolean): Promise<string[]> {
    let query = this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId);
    if (activeOnly) {
      query = query.is('left_at', null);
    }
    const { data, error } = await query;
    if (error || !data) {
      this.logger.error('Failed to fetch team ids for user', error);
      throw this.createInternalErrorException();
    }
    return [...new Set(data.map((row) => row.team_id))];
  }

  private async ensureTeamAccess(actorUserId: string, teamId: string): Promise<void> {
    const { data: membershipData, error: membershipError } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', actorUserId)
      .limit(1);
    if (membershipError) {
      this.logger.error('Failed to check team access', membershipError);
      throw this.createInternalErrorException();
    }
    if (membershipData && membershipData.length > 0) {
      return;
    }
    const { data: teamData, error: teamError } = await this.supabaseService
      .getClient()
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .maybeSingle();
    if (teamError) {
      this.logger.error('Failed to check team existence', teamError);
      throw this.createInternalErrorException();
    }
    if (!teamData) {
      throw new NotFoundException({
        error: { code: 'TEAM_NOT_FOUND', message: 'Team not found.', details: {} },
      });
    }
    throw this.createForbiddenException();
  }

  private async ensureCaptainAccess(actorUserId: string, teamId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', actorUserId)
      .eq('role', 'captain')
      .is('left_at', null)
      .limit(1);
    if (error) {
      this.logger.error('Failed to check captain access', error);
      throw this.createInternalErrorException();
    }
    if (!data || data.length === 0) {
      throw this.createForbiddenException();
    }
  }

  private resolveTeamsSort(sort: TeamsListParams['sort']): { column: 'name' | 'created_at'; ascending: boolean } {
    if (sort === 'name') {
      return { column: 'name', ascending: true };
    }
    if (sort === '-name') {
      return { column: 'name', ascending: false };
    }
    if (sort === 'createdAt') {
      return { column: 'created_at', ascending: true };
    }
    return { column: 'created_at', ascending: false };
  }

  private resolveMembershipsSort(
    sort: MembershipsListParams['sort'],
  ): { column: 'role' | 'joined_at' | 'left_at'; ascending: boolean } {
    if (sort === 'role') {
      return { column: 'role', ascending: true };
    }
    if (sort === '-role') {
      return { column: 'role', ascending: false };
    }
    if (sort === 'joinedAt') {
      return { column: 'joined_at', ascending: true };
    }
    if (sort === '-joinedAt') {
      return { column: 'joined_at', ascending: false };
    }
    if (sort === 'leftAt') {
      return { column: 'left_at', ascending: true };
    }
    return { column: 'left_at', ascending: false };
  }

  private mapTeamRowToListItem(row: Pick<TeamRow, 'id' | 'name' | 'created_at'>): TeamListItemDto {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  private mapMembershipRowToDto(row: Pick<MembershipRow, 'id' | 'user_id' | 'role' | 'is_playing' | 'joined_at' | 'left_at'>): MembershipDto {
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      isPlaying: row.is_playing,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
    };
  }

  private createMembershipUpdatePayload(
    command: PatchMembershipCommand,
  ): Database['public']['Tables']['team_memberships']['Update'] {
    const updatePayload: Database['public']['Tables']['team_memberships']['Update'] = {};
    if (command.role !== undefined) {
      updatePayload.role = command.role;
    }
    if (command.isPlaying !== undefined) {
      updatePayload.is_playing = command.isPlaying;
    }
    if (command.leftAt !== undefined) {
      updatePayload.left_at = command.leftAt;
    }
    return updatePayload;
  }

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

  private createEmptyPaginatedResponse(
    page: number,
    pageSize: number,
  ): PaginatedListDto<never> {
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
