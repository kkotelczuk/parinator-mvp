import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createRoundSchema,
  roundsListQuerySchema,
  uuidParamSchema,
  type CreateRoundCommand,
  type PaginatedListDto,
  type RoundDto,
  type RoundSummaryDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

type RoundsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[status]'?: string;
  'filter[isActive]'?: string;
};

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentRoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  /** GET /api/v1/tournaments/:tournamentId/rounds — List rounds in a tournament. */
  @Get(':tournamentId/rounds')
  async listRounds(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Query() query: RoundsQuery,
  ): Promise<PaginatedListDto<RoundSummaryDto>> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const validated = this.validateRoundsListQuery(query);
    return this.roundsService.listRounds({
      actorUserId: userId,
      tournamentId: validatedId,
      page: validated.page,
      pageSize: validated.pageSize,
      sort: validated.sort,
      status: validated.status,
      isActive: validated.isActive,
    });
  }

  /** POST /api/v1/tournaments/:tournamentId/rounds — Create round (captain). */
  @Post(':tournamentId/rounds')
  @HttpCode(HttpStatus.CREATED)
  async createRound(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ): Promise<RoundDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const command = this.validateCreateRound(body);
    return this.roundsService.createRound({
      actorUserId: userId,
      tournamentId: validatedId,
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

  private validateRoundsListQuery(query: RoundsQuery): {
    page: number;
    pageSize: number;
    sort: 'roundNumber' | '-roundNumber' | 'sortOrder' | '-sortOrder' | 'createdAt' | '-createdAt';
    status?: 'editable' | 'locked';
    isActive?: boolean;
  } {
    const result = roundsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      status: query['filter[status]'],
      isActive: query['filter[isActive]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreateRound(body: unknown): CreateRoundCommand {
    const result = createRoundSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      roundNumber: result.data.roundNumber,
      displayName: result.data.displayName,
      mission: result.data.mission,
      deployment: result.data.deployment,
      opponentTeamName: result.data.opponentTeamName ?? null,
      isActive: result.data.isActive,
      sortOrder: result.data.sortOrder,
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
