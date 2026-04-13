import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTableAssetCommand,
  Database,
  DeletedSuccessDto,
  PaginatedListDto,
  PatchTableAssetCommand,
  TableAssetDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type TableAssetRow = Database['public']['Tables']['table_assets']['Row'];

type TableAssetsListParams = {
  page: number;
  pageSize: number;
  sort: 'label' | '-label' | 'createdAt' | '-createdAt';
  label?: string;
};

type PatchTableAssetParams = {
  actorUserId: string;
  assetId: string;
  command: PatchTableAssetCommand;
};

@Injectable()
export class TableAssetsService {
  private readonly logger = new Logger(TableAssetsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** List table assets with pagination and optional label filter. */
  async listTableAssets(params: TableAssetsListParams): Promise<PaginatedListDto<TableAssetDto>> {
    const offset = (params.page - 1) * params.pageSize;
    const { column, ascending } = this.resolveTableAssetsSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('table_assets')
      .select('id, label, image_url, source_url, source_attribution, created_at', { count: 'exact' });
    if (params.label) {
      query = query.ilike('label', `%${params.label}%`);
    }
    const { data, error, count } = await query
      .order(column, { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list table assets', error);
      throw this.createInternalErrorException();
    }
    const total = count ?? 0;
    return {
      data: data.map((row) => this.mapTableAssetRow(row)),
      pagination: this.createPagination(params.page, params.pageSize, total),
    };
  }

  /** Create table asset (captain only). */
  async createTableAsset(actorUserId: string, command: CreateTableAssetCommand): Promise<TableAssetDto> {
    await this.ensureCaptainAccess(actorUserId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('table_assets')
      .insert({
        label: command.label,
        image_url: command.imageUrl,
        source_url: command.sourceUrl,
        source_attribution: command.sourceAttribution,
      })
      .select('id, label, image_url, source_url, source_attribution, created_at')
      .single();
    if (error || !data) {
      if (this.isValidationViolation(error)) {
        throw this.createValidationException('Table asset data does not satisfy constraints.');
      }
      this.logger.error('Failed to create table asset', error);
      throw this.createInternalErrorException();
    }
    return this.mapTableAssetRow(data);
  }

  /** Update table asset metadata (captain only). */
  async patchTableAsset(params: PatchTableAssetParams): Promise<TableAssetDto> {
    await this.ensureCaptainAccess(params.actorUserId);
    await this.fetchTableAssetOrFail(params.assetId);
    const updatePayload: Database['public']['Tables']['table_assets']['Update'] = {};
    if (params.command.label !== undefined) {
      updatePayload.label = params.command.label;
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('table_assets')
      .update(updatePayload)
      .eq('id', params.assetId)
      .select('id, label, image_url, source_url, source_attribution, created_at')
      .single();
    if (error || !data) {
      if (this.isValidationViolation(error)) {
        throw this.createValidationException('Table asset data does not satisfy constraints.');
      }
      this.logger.error('Failed to patch table asset', error);
      throw this.createInternalErrorException();
    }
    return this.mapTableAssetRow(data);
  }

  /** Delete table asset (captain only). */
  async deleteTableAsset(actorUserId: string, assetId: string): Promise<DeletedSuccessDto> {
    await this.ensureCaptainAccess(actorUserId);
    await this.fetchTableAssetOrFail(assetId);
    const { error } = await this.supabaseService.getClient().from('table_assets').delete().eq('id', assetId);
    if (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException({
          error: { code: 'ASSET_IN_USE', message: 'Table asset is used by one or more tables.', details: {} },
        });
      }
      this.logger.error('Failed to delete table asset', error);
      throw this.createInternalErrorException();
    }
    return { deleted: true };
  }

  private async ensureCaptainAccess(actorUserId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('user_id', actorUserId)
      .eq('role', 'captain')
      .is('left_at', null)
      .limit(1);
    if (error) {
      this.logger.error('Failed to resolve captain access for table assets', error);
      throw this.createInternalErrorException();
    }
    if (!data || data.length === 0) {
      throw this.createForbiddenException();
    }
  }

  private async fetchTableAssetOrFail(assetId: string): Promise<TableAssetRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('table_assets')
      .select('*')
      .eq('id', assetId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch table asset', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'ASSET_NOT_FOUND', message: 'Table asset not found.', details: {} },
      });
    }
    return data;
  }

  private resolveTableAssetsSort(sort: TableAssetsListParams['sort']): { column: string; ascending: boolean } {
    const mapping: Record<string, { column: string; ascending: boolean }> = {
      label: { column: 'label', ascending: true },
      '-label': { column: 'label', ascending: false },
      createdAt: { column: 'created_at', ascending: true },
      '-createdAt': { column: 'created_at', ascending: false },
    };
    return mapping[sort] ?? { column: 'label', ascending: true };
  }

  private mapTableAssetRow(
    row: Pick<TableAssetRow, 'id' | 'label' | 'image_url' | 'source_url' | 'source_attribution' | 'created_at'>,
  ): TableAssetDto {
    return {
      id: row.id,
      label: row.label,
      imageUrl: row.image_url,
      sourceUrl: row.source_url,
      sourceAttribution: row.source_attribution,
      createdAt: row.created_at,
    };
  }

  private createPagination(page: number, pageSize: number, total: number): {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } {
    return {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private isValidationViolation(error: { code?: string } | null): boolean {
    return error?.code === '23514' || error?.code === '22P02';
  }

  private isForeignKeyViolation(error: { code?: string } | null): boolean {
    return error?.code === '23503';
  }

  private createForbiddenException(): ForbiddenException {
    return new ForbiddenException({
      error: { code: 'FORBIDDEN', message: 'Operation is forbidden.', details: {} },
    });
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }

  private createInternalErrorException(): InternalServerErrorException {
    return new InternalServerErrorException({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
    });
  }
}
