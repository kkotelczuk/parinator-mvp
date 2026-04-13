import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuditEventDto, Database, PaginatedListDto } from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type AuditEventRow = Database['public']['Tables']['audit_events']['Row'];
type AuditEventsListParams = {
  actorUserId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt';
  teamId?: string;
  tournamentId?: string;
  roundId?: string;
  eventType?: string;
};

/**
 * Reads business audit rows from `audit_events` with the same visibility rules as RLS:
 * team-scoped events for memberships and personal rows where `team_id` is null.
 */
@Injectable()
export class AuditEventsService {
  private readonly logger = new Logger(AuditEventsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** List audit events visible to the caller (team scope and personal rows per RLS semantics). */
  async listAuditEvents(params: AuditEventsListParams): Promise<PaginatedListDto<AuditEventDto>> {
    const teamIds = await this.fetchUserTeamIds(params.actorUserId);
    if (params.teamId !== undefined) {
      this.ensureTeamScope(teamIds, params.teamId);
    }
    if (params.tournamentId !== undefined) {
      await this.ensureTournamentAccess(params.actorUserId, params.tournamentId, params.teamId);
    }
    if (params.roundId !== undefined) {
      await this.ensureRoundAccess(params.actorUserId, params.roundId, params.teamId);
    }
    const offset = (params.page - 1) * params.pageSize;
    const ascending = params.sort === 'createdAt';
    let query = this.supabaseService
      .getClient()
      .from('audit_events')
      .select('id, event_type, team_id, tournament_id, round_id, metadata, created_at', { count: 'exact' });
    if (params.teamId !== undefined) {
      query = query.eq('team_id', params.teamId);
    } else if (teamIds.length === 0) {
      query = query.is('team_id', null).eq('actor_user_id', params.actorUserId);
    } else {
      const teamPredicate = `team_id.in.(${teamIds.join(',')})`;
      const personalPredicate = `and(team_id.is.null,actor_user_id.eq.${params.actorUserId})`;
      query = query.or(`${teamPredicate},${personalPredicate}`);
    }
    if (params.tournamentId !== undefined) {
      query = query.eq('tournament_id', params.tournamentId);
    }
    if (params.roundId !== undefined) {
      query = query.eq('round_id', params.roundId);
    }
    if (params.eventType !== undefined) {
      query = query.eq('event_type', params.eventType);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list audit events', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapAuditEvent(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  private mapAuditEvent(row: Pick<AuditEventRow, 'id' | 'event_type' | 'team_id' | 'tournament_id' | 'round_id' | 'metadata' | 'created_at'>): AuditEventDto {
    return {
      id: row.id,
      eventType: row.event_type,
      teamId: row.team_id,
      tournamentId: row.tournament_id,
      roundId: row.round_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
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

  private ensureTeamScope(teamIds: readonly string[], requestedTeamId: string): void {
    if (!teamIds.includes(requestedTeamId)) {
      throw this.createForbiddenException();
    }
  }

  private async ensureTournamentAccess(actorUserId: string, tournamentId: string, scopedTeamId?: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .select('team_id')
      .eq('id', tournamentId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch tournament for audit filter', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found.', details: {} },
      });
    }
    await this.ensureTeamMember(actorUserId, data.team_id);
    if (scopedTeamId !== undefined && data.team_id !== scopedTeamId) {
      throw this.createForbiddenException();
    }
  }

  private async ensureRoundAccess(actorUserId: string, roundId: string, scopedTeamId?: string): Promise<void> {
    const { data: roundRow, error: roundError } = await this.supabaseService
      .getClient()
      .from('rounds')
      .select('tournament_id')
      .eq('id', roundId)
      .maybeSingle();
    if (roundError) {
      this.logger.error('Failed to fetch round for audit filter', roundError);
      throw this.createInternalErrorException();
    }
    if (!roundRow) {
      throw new NotFoundException({
        error: { code: 'ROUND_NOT_FOUND', message: 'Round not found.', details: {} },
      });
    }
    const { data: tournamentRow, error: tournamentError } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .select('team_id')
      .eq('id', roundRow.tournament_id)
      .maybeSingle();
    if (tournamentError) {
      this.logger.error('Failed to fetch tournament for round audit filter', tournamentError);
      throw this.createInternalErrorException();
    }
    if (!tournamentRow) {
      throw new NotFoundException({
        error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found.', details: {} },
      });
    }
    await this.ensureTeamMember(actorUserId, tournamentRow.team_id);
    if (scopedTeamId !== undefined && tournamentRow.team_id !== scopedTeamId) {
      throw this.createForbiddenException();
    }
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

  private createForbiddenException(): ForbiddenException {
    return new ForbiddenException({
      error: { code: 'FORBIDDEN', message: 'Operation is forbidden.', details: {} },
    });
  }

  private createInternalErrorException(): InternalServerErrorException {
    return new InternalServerErrorException({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
    });
  }
}
