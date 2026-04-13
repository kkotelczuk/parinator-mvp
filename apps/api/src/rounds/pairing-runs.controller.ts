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
  pairingAssignmentsListQuerySchema,
  pairingStepsListQuerySchema,
  patchPairingAssignmentResultSchema,
  patchPairingRunSchema,
  putPairingAssignmentsSchema,
  putPairingStepsSchema,
  uuidParamSchema,
  type DeletedSuccessDto,
  type PaginatedListDto,
  type PairingAssignmentDto,
  type PairingRunDto,
  type PairingRunFinalizeResponseDto,
  type PairingStepDto,
  type PatchPairingAssignmentResultCommand,
  type PatchPairingRunCommand,
  type PutPairingAssignmentsCommand,
  type PutPairingAssignmentsResponseDto,
  type PutPairingStepsCommand,
  type PutPairingStepsResponseDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

type PairingStepsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
};

type PairingAssignmentsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[playerMembershipId]'?: string;
  'filter[opponentPlayerId]'?: string;
};

@Controller()
@UseGuards(JwtAuthGuard)
export class PairingRunsController {
  constructor(private readonly roundsService: RoundsService) {}

  /** PATCH /api/v1/pairing-runs/:pairingRunId — Update run metadata (captain). */
  @Patch('pairing-runs/:pairingRunId')
  async patchPairingRun(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
    @Body() body: unknown,
  ): Promise<PairingRunDto> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    const command = this.validatePatchPairingRun(body);
    return this.roundsService.patchPairingRun({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
      command,
    });
  }

  /** POST /api/v1/pairing-runs/:pairingRunId/finalize — Finalize live run (captain). */
  @Post('pairing-runs/:pairingRunId/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizePairingRun(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
  ): Promise<PairingRunFinalizeResponseDto> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    return this.roundsService.finalizePairingRun({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
    });
  }

  /** DELETE /api/v1/pairing-runs/:pairingRunId — Delete pairing run (captain). */
  @Delete('pairing-runs/:pairingRunId')
  async deletePairingRun(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
  ): Promise<DeletedSuccessDto> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    return this.roundsService.deletePairingRun({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
    });
  }

  /** GET /api/v1/pairing-runs/:pairingRunId/steps — List pairing wizard/live steps. */
  @Get('pairing-runs/:pairingRunId/steps')
  async listPairingSteps(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
    @Query() query: PairingStepsQuery,
  ): Promise<PaginatedListDto<PairingStepDto>> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    const validatedQuery = this.validatePairingStepsListQuery(query);
    return this.roundsService.listPairingSteps({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
    });
  }

  /** PUT /api/v1/pairing-runs/:pairingRunId/steps — Replace full step sequence (captain). */
  @Put('pairing-runs/:pairingRunId/steps')
  async putPairingSteps(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
    @Body() body: unknown,
  ): Promise<PutPairingStepsResponseDto> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    const command = this.validatePutPairingSteps(body);
    return this.roundsService.putPairingSteps({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
      command,
    });
  }

  /** GET /api/v1/pairing-runs/:pairingRunId/assignments — List pairing assignments. */
  @Get('pairing-runs/:pairingRunId/assignments')
  async listPairingAssignments(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
    @Query() query: PairingAssignmentsQuery,
  ): Promise<PaginatedListDto<PairingAssignmentDto>> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    const validatedQuery = this.validatePairingAssignmentsListQuery(query);
    return this.roundsService.listPairingAssignments({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      playerMembershipId: validatedQuery.playerMembershipId,
      opponentPlayerId: validatedQuery.opponentPlayerId,
    });
  }

  /** PUT /api/v1/pairing-runs/:pairingRunId/assignments — Replace run assignments (captain). */
  @Put('pairing-runs/:pairingRunId/assignments')
  async putPairingAssignments(
    @CurrentUserId() userId: string,
    @Param('pairingRunId') pairingRunId: string,
    @Body() body: unknown,
  ): Promise<PutPairingAssignmentsResponseDto> {
    const validatedPairingRunId = this.validateUuidParam(pairingRunId, 'pairingRunId');
    const command = this.validatePutPairingAssignments(body);
    return this.roundsService.putPairingAssignments({
      actorUserId: userId,
      pairingRunId: validatedPairingRunId,
      command,
    });
  }

  /** PATCH /api/v1/pairing-assignments/:assignmentId/result — Update assignment game result (captain). */
  @Patch('pairing-assignments/:assignmentId/result')
  async patchPairingAssignmentResult(
    @CurrentUserId() userId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: unknown,
  ): Promise<PairingAssignmentDto> {
    const validatedAssignmentId = this.validateUuidParam(assignmentId, 'assignmentId');
    const command = this.validatePatchPairingAssignmentResult(body);
    return this.roundsService.patchPairingAssignmentResult({
      actorUserId: userId,
      assignmentId: validatedAssignmentId,
      command,
    });
  }

  private validateUuidParam(value: string, paramName: string): string {
    const result = uuidParamSchema.safeParse(value);
    if (!result.success) {
      throw this.createValidationException(`${paramName} must be a valid UUID.`);
    }
    return result.data;
  }

  private validatePatchPairingRun(body: unknown): PatchPairingRunCommand {
    const result = patchPairingRunSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      name: result.data.name,
      simulationRating: result.data.simulationRating,
      sortOrder: result.data.sortOrder,
    };
  }

  private validatePairingStepsListQuery(query: PairingStepsQuery): {
    page: number;
    pageSize: number;
    sort: 'stepNo' | '-stepNo' | 'createdAt' | '-createdAt';
  } {
    const result = pairingStepsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validatePutPairingSteps(body: unknown): PutPairingStepsCommand {
    const result = putPairingStepsSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      steps: result.data.steps.map((step) => ({
        stepNo: step.stepNo,
        phaseKey: step.phaseKey,
        payload: step.payload,
      })),
    };
  }

  private validatePairingAssignmentsListQuery(query: PairingAssignmentsQuery): {
    page: number;
    pageSize: number;
    sort: 'playerMembershipId' | '-playerMembershipId' | 'opponentPlayerId' | '-opponentPlayerId' | 'createdAt' | '-createdAt';
    playerMembershipId?: string;
    opponentPlayerId?: string;
  } {
    const result = pairingAssignmentsListQuerySchema.safeParse({
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

  private validatePutPairingAssignments(body: unknown): PutPairingAssignmentsCommand {
    const result = putPairingAssignmentsSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      assignments: result.data.assignments.map((assignment) => ({
        playerMembershipId: assignment.playerMembershipId,
        opponentPlayerId: assignment.opponentPlayerId,
        roundTableId: assignment.roundTableId ?? null,
        estimationId: assignment.estimationId ?? null,
      })),
    };
  }

  private validatePatchPairingAssignmentResult(body: unknown): PatchPairingAssignmentResultCommand {
    const result = patchPairingAssignmentResultSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { gameResult: result.data.gameResult };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
