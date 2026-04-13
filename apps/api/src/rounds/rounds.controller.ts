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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createOpponentSchema,
  opponentsListQuerySchema,
  patchRoundSchema,
  patchOpponentSchema,
  putRoundTablesSchema,
  reorderRoundSchema,
  tablesListQuerySchema,
  uuidParamSchema,
  type ActivateRoundResponseDto,
  type CreateOpponentCommand,
  type DeletedSuccessDto,
  type LockRoundResponseDto,
  type OpponentPlayerDto,
  type PaginatedListDto,
  type PatchRoundCommand,
  type PatchOpponentCommand,
  type PutRoundTablesCommand,
  type PutRoundTablesResponseDto,
  type ReorderRoundResponseDto,
  type RoundDto,
  type RoundTableDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

type OpponentsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[name]'?: string;
};

type TablesQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[tableNo]'?: string;
};

@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  /** GET /api/v1/rounds/:roundId — Round details. */
  @Get(':roundId')
  async getRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<RoundDto> {
    const validatedId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.getRound(userId, validatedId);
  }

  /** PATCH /api/v1/rounds/:roundId — Update round while editable (captain). */
  @Patch(':roundId')
  async patchRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<RoundDto> {
    const validatedId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validatePatchRound(body);
    return this.roundsService.patchRound({
      actorUserId: userId,
      roundId: validatedId,
      command,
    });
  }

  /** POST /api/v1/rounds/:roundId/activate — Mark round as active (captain). */
  @Post(':roundId/activate')
  @HttpCode(HttpStatus.OK)
  async activateRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<ActivateRoundResponseDto> {
    const validatedId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.activateRound(userId, validatedId);
  }

  /** POST /api/v1/rounds/:roundId/reorder — Update sortOrder (captain). */
  @Post(':roundId/reorder')
  @HttpCode(HttpStatus.OK)
  async reorderRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<ReorderRoundResponseDto> {
    const validatedId = this.validateUuidParam(roundId, 'roundId');
    const validated = this.validateReorderBody(body);
    return this.roundsService.reorderRound(userId, validatedId, validated.sortOrder);
  }

  /** POST /api/v1/rounds/:roundId/lock — Lock round (captain). */
  @Post(':roundId/lock')
  @HttpCode(HttpStatus.OK)
  async lockRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<LockRoundResponseDto> {
    const validatedId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.lockRound(userId, validatedId);
  }

  /** GET /api/v1/rounds/:roundId/opponents — List round opponents. */
  @Get(':roundId/opponents')
  async listOpponents(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: OpponentsQuery,
  ): Promise<PaginatedListDto<OpponentPlayerDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateOpponentsListQuery(query);
    return this.roundsService.listOpponents({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      name: validatedQuery.name,
    });
  }

  /** POST /api/v1/rounds/:roundId/opponents — Create round opponent (captain). */
  @Post(':roundId/opponents')
  @HttpCode(HttpStatus.CREATED)
  async createOpponent(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<OpponentPlayerDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validateCreateOpponent(body);
    return this.roundsService.createOpponent({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
  }

  /** PATCH /api/v1/rounds/:roundId/opponents/:opponentId — Update opponent metadata (captain). */
  @Patch(':roundId/opponents/:opponentId')
  async patchOpponent(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('opponentId') opponentId: string,
    @Body() body: unknown,
  ): Promise<OpponentPlayerDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedOpponentId = this.validateUuidParam(opponentId, 'opponentId');
    const command = this.validatePatchOpponent(body);
    return this.roundsService.patchOpponent({
      actorUserId: userId,
      roundId: validatedRoundId,
      opponentId: validatedOpponentId,
      command,
    });
  }

  /** DELETE /api/v1/rounds/:roundId/opponents/:opponentId — Delete opponent (captain). */
  @Delete(':roundId/opponents/:opponentId')
  async deleteOpponent(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('opponentId') opponentId: string,
  ): Promise<DeletedSuccessDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedOpponentId = this.validateUuidParam(opponentId, 'opponentId');
    return this.roundsService.deleteOpponent({
      actorUserId: userId,
      roundId: validatedRoundId,
      opponentId: validatedOpponentId,
    });
  }

  /** GET /api/v1/rounds/:roundId/tables — List round tables. */
  @Get(':roundId/tables')
  async listTables(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: TablesQuery,
  ): Promise<PaginatedListDto<RoundTableDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateTablesListQuery(query);
    return this.roundsService.listTables({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      tableNo: validatedQuery.tableNo,
    });
  }

  /** PUT /api/v1/rounds/:roundId/tables — Replace full table set (captain). */
  @Put(':roundId/tables')
  async replaceTables(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<PutRoundTablesResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validatePutRoundTables(body);
    return this.roundsService.replaceTables({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
  }

  // -------------------------------------------------------------------------
  // Validation helpers
  // -------------------------------------------------------------------------

  private validateUuidParam(value: string, paramName: string): string {
    const result = uuidParamSchema.safeParse(value);
    if (!result.success) {
      throw this.createValidationException(`${paramName} must be a valid UUID.`);
    }
    return result.data;
  }

  private validatePatchRound(body: unknown): PatchRoundCommand {
    const result = patchRoundSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      displayName: result.data.displayName,
      mission: result.data.mission,
      deployment: result.data.deployment,
      opponentTeamName: result.data.opponentTeamName,
      isActive: result.data.isActive,
      sortOrder: result.data.sortOrder,
    };
  }

  private validateReorderBody(body: unknown): { sortOrder: number } {
    const result = reorderRoundSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { sortOrder: result.data.sortOrder };
  }

  private validateOpponentsListQuery(query: OpponentsQuery): {
    page: number;
    pageSize: number;
    sort: 'name' | '-name' | 'createdAt' | '-createdAt';
    name?: string;
  } {
    const result = opponentsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      name: query['filter[name]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreateOpponent(body: unknown): CreateOpponentCommand {
    const result = createOpponentSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      name: result.data.name,
      faction: result.data.faction ?? null,
      listText: result.data.listText ?? null,
      externalRef: result.data.externalRef ?? null,
      listOpenedRequired: result.data.listOpenedRequired,
    };
  }

  private validatePatchOpponent(body: unknown): PatchOpponentCommand {
    const result = patchOpponentSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      faction: result.data.faction,
      listText: result.data.listText,
    };
  }

  private validateTablesListQuery(query: TablesQuery): {
    page: number;
    pageSize: number;
    sort: 'tableNo' | '-tableNo' | 'createdAt' | '-createdAt';
    tableNo?: number;
  } {
    const result = tablesListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      tableNo: query['filter[tableNo]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validatePutRoundTables(body: unknown): PutRoundTablesCommand {
    const result = putRoundTablesSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      tables: result.data.tables.map((table) => ({
        tableNo: table.tableNo,
        tableName: table.tableName ?? null,
        imageAssetId: table.imageAssetId ?? null,
      })),
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
