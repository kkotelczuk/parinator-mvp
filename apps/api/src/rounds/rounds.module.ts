import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { EstimatorSessionsController } from './estimator-sessions.controller';
import { PairingRunsController } from './pairing-runs.controller';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { TournamentRoundsController } from './tournament-rounds.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [TournamentRoundsController, RoundsController, PairingRunsController, EstimatorSessionsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
