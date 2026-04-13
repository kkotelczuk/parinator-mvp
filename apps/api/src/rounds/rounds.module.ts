import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PairingRunsController } from './pairing-runs.controller';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { TournamentRoundsController } from './tournament-rounds.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [TournamentRoundsController, RoundsController, PairingRunsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
