import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { TableAssetsController } from './table-assets.controller';
import { TableAssetsService } from './table-assets.service';

@Module({
  imports: [SupabaseModule],
  controllers: [TableAssetsController],
  providers: [TableAssetsService],
  exports: [TableAssetsService],
})
export class TableAssetsModule {}
