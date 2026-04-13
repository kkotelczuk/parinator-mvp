import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AuditEventsController],
  providers: [AuditEventsService],
})
export class AuditModule {}
