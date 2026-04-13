import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  generateJoinCodeSchema,
  uuidParamSchema,
  type GenerateJoinCodeCommand,
  type JoinCodeActiveDto,
  type JoinCodeRevokeResponseDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JoinCodesService } from './join-codes.service';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentJoinCodeController {
  constructor(private readonly joinCodesService: JoinCodesService) {}

  /** GET /api/v1/tournaments/:tournamentId/join-code — Read active join code (captain). */
  @Get(':tournamentId/join-code')
  async getActiveJoinCode(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<JoinCodeActiveDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    return this.joinCodesService.getActiveJoinCode(userId, validatedId);
  }

  /** POST /api/v1/tournaments/:tournamentId/join-code/generate — Generate join code (captain). */
  @Post(':tournamentId/join-code/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateJoinCode(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ): Promise<JoinCodeActiveDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const command = this.validateGenerateCommand(body);
    return this.joinCodesService.generateJoinCode({
      actorUserId: userId,
      tournamentId: validatedId,
      command,
    });
  }

  /** POST /api/v1/tournaments/:tournamentId/join-code/revoke — Revoke active code (captain). */
  @Post(':tournamentId/join-code/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeJoinCode(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<JoinCodeRevokeResponseDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    return this.joinCodesService.revokeJoinCode(userId, validatedId);
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

  private validateGenerateCommand(body: unknown): GenerateJoinCodeCommand {
    const result = generateJoinCodeSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { ttlMinutes: result.data.ttlMinutes };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
