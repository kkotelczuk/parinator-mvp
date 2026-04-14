import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AvailableMembershipDto, UserMeDto } from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

const USER_COLUMNS = 'id, email, display_name, is_active, created_at, updated_at' as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Fetch the authenticated user's own profile. */
  async findById(userId: string): Promise<UserMeDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', userId)
      .single();
    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new NotFoundException({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.', details: {} },
        });
      }
      this.logger.error('Failed to fetch user', error);
      throw new InternalServerErrorException({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
      });
    }
    return this.mapRowToDto(data);
  }

  /** List active team memberships for the authenticated user (for context switching). */
  async listAvailableMemberships(userId: string): Promise<AvailableMembershipDto[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id, team_id, role, is_playing')
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: true });
    if (error || !data) {
      this.logger.error('Failed to list memberships for user', error);
      throw new InternalServerErrorException({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
      });
    }
    return data.map((row) => ({
      membershipId: row.id,
      teamId: row.team_id,
      role: row.role,
      isPlaying: row.is_playing,
    }));
  }

  /** Update the authenticated user's display name and return updated profile. */
  async updateDisplayName(userId: string, displayName: string): Promise<UserMeDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select(USER_COLUMNS)
      .single();
    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new NotFoundException({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.', details: {} },
        });
      }
      this.logger.error('Failed to update user', error);
      throw new InternalServerErrorException({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
      });
    }
    return this.mapRowToDto(data);
  }

  private mapRowToDto(row: {
    id: string;
    email: string;
    display_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }): UserMeDto {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
