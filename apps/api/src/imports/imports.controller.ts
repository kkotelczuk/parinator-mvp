import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type {
  ImportTournamentAcceptedResponseDto,
  ImportTournamentCommand,
  ImportTournamentFallbackCommand,
  ImportTournamentFallbackResponseDto,
} from '@parinator/schema';
import {
  importTournamentFallbackSchema,
  importTournamentSchema,
} from '@parinator/schema';
import type { Response } from 'express';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ImportsService } from './imports.service';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /** POST /api/v1/imports/tournaments — import tournament from supported source URL. */
  @Post('tournaments')
  async importTournament(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ImportTournamentAcceptedResponseDto> {
    const command = this.validateImportTournament(body);
    const result = await this.importsService.importTournament({
      actorUserId: userId,
      command,
    });
    response.status(result.statusCode);
    return result.body;
  }

  /** POST /api/v1/imports/tournaments/fallback — import tournament from manually pasted text. */
  @Post('tournaments/fallback')
  async importTournamentFallback(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ImportTournamentFallbackResponseDto> {
    const command = this.validateFallbackImport(body);
    const result = await this.importsService.importTournamentFallback({
      actorUserId: userId,
      command,
    });
    response.status(result.statusCode ?? HttpStatus.ACCEPTED);
    return result.body;
  }

  private validateImportTournament(body: unknown): ImportTournamentCommand {
    const result = importTournamentSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      sourceType: result.data.sourceType,
      sourceUrl: result.data.sourceUrl,
      teamId: result.data.teamId,
    };
  }

  private validateFallbackImport(body: unknown): ImportTournamentFallbackCommand {
    const result = importTournamentFallbackSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      teamId: result.data.teamId,
      sourceUrl: result.data.sourceUrl,
      rawText: result.data.rawText,
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
