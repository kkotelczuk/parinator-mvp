import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  importRunsListQuerySchema,
  uuidParamSchema,
  type ImportRunDetailDto,
  type ImportRunListItemDto,
  type PaginatedListDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ImportsService } from './imports.service';

type ImportRunsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[sourceType]'?: string;
  'filter[status]'?: string;
  'filter[sourceUrl]'?: string;
};

@Controller('import-runs')
@UseGuards(JwtAuthGuard)
export class ImportRunsController {
  constructor(private readonly importsService: ImportsService) {}

  /** GET /api/v1/import-runs — list import diagnostics for captains. */
  @Get()
  async listImportRuns(
    @CurrentUserId() userId: string,
    @Query() query: ImportRunsQuery,
  ): Promise<PaginatedListDto<ImportRunListItemDto>> {
    const validatedQuery = this.validateImportRunsListQuery(query);
    return this.importsService.listImportRuns({
      actorUserId: userId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      sourceType: validatedQuery.sourceType,
      status: validatedQuery.status,
      sourceUrl: validatedQuery.sourceUrl,
    });
  }

  /** GET /api/v1/import-runs/:importRunId — return detailed import diagnostics. */
  @Get(':importRunId')
  async getImportRunDetail(
    @CurrentUserId() userId: string,
    @Param('importRunId') importRunId: string,
  ): Promise<ImportRunDetailDto> {
    const validatedImportRunId = this.validateUuidParam(importRunId, 'importRunId');
    return this.importsService.getImportRunDetail(userId, validatedImportRunId);
  }

  private validateImportRunsListQuery(query: ImportRunsQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt';
    sourceType?: 'champions_hub' | 'best_coast_pairings' | 'manual_fallback';
    status?: 'success' | 'partial_success' | 'failed';
    sourceUrl?: string;
  } {
    const result = importRunsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      sourceType: query['filter[sourceType]'],
      status: query['filter[status]'],
      sourceUrl: query['filter[sourceUrl]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateUuidParam(value: string, paramName: string): string {
    const result = uuidParamSchema.safeParse(value);
    if (!result.success) {
      throw this.createValidationException(`${paramName} must be a valid UUID.`);
    }
    return result.data;
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
