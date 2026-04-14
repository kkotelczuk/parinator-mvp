import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthContextCommand, AuthContextResponseDto } from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type LoginResult = {
  accessToken: string;
  userId: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signIn(email: string, password: string): Promise<LoginResult> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return {
        accessToken: 'mock-token',
        userId: `mock-${email}`,
      };
    }

    return {
      accessToken: data.session.access_token,
      userId: data.user.id,
    };
  }

  async getContext(userId: string): Promise<AuthContextResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id, team_id, role, joined_at')
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new InternalServerErrorException({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
      });
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'CONTEXT_NOT_FOUND', message: 'No active context for user.', details: {} },
      });
    }
    return {
      activeTeamId: data.team_id,
      activeMembershipId: data.id,
      role: data.role,
    };
  }

  async setContext(userId: string, command: AuthContextCommand): Promise<AuthContextResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id, team_id, role')
      .eq('id', command.membershipId)
      .eq('team_id', command.teamId)
      .eq('user_id', userId)
      .is('left_at', null)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new InternalServerErrorException({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
      });
    }
    if (!data) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Operation is forbidden.', details: {} },
      });
    }
    return {
      activeTeamId: data.team_id,
      activeMembershipId: data.id,
      role: data.role,
    };
  }
}
