import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: ReturnType<typeof createClient>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL') ?? 'https://example.supabase.co';
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      this.configService.get<string>('SUPABASE_ANON_KEY') ??
      'public-anon-key';

    this.client = createClient(url, key);
    this.logger.log('Supabase client initialized');
  }

  getClient(): ReturnType<typeof createClient> {
    return this.client;
  }
}
