import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ImportRunsController } from './import-runs.controller';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ImportsController, ImportRunsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
