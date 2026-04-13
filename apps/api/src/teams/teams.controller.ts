import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createMembershipSchema,
  createTeamSchema,
  membershipsListQuerySchema,
  patchMembershipSchema,
  teamsListQuerySchema,
  uuidParamSchema,
  type CreateMembershipCommand,
  type CreateTeamCommand,
  type MembershipDto,
  type PaginatedListDto,
  type PatchMembershipCommand,
  type TeamCreatedDto,
  type TeamListItemDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';

type TeamsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[activeOnly]'?: string;
};

type MembershipsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[role]'?: string;
  'filter[active]'?: string;
};

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /** GET /api/v1/teams — List teams for current user memberships. */
  @Get()
  async listTeams(
    @CurrentUserId() userId: string,
    @Query() query: TeamsQuery,
  ): Promise<PaginatedListDto<TeamListItemDto>> {
    const validatedQuery = this.validateTeamsListQuery(query);
    return this.teamsService.listTeams({
      userId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      activeOnly: validatedQuery.activeOnly,
    });
  }

  /** POST /api/v1/teams — Create new team. */
  @Post()
  async createTeam(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<TeamCreatedDto> {
    const command = this.validateCreateTeam(body);
    return this.teamsService.createTeam(userId, command);
  }

  /** GET /api/v1/teams/:teamId/memberships — List team memberships. */
  @Get(':teamId/memberships')
  async listMemberships(
    @CurrentUserId() userId: string,
    @Param('teamId') teamId: string,
    @Query() query: MembershipsQuery,
  ): Promise<PaginatedListDto<MembershipDto>> {
    const validatedTeamId = this.validateUuidParam(teamId, 'teamId');
    const validatedQuery = this.validateMembershipsListQuery(query);
    return this.teamsService.listMemberships({
      actorUserId: userId,
      teamId: validatedTeamId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
      role: validatedQuery.role,
      active: validatedQuery.active,
    });
  }

  /** POST /api/v1/teams/:teamId/memberships — Add membership (captain). */
  @Post(':teamId/memberships')
  async createMembership(
    @CurrentUserId() userId: string,
    @Param('teamId') teamId: string,
    @Body() body: unknown,
  ): Promise<MembershipDto> {
    const validatedTeamId = this.validateUuidParam(teamId, 'teamId');
    const command = this.validateCreateMembership(body);
    return this.teamsService.createMembership({ actorUserId: userId, teamId: validatedTeamId, command });
  }

  /** PATCH /api/v1/teams/:teamId/memberships/:membershipId — Patch membership (captain). */
  @Patch(':teamId/memberships/:membershipId')
  async patchMembership(
    @CurrentUserId() userId: string,
    @Param('teamId') teamId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ): Promise<MembershipDto> {
    const validatedTeamId = this.validateUuidParam(teamId, 'teamId');
    const validatedMembershipId = this.validateUuidParam(membershipId, 'membershipId');
    const command = this.validatePatchMembership(body);
    return this.teamsService.patchMembership({
      actorUserId: userId,
      teamId: validatedTeamId,
      membershipId: validatedMembershipId,
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

  private validateTeamsListQuery(query: TeamsQuery): {
    page: number;
    pageSize: number;
    sort: 'name' | '-name' | 'createdAt' | '-createdAt';
    activeOnly?: boolean;
  } {
    const result = teamsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      activeOnly: query['filter[activeOnly]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateMembershipsListQuery(query: MembershipsQuery): {
    page: number;
    pageSize: number;
    sort: 'role' | '-role' | 'joinedAt' | '-joinedAt' | 'leftAt' | '-leftAt';
    role?: 'captain' | 'player';
    active?: boolean;
  } {
    const result = membershipsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      role: query['filter[role]'],
      active: query['filter[active]'],
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateCreateTeam(body: unknown): CreateTeamCommand {
    const result = createTeamSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return { name: result.data.name };
  }

  private validateCreateMembership(body: unknown): CreateMembershipCommand {
    const result = createMembershipSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      userId: result.data.userId,
      role: result.data.role,
      isPlaying: result.data.isPlaying,
    };
  }

  private validatePatchMembership(body: unknown): PatchMembershipCommand {
    const result = patchMembershipSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      role: result.data.role,
      isPlaying: result.data.isPlaying,
      leftAt: result.data.leftAt,
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
