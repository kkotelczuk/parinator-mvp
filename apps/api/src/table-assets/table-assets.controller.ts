import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createTableAssetSchema,
  patchTableAssetSchema,
  tableAssetsListQuerySchema,
  uuidParamSchema,
  type CreateTableAssetCommand,
  type DeletedSuccessDto,
  type PaginatedListDto,
  type PatchTableAssetCommand,
  type TableAssetDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TableAssetsService } from './table-assets.service';

type TableAssetsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[label]'?: string;
};

@Controller('table-assets')
@UseGuards(JwtAuthGuard)
export class TableAssetsController {
  constructor(private readonly tableAssetsService: TableAssetsService) {}

  /** GET /api/v1/table-assets — List table assets with pagination and filters. */
  @Get()
  async listTableAssets(@Query() query: TableAssetsQuery): Promise<PaginatedListDto<TableAssetDto>> {
    const validatedQuery = this.validateTableAssetsListQuery(query);
    return this.tableAssetsService.listTableAssets({
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      label: validatedQuery.label,
    });
  }

  /** POST /api/v1/table-assets — Create table asset (captain). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTableAsset(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<TableAssetDto> {
    const command = this.validateCreateTableAsset(body);
    return this.tableAssetsService.createTableAsset(userId, command);
  }

  /** PATCH /api/v1/table-assets/:assetId — Update table asset metadata (captain). */
  @Patch(':assetId')
  async patchTableAsset(
    @CurrentUserId() userId: string,
    @Param('assetId') assetId: string,
    @Body() body: unknown,
  ): Promise<TableAssetDto> {
    const validatedAssetId = this.validateUuidParam(assetId, 'assetId');
    const command = this.validatePatchTableAsset(body);
    return this.tableAssetsService.patchTableAsset({
      actorUserId: userId,
      assetId: validatedAssetId,
      command,
    });
  }

  /** DELETE /api/v1/table-assets/:assetId — Delete table asset (captain). */
  @Delete(':assetId')
  async deleteTableAsset(
    @CurrentUserId() userId: string,
    @Param('assetId') assetId: string,
  ): Promise<DeletedSuccessDto> {
    const validatedAssetId = this.validateUuidParam(assetId, 'assetId');
    return this.tableAssetsService.deleteTableAsset(userId, validatedAssetId);
  }

  private validateUuidParam(value: string, paramName: string): string {
    const result = uuidParamSchema.safeParse(value);
    if (!result.success) {
      throw this.createValidationException(`${paramName} must be a valid UUID.`);
    }
    return result.data;
  }

  private validateTableAssetsListQuery(query: TableAssetsQuery): {
    page: number;
    pageSize: number;
    sort: 'label' | '-label' | 'createdAt' | '-createdAt';
    label?: string;
  } {
    const result = tableAssetsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      label: query['filter[label]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreateTableAsset(body: unknown): CreateTableAssetCommand {
    const result = createTableAssetSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      label: result.data.label,
      imageUrl: result.data.imageUrl,
      sourceUrl: result.data.sourceUrl,
      sourceAttribution: result.data.sourceAttribution,
    };
  }

  private validatePatchTableAsset(body: unknown): PatchTableAssetCommand {
    const result = patchTableAssetSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      label: result.data.label,
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
