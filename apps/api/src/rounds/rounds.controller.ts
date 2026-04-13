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
  createPairingRunSchema,
  createOpponentSchema,
  estimationsListQuerySchema,
  hardResetSchema,
  matrixCellsListQuerySchema,
  offlineSyncListQuerySchema,
  offlineSyncPushSchema,
  opponentTeamUpdateSchema,
  opponentsListQuerySchema,
  pairingRunsListQuerySchema,
  patchRoundSchema,
  patchOpponentSchema,
  putRoundTablesSchema,
  reorderRoundSchema,
  roundMatrixQuerySchema,
  tablePreferencesListQuerySchema,
  tablesListQuerySchema,
  upsertMatchupEstimationSchema,
  upsertTablePreferenceSchema,
  uuidParamSchema,
  type ActivateRoundResponseDto,
  type CreateOpponentCommand,
  type DeleteTablePreferenceResponseDto,
  type DeletedSuccessDto,
  type LockRoundResponseDto,
  type HardResetCommand,
  type HardResetResponseDto,
  type MatrixCellDetailDto,
  type MatrixCellDto,
  type MatchupEstimationDto,
  type OfflineSyncPushCommand,
  type OfflineSyncPushResponseDto,
  type OfflineSyncSnapshotDto,
  type OpponentPlayerDto,
  type OpponentTeamUpdateCommand,
  type OpponentTeamUpdateResponseDto,
  type PaginatedListDto,
  type PairingRunDto,
  type PairingRunSummaryDto,
  type CreatePairingRunCommand,
  type FinalPairingsResponseDto,
  type PatchRoundCommand,
  type PatchOpponentCommand,
  type PlayerEstimationStatusDto,
  type PutRoundTablesCommand,
  type PutRoundTablesResponseDto,
  type ReorderRoundResponseDto,
  type RoundDto,
  type RoundMatrixDto,
  type RoundTableDto,
  type TablePreferenceDto,
  type UpsertMatchupEstimationCommand,
  type UpsertTablePreferenceCommand,
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

type EstimationsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[playerMembershipId]'?: string;
  'filter[opponentPlayerId]'?: string;
};

type TablePreferencesQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[playerMembershipId]'?: string;
  'filter[roundTableId]'?: string;
};

type MatrixQuery = {
  'filter[view]'?: string;
};

type MatrixCellsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[playerMembershipId]'?: string;
  'filter[opponentPlayerId]'?: string;
};

type PairingRunsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[mode]'?: string;
  'filter[isFinal]'?: string;
  'filter[simulationRating]'?: string;
};

type OfflineSyncQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
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

  /** POST /api/v1/rounds/:roundId/hard-reset — Explicitly clear round operational data (captain). */
  @Post(':roundId/hard-reset')
  @HttpCode(HttpStatus.OK)
  async hardResetRound(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<HardResetResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validateHardReset(body);
    return this.roundsService.hardResetRound({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
  }

  /** POST /api/v1/rounds/:roundId/opponent-team — Set opponent team and trigger round reset (captain). */
  @Post(':roundId/opponent-team')
  @HttpCode(HttpStatus.OK)
  async updateOpponentTeam(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<OpponentTeamUpdateResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validateOpponentTeamUpdate(body);
    return this.roundsService.updateOpponentTeam({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
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

  /** GET /api/v1/rounds/:roundId/estimations — List matchup estimations with visibility rules. */
  @Get(':roundId/estimations')
  async listEstimations(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: EstimationsQuery,
  ): Promise<PaginatedListDto<MatchupEstimationDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateEstimationsListQuery(query);
    return this.roundsService.listEstimations({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      playerMembershipId: validatedQuery.playerMembershipId,
      opponentPlayerId: validatedQuery.opponentPlayerId,
    });
  }

  /** PUT /api/v1/rounds/:roundId/estimations/:opponentPlayerId — Upsert own estimation row (player). */
  @Put(':roundId/estimations/:opponentPlayerId')
  async upsertEstimation(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('opponentPlayerId') opponentPlayerId: string,
    @Body() body: unknown,
  ): Promise<MatchupEstimationDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedOpponentPlayerId = this.validateUuidParam(opponentPlayerId, 'opponentPlayerId');
    const command = this.validateUpsertEstimation(body);
    return this.roundsService.upsertEstimation({
      actorUserId: userId,
      roundId: validatedRoundId,
      opponentPlayerId: validatedOpponentPlayerId,
      command,
    });
  }

  /** DELETE /api/v1/rounds/:roundId/estimations/:estimationId — Delete estimation row (captain). */
  @Delete(':roundId/estimations/:estimationId')
  async deleteEstimation(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('estimationId') estimationId: string,
  ): Promise<DeletedSuccessDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedEstimationId = this.validateUuidParam(estimationId, 'estimationId');
    return this.roundsService.deleteEstimation({
      actorUserId: userId,
      roundId: validatedRoundId,
      estimationId: validatedEstimationId,
    });
  }

  /** GET /api/v1/rounds/:roundId/table-preferences — List stored table preference rows. */
  @Get(':roundId/table-preferences')
  async listTablePreferences(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: TablePreferencesQuery,
  ): Promise<PaginatedListDto<TablePreferenceDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateTablePreferencesListQuery(query);
    return this.roundsService.listTablePreferences({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      playerMembershipId: validatedQuery.playerMembershipId,
      roundTableId: validatedQuery.roundTableId,
    });
  }

  /** PUT /api/v1/rounds/:roundId/table-preferences/:roundTableId — Upsert own table preference (player). */
  @Put(':roundId/table-preferences/:roundTableId')
  async upsertTablePreference(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('roundTableId') roundTableId: string,
    @Body() body: unknown,
  ): Promise<TablePreferenceDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedRoundTableId = this.validateUuidParam(roundTableId, 'roundTableId');
    const command = this.validateUpsertTablePreference(body);
    return this.roundsService.upsertTablePreference({
      actorUserId: userId,
      roundId: validatedRoundId,
      roundTableId: validatedRoundTableId,
      command,
    });
  }

  /** DELETE /api/v1/rounds/:roundId/table-preferences/:roundTableId — Delete own preference row. */
  @Delete(':roundId/table-preferences/:roundTableId')
  async deleteTablePreference(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('roundTableId') roundTableId: string,
  ): Promise<DeleteTablePreferenceResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedRoundTableId = this.validateUuidParam(roundTableId, 'roundTableId');
    return this.roundsService.deleteTablePreference({
      actorUserId: userId,
      roundId: validatedRoundId,
      roundTableId: validatedRoundTableId,
    });
  }

  /** GET /api/v1/rounds/:roundId/estimation-status/me — Return current player estimation completion status. */
  @Get(':roundId/estimation-status/me')
  async getMyEstimationStatus(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<PlayerEstimationStatusDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.getMyEstimationStatus(userId, validatedRoundId);
  }

  /** GET /api/v1/rounds/:roundId/matrix — Return aggregate matrix payload. */
  @Get(':roundId/matrix')
  async getRoundMatrix(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: MatrixQuery,
  ): Promise<RoundMatrixDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateRoundMatrixQuery(query);
    return this.roundsService.getRoundMatrix({
      actorUserId: userId,
      roundId: validatedRoundId,
      view: validatedQuery.view,
    });
  }

  /** GET /api/v1/rounds/:roundId/matrix/cells — List matrix cells with filters. */
  @Get(':roundId/matrix/cells')
  async listRoundMatrixCells(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: MatrixCellsQuery,
  ): Promise<PaginatedListDto<MatrixCellDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateMatrixCellsListQuery(query);
    return this.roundsService.listRoundMatrixCells({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      playerMembershipId: validatedQuery.playerMembershipId,
      opponentPlayerId: validatedQuery.opponentPlayerId,
    });
  }

  /** GET /api/v1/rounds/:roundId/matrix/cells/:playerMembershipId/:opponentPlayerId — Return modal details for one cell. */
  @Get(':roundId/matrix/cells/:playerMembershipId/:opponentPlayerId')
  async getRoundMatrixCell(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Param('playerMembershipId') playerMembershipId: string,
    @Param('opponentPlayerId') opponentPlayerId: string,
  ): Promise<MatrixCellDetailDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedPlayerMembershipId = this.validateUuidParam(playerMembershipId, 'playerMembershipId');
    const validatedOpponentPlayerId = this.validateUuidParam(opponentPlayerId, 'opponentPlayerId');
    return this.roundsService.getRoundMatrixCell({
      actorUserId: userId,
      roundId: validatedRoundId,
      playerMembershipId: validatedPlayerMembershipId,
      opponentPlayerId: validatedOpponentPlayerId,
    });
  }

  /** GET /api/v1/rounds/:roundId/pairing-runs — List pairing simulation/live runs. */
  @Get(':roundId/pairing-runs')
  async listPairingRuns(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: PairingRunsQuery,
  ): Promise<PaginatedListDto<PairingRunSummaryDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validatePairingRunsListQuery(query);
    return this.roundsService.listPairingRuns({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      mode: validatedQuery.mode,
      isFinal: validatedQuery.isFinal,
      simulationRating: validatedQuery.simulationRating,
    });
  }

  /** POST /api/v1/rounds/:roundId/pairing-runs — Create pairing simulation/live run (captain). */
  @Post(':roundId/pairing-runs')
  @HttpCode(HttpStatus.CREATED)
  async createPairingRun(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<PairingRunDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validateCreatePairingRun(body);
    return this.roundsService.createPairingRun({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
  }

  /** GET /api/v1/rounds/:roundId/final-pairings — Return final live pairings summary. */
  @Get(':roundId/final-pairings')
  async getFinalPairings(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<FinalPairingsResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.getFinalPairings(userId, validatedRoundId);
  }

  /** POST /api/v1/rounds/:roundId/offline-sync — Push offline snapshot using local-wins policy (captain). */
  @Post(':roundId/offline-sync')
  @HttpCode(HttpStatus.OK)
  async pushOfflineSync(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Body() body: unknown,
  ): Promise<OfflineSyncPushResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const command = this.validateOfflineSyncPush(body);
    return this.roundsService.pushOfflineSync({
      actorUserId: userId,
      roundId: validatedRoundId,
      command,
    });
  }

  /** GET /api/v1/rounds/:roundId/offline-sync — List synced snapshots for diagnostics. */
  @Get(':roundId/offline-sync')
  async listOfflineSyncSnapshots(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: OfflineSyncQuery,
  ): Promise<PaginatedListDto<OfflineSyncSnapshotDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateOfflineSyncListQuery(query);
    return this.roundsService.listOfflineSyncSnapshots({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
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

  private validateHardReset(body: unknown): HardResetCommand {
    const result = hardResetSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { reason: result.data.reason };
  }

  private validateOpponentTeamUpdate(body: unknown): OpponentTeamUpdateCommand {
    const result = opponentTeamUpdateSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { opponentTeamName: result.data.opponentTeamName };
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

  private validateEstimationsListQuery(query: EstimationsQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt';
    playerMembershipId?: string;
    opponentPlayerId?: string;
  } {
    const result = estimationsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      playerMembershipId: query['filter[playerMembershipId]'],
      opponentPlayerId: query['filter[opponentPlayerId]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateUpsertEstimation(body: unknown): UpsertMatchupEstimationCommand {
    const result = upsertMatchupEstimationSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      listOpenedAt: result.data.listOpenedAt,
      hasFirstTurnImpact: result.data.hasFirstTurnImpact,
      scoreSingle: result.data.scoreSingle,
      scoreGoFirst: result.data.scoreGoFirst,
      scoreGoSecond: result.data.scoreGoSecond,
      comment: result.data.comment ?? null,
    };
  }

  private validateTablePreferencesListQuery(query: TablePreferencesQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt';
    playerMembershipId?: string;
    roundTableId?: string;
  } {
    const result = tablePreferencesListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      playerMembershipId: query['filter[playerMembershipId]'],
      roundTableId: query['filter[roundTableId]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateUpsertTablePreference(body: unknown): UpsertTablePreferenceCommand {
    const result = upsertTablePreferenceSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { preference: result.data.preference };
  }

  private validateRoundMatrixQuery(query: MatrixQuery): { view: 'captain' | 'player' } {
    const result = roundMatrixQuerySchema.safeParse({ view: query['filter[view]'] });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateMatrixCellsListQuery(query: MatrixCellsQuery): {
    page: number;
    pageSize: number;
    sort: 'playerMembershipId' | '-playerMembershipId' | 'opponentPlayerId' | '-opponentPlayerId';
    playerMembershipId?: string;
    opponentPlayerId?: string;
  } {
    const result = matrixCellsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      playerMembershipId: query['filter[playerMembershipId]'],
      opponentPlayerId: query['filter[opponentPlayerId]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validatePairingRunsListQuery(query: PairingRunsQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt' | 'sortOrder' | '-sortOrder' | 'finalizedAt' | '-finalizedAt';
    mode?: 'simulation' | 'live';
    isFinal?: boolean;
    simulationRating?: 'better' | 'worse' | 'neutral';
  } {
    const result = pairingRunsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      mode: query['filter[mode]'],
      isFinal: query['filter[isFinal]'],
      simulationRating: query['filter[simulationRating]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreatePairingRun(body: unknown): CreatePairingRunCommand {
    const result = createPairingRunSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      mode: result.data.mode,
      name: result.data.name ?? null,
      simulationRating: result.data.simulationRating ?? null,
      sortOrder: result.data.sortOrder ?? null,
    };
  }

  private validateOfflineSyncPush(body: unknown): OfflineSyncPushCommand {
    const result = offlineSyncPushSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      clientSnapshotId: result.data.clientSnapshotId,
      payload: result.data.payload,
    };
  }

  private validateOfflineSyncListQuery(query: OfflineSyncQuery): {
    page: number;
    pageSize: number;
    sort: 'syncedAt' | '-syncedAt';
  } {
    const result = offlineSyncListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }


  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
