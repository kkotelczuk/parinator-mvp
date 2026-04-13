import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  patchRoundSchema,
  reorderRoundSchema,
  uuidParamSchema,
  type ActivateRoundResponseDto,
  type LockRoundResponseDto,
  type PatchRoundCommand,
  type ReorderRoundResponseDto,
  type RoundDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

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

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
