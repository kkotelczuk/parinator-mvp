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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  closeTournamentSchema,
  createTournamentSchema,
  patchTournamentSchema,
  putTournamentRosterSchema,
  rosterListQuerySchema,
  tournamentsListQuerySchema,
  uuidParamSchema,
  type CloseTournamentCommand,
  type CreateTournamentCommand,
  type LockSetupResponseDto,
  type PaginatedListDto,
  type PatchTournamentCommand,
  type PutTournamentRosterCommand,
  type PutTournamentRosterResponseDto,
  type TournamentClosedResponseDto,
  type TournamentDetailDto,
  type TournamentDto,
  type TournamentRosterRowDto,
  type TournamentSummaryDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';

type TournamentsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[status]'?: string;
  'filter[teamId]'?: string;
};

type RosterQuery = {
  sort?: string;
  'filter[role]'?: string;
  'filter[isPlaying]'?: string;
};

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  /** GET /api/v1/tournaments — List tournaments visible in active team context. */
  @Get()
  async listTournaments(
    @CurrentUserId() userId: string,
    @Query() query: TournamentsQuery,
  ): Promise<PaginatedListDto<TournamentSummaryDto>> {
    const validated = this.validateTournamentsListQuery(query);
    return this.tournamentsService.listTournaments({
      userId,
      page: validated.page,
      pageSize: validated.pageSize,
      sort: validated.sort,
      status: validated.status,
      teamId: validated.teamId,
    });
  }

  /** POST /api/v1/tournaments — Create tournament (captain). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTournament(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<TournamentDto> {
    const command = this.validateCreateTournament(body);
    return this.tournamentsService.createTournament({ actorUserId: userId, command });
  }

  /** GET /api/v1/tournaments/:tournamentId — Get tournament details. */
  @Get(':tournamentId')
  async getTournament(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<TournamentDetailDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    return this.tournamentsService.getTournamentDetail(userId, validatedId);
  }

  /** PATCH /api/v1/tournaments/:tournamentId — Update tournament fields (captain). */
  @Patch(':tournamentId')
  async patchTournament(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ): Promise<TournamentDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const command = this.validatePatchTournament(body);
    return this.tournamentsService.patchTournament({
      actorUserId: userId,
      tournamentId: validatedId,
      command,
    });
  }

  /** POST /api/v1/tournaments/:tournamentId/lock-setup — Lock setup (captain). */
  @Post(':tournamentId/lock-setup')
  @HttpCode(HttpStatus.OK)
  async lockSetup(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<LockSetupResponseDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    return this.tournamentsService.lockSetup(userId, validatedId);
  }

  /** POST /api/v1/tournaments/:tournamentId/close — Close tournament (captain). */
  @Post(':tournamentId/close')
  @HttpCode(HttpStatus.OK)
  async closeTournament(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ): Promise<TournamentClosedResponseDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const command = this.validateCloseTournament(body);
    return this.tournamentsService.closeTournament(userId, validatedId, command);
  }

  /** GET /api/v1/tournaments/:tournamentId/roster — Read roster snapshot. */
  @Get(':tournamentId/roster')
  async listRoster(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Query() query: RosterQuery,
  ): Promise<{ data: TournamentRosterRowDto[] }> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const validated = this.validateRosterListQuery(query);
    return this.tournamentsService.listRoster({
      actorUserId: userId,
      tournamentId: validatedId,
      sort: validated.sort,
      role: validated.role,
      isPlaying: validated.isPlaying,
    });
  }

  /** PUT /api/v1/tournaments/:tournamentId/roster — Replace roster (captain). */
  @Put(':tournamentId/roster')
  async replaceRoster(
    @CurrentUserId() userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ): Promise<PutTournamentRosterResponseDto> {
    const validatedId = this.validateUuidParam(tournamentId, 'tournamentId');
    const command = this.validatePutRoster(body);
    return this.tournamentsService.replaceRoster({
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

  private validateTournamentsListQuery(query: TournamentsQuery): {
    page: number;
    pageSize: number;
    sort: 'name' | '-name' | 'createdAt' | '-createdAt';
    status?: 'active' | 'closed';
    teamId?: string;
  } {
    const result = tournamentsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      status: query['filter[status]'],
      teamId: query['filter[teamId]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreateTournament(body: unknown): CreateTournamentCommand {
    const result = createTournamentSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      name: result.data.name,
      teamId: result.data.teamId,
      teamSize: result.data.teamSize,
      sourceType: result.data.sourceType,
      sourceUrl: result.data.sourceUrl,
    };
  }

  private validatePatchTournament(body: unknown): PatchTournamentCommand {
    const result = patchTournamentSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      name: result.data.name,
      status: result.data.status,
    };
  }

  private validateCloseTournament(body: unknown): CloseTournamentCommand {
    const result = closeTournamentSchema.safeParse(body ?? {});
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { closedAt: result.data.closedAt };
  }

  private validateRosterListQuery(query: RosterQuery): {
    sort: 'slotNo' | '-slotNo' | 'role' | '-role';
    role?: 'captain' | 'player';
    isPlaying?: boolean;
  } {
    const result = rosterListQuerySchema.safeParse({
      sort: query.sort,
      role: query['filter[role]'],
      isPlaying: query['filter[isPlaying]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validatePutRoster(body: unknown): PutTournamentRosterCommand {
    const result = putTournamentRosterSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { members: result.data.members };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
