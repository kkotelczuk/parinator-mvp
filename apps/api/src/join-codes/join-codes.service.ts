import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type {
  Database,
  GenerateJoinCodeCommand,
  JoinCodeActiveDto,
  JoinCodeRedeemResponseDto,
  JoinCodeRevokeResponseDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type JoinCodeRow = Database['public']['Tables']['join_codes']['Row'];

type GenerateParams = {
  actorUserId: string;
  tournamentId: string;
  command: GenerateJoinCodeCommand;
};

type RedeemParams = {
  actorUserId: string;
  code: string;
};

const MAX_CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class JoinCodesService {
  private readonly logger = new Logger(JoinCodesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Read the active join code for a tournament (captain only). */
  async getActiveJoinCode(actorUserId: string, tournamentId: string): Promise<JoinCodeActiveDto> {
    await this.ensureCaptainAccess(actorUserId, tournamentId);
    const code = await this.findActiveCode(tournamentId);
    if (!code) {
      throw new NotFoundException({
        error: { code: 'ACTIVE_CODE_NOT_FOUND', message: 'No active join code found for this tournament.', details: {} },
      });
    }
    if (new Date(code.expires_at) <= new Date()) {
      await this.expireCode(code.id);
      throw new NotFoundException({
        error: { code: 'ACTIVE_CODE_NOT_FOUND', message: 'No active join code found for this tournament.', details: {} },
      });
    }
    return this.mapJoinCodeRow(code);
  }

  /** Generate or re-generate an active join code for a tournament (captain only). */
  async generateJoinCode(params: GenerateParams): Promise<JoinCodeActiveDto> {
    const tournament = await this.fetchTournamentOrFail(params.tournamentId);
    if (tournament.status !== 'active') {
      throw new ConflictException({
        error: { code: 'TOURNAMENT_NOT_ACTIVE', message: 'Tournament is not active.', details: {} },
      });
    }
    const membershipId = await this.resolveCaptainMembership(params.actorUserId, tournament.team_id);
    await this.deactivateExistingCodes(params.tournamentId);
    const expiresAt = new Date(Date.now() + params.command.ttlMinutes * 60_000).toISOString();
    const remainingUses = tournament.team_size;
    const insertedCode = await this.insertCodeWithRetry({
      teamId: tournament.team_id,
      tournamentId: params.tournamentId,
      generatedByMembershipId: membershipId,
      remainingUses,
      expiresAt,
    });
    return this.mapJoinCodeRow(insertedCode);
  }

  /** Revoke the currently active join code (captain only). */
  async revokeJoinCode(actorUserId: string, tournamentId: string): Promise<JoinCodeRevokeResponseDto> {
    await this.ensureCaptainAccess(actorUserId, tournamentId);
    const code = await this.findActiveCode(tournamentId);
    if (!code) {
      throw new NotFoundException({
        error: { code: 'ACTIVE_CODE_NOT_FOUND', message: 'No active join code found for this tournament.', details: {} },
      });
    }
    const now = new Date().toISOString();
    const { error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .update({ status: 'revoked' as const, revoked_at: now })
      .eq('id', code.id);
    if (error) {
      this.logger.error('Failed to revoke join code', error);
      throw this.createInternalErrorException();
    }
    return { revoked: true };
  }

  /** Redeem a join code to join the team/tournament (any authenticated user). */
  async redeemJoinCode(params: RedeemParams): Promise<JoinCodeRedeemResponseDto> {
    const code = await this.findCodeByValue(params.code);
    if (!code) {
      throw new NotFoundException({
        error: { code: 'CODE_NOT_FOUND', message: 'Join code not found.', details: {} },
      });
    }
    this.assertCodeUsable(code);
    const tournament = await this.fetchTournamentOrFail(code.tournament_id);
    await this.assertNotAlreadyMember(params.actorUserId, code.team_id);
    await this.assertTeamNotFull(code.team_id, tournament.team_size);
    const membershipId = await this.createPlayerMembership(params.actorUserId, code.team_id);
    await this.decrementRemainingUses(code.id, code.remaining_uses);
    return {
      joined: true,
      membershipId,
      teamId: code.team_id,
      tournamentId: code.tournament_id,
    };
  }

  // -------------------------------------------------------------------------
  // Access control helpers
  // -------------------------------------------------------------------------

  private async ensureCaptainAccess(actorUserId: string, tournamentId: string): Promise<void> {
    const tournament = await this.fetchTournamentOrFail(tournamentId);
    await this.resolveCaptainMembership(actorUserId, tournament.team_id);
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

  private async fetchTournamentOrFail(
    tournamentId: string,
  ): Promise<Database['public']['Tables']['tournaments']['Row']> {
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

  // -------------------------------------------------------------------------
  // Join code DB helpers
  // -------------------------------------------------------------------------

  private async findActiveCode(tournamentId: string): Promise<JoinCodeRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to find active join code', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async findCodeByValue(code: string): Promise<JoinCodeRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to find join code by value', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async expireCode(codeId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .update({ status: 'expired' as const })
      .eq('id', codeId);
    if (error) {
      this.logger.warn('Failed to mark expired join code', error);
    }
  }

  private async deactivateExistingCodes(tournamentId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .update({ status: 'revoked' as const, revoked_at: new Date().toISOString() })
      .eq('tournament_id', tournamentId)
      .eq('status', 'active');
    if (error) {
      this.logger.error('Failed to deactivate existing join codes', error);
      throw this.createInternalErrorException();
    }
  }

  private async insertCodeWithRetry(params: {
    teamId: string;
    tournamentId: string;
    generatedByMembershipId: string;
    remainingUses: number;
    expiresAt: string;
  }): Promise<JoinCodeRow> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = this.generateRandomCode();
      const { data, error } = await this.supabaseService
        .getClient()
        .from('join_codes')
        .insert({
          team_id: params.teamId,
          tournament_id: params.tournamentId,
          code,
          status: 'active' as const,
          remaining_uses: params.remainingUses,
          generated_by_membership_id: params.generatedByMembershipId,
          expires_at: params.expiresAt,
        })
        .select('*')
        .single();
      if (data) {
        return data;
      }
      if (error && this.isUniqueViolation(error)) {
        continue;
      }
      if (error) {
        this.logger.error('Failed to insert join code', error);
        throw this.createInternalErrorException();
      }
    }
    this.logger.error('Failed to generate unique join code after max attempts');
    throw this.createInternalErrorException();
  }

  private async decrementRemainingUses(codeId: string, currentUses: number): Promise<void> {
    const newUses = currentUses - 1;
    const update: Partial<Database['public']['Tables']['join_codes']['Update']> = {
      remaining_uses: newUses,
    };
    if (newUses <= 0) {
      update.status = 'exhausted' as const;
    }
    const { error } = await this.supabaseService
      .getClient()
      .from('join_codes')
      .update(update)
      .eq('id', codeId)
      .gt('remaining_uses', 0);
    if (error) {
      this.logger.error('Failed to decrement remaining uses', error);
      throw this.createInternalErrorException();
    }
  }

  // -------------------------------------------------------------------------
  // Redeem helpers
  // -------------------------------------------------------------------------

  private assertCodeUsable(code: JoinCodeRow): void {
    const isExpired = new Date(code.expires_at) <= new Date();
    const isExhausted = code.remaining_uses <= 0;
    if (isExpired || isExhausted) {
      if (isExpired) {
        void this.expireCode(code.id);
      }
      throw new ConflictException({
        error: { code: 'CODE_EXPIRED_OR_EXHAUSTED', message: 'Join code has expired or all uses have been consumed.', details: {} },
      });
    }
  }

  private async assertNotAlreadyMember(userId: string, teamId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to check existing membership', error);
      throw this.createInternalErrorException();
    }
    if (data) {
      throw new ConflictException({
        error: { code: 'ACTIVE_MEMBERSHIP_EXISTS', message: 'User already has an active membership in this team.', details: {} },
      });
    }
  }

  private async assertTeamNotFull(teamId: string, teamSize: number): Promise<void> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('left_at', null);
    if (error) {
      this.logger.error('Failed to count active memberships', error);
      throw this.createInternalErrorException();
    }
    if ((count ?? 0) >= teamSize) {
      throw new ConflictException({
        error: { code: 'TEAM_FULL', message: 'Team has reached its maximum size.', details: {} },
      });
    }
  }

  private async createPlayerMembership(userId: string, teamId: string): Promise<string> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: 'player' as const,
        is_playing: true,
      })
      .select('id')
      .single();
    if (error || !data) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: { code: 'ACTIVE_MEMBERSHIP_EXISTS', message: 'User already has an active membership in this team.', details: {} },
        });
      }
      this.logger.error('Failed to create player membership', error);
      throw this.createInternalErrorException();
    }
    return data.id;
  }

  // -------------------------------------------------------------------------
  // Code generation
  // -------------------------------------------------------------------------

  private generateRandomCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  // -------------------------------------------------------------------------
  // Row mapper
  // -------------------------------------------------------------------------

  private mapJoinCodeRow(row: JoinCodeRow): JoinCodeActiveDto {
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      remainingUses: row.remaining_uses,
      expiresAt: row.expires_at,
    };
  }

  // -------------------------------------------------------------------------
  // Error helpers
  // -------------------------------------------------------------------------

  private isUniqueViolation(error: { code?: string } | null): boolean {
    return error?.code === '23505';
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
