import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { JoinCodesRedeemController } from './join-codes-redeem.controller';
import { JoinCodesService } from './join-codes.service';
import { TournamentJoinCodeController } from './tournament-join-code.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [TournamentJoinCodeController, JoinCodesRedeemController],
  providers: [JoinCodesService],
  exports: [JoinCodesService],
})
export class JoinCodesModule {}
