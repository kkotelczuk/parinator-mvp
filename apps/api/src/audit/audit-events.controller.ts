import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { auditEventsListQuerySchema, type AuditEventDto, type PaginatedListDto } from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuditEventsService } from './audit-events.service';

type AuditEventsQuery = {
  page?: string;
  pageSize?: string;
  sort?: string;
  'filter[teamId]'?: string;
  'filter[tournamentId]'?: string;
  'filter[roundId]'?: string;
  'filter[eventType]'?: string;
};

@Controller('audit-events')
@UseGuards(JwtAuthGuard)
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  /** GET /api/v1/audit-events — list audit events for the caller's team context. */
  @Get()
  async listAuditEvents(
    @CurrentUserId() userId: string,
    @Query() query: AuditEventsQuery,
  ): Promise<PaginatedListDto<AuditEventDto>> {
    const validated = this.validateListQuery(query);
    return this.auditEventsService.listAuditEvents({
      actorUserId: userId,
      page: validated.page,
      pageSize: validated.pageSize,
      sort: validated.sort,
      teamId: validated.teamId,
      tournamentId: validated.tournamentId,
      roundId: validated.roundId,
      eventType: validated.eventType,
    });
  }

  private validateListQuery(query: AuditEventsQuery): {
    page: number;
    pageSize: number;
    sort: 'createdAt' | '-createdAt';
    teamId?: string;
    tournamentId?: string;
    roundId?: string;
    eventType?: string;
  } {
    const result = auditEventsListQuerySchema.safeParse({
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      teamId: query['filter[teamId]'],
      tournamentId: query['filter[tournamentId]'],
      roundId: query['filter[roundId]'],
      eventType: query['filter[eventType]'],
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
