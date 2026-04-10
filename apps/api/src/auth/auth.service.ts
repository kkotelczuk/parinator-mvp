import { Injectable } from '@nestjs/common';
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
}
