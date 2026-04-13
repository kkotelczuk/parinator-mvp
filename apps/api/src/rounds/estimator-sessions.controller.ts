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
  appendEstimatorEventSchema,
  estimatorEventsListQuerySchema,
  estimatorSessionsListQuerySchema,
  uuidParamSchema,
  type AppendEstimatorEventCommand,
  type CreateEstimatorSessionResponseDto,
  type EstimatorEventDto,
  type EstimatorSessionDto,
  type PaginatedListDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

type EstimatorSessionsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
};

type EstimatorEventsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
};

@Controller()
@UseGuards(JwtAuthGuard)
export class EstimatorSessionsController {
  constructor(private readonly roundsService: RoundsService) {}

  /** POST /api/v1/rounds/:roundId/estimator-sessions — Start estimator session (captain). */
  @Post('rounds/:roundId/estimator-sessions')
  @HttpCode(HttpStatus.CREATED)
  async createEstimatorSession(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
  ): Promise<CreateEstimatorSessionResponseDto> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    return this.roundsService.createEstimatorSession({
      actorUserId: userId,
      roundId: validatedRoundId,
    });
  }

  /** GET /api/v1/rounds/:roundId/estimator-sessions — List estimator sessions. */
  @Get('rounds/:roundId/estimator-sessions')
  async listEstimatorSessions(
    @CurrentUserId() userId: string,
    @Param('roundId') roundId: string,
    @Query() query: EstimatorSessionsQuery,
  ): Promise<PaginatedListDto<EstimatorSessionDto>> {
    const validatedRoundId = this.validateUuidParam(roundId, 'roundId');
    const validatedQuery = this.validateEstimatorSessionsListQuery(query);
    return this.roundsService.listEstimatorSessions({
      actorUserId: userId,
      roundId: validatedRoundId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
    });
  }

  /** GET /api/v1/estimator-sessions/:sessionId/events — List estimator click events. */
  @Get('estimator-sessions/:sessionId/events')
  async listEstimatorEvents(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
    @Query() query: EstimatorEventsQuery,
  ): Promise<PaginatedListDto<EstimatorEventDto>> {
    const validatedSessionId = this.validateUuidParam(sessionId, 'sessionId');
    const validatedQuery = this.validateEstimatorEventsListQuery(query);
    return this.roundsService.listEstimatorEvents({
      actorUserId: userId,
      sessionId: validatedSessionId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      sort: validatedQuery.sort,
    });
  }

  /** POST /api/v1/estimator-sessions/:sessionId/events — Append click event (captain). */
  @Post('estimator-sessions/:sessionId/events')
  @HttpCode(HttpStatus.CREATED)
  async appendEstimatorEvent(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<EstimatorEventDto> {
    const validatedSessionId = this.validateUuidParam(sessionId, 'sessionId');
    const command = this.validateAppendEstimatorEvent(body);
    return this.roundsService.appendEstimatorEvent({
      actorUserId: userId,
      sessionId: validatedSessionId,
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

  private validateEstimatorSessionsListQuery(query: EstimatorSessionsQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt';
  } {
    const result = estimatorSessionsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateEstimatorEventsListQuery(query: EstimatorEventsQuery): {
    page: number;
    pageSize: number;
    sort: 'eventOrder' | '-eventOrder' | 'clickedAt' | '-clickedAt';
  } {
    const result = estimatorEventsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    });
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid query.');
    }
    return result.data;
  }

  private validateAppendEstimatorEvent(body: unknown): AppendEstimatorEventCommand {
    const result = appendEstimatorEventSchema.safeParse(body);
    if (!result.success) {
      throw this.createValidationException(result.error.issues[0]?.message ?? 'Invalid payload.');
    }
    return {
      actorMembershipId: result.data.actorMembershipId,
      tileLabel: result.data.tileLabel,
      tileValue: result.data.tileValue,
      eventOrder: result.data.eventOrder,
      clickedAt: result.data.clickedAt,
    };
  }

  private createValidationException(message: string): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message, details: {} },
    });
  }
}
