import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditEventsService } from './audit-events.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '770e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '880e8400-e29b-41d4-a716-446655440000';

type BuilderResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
  count?: number | null;
};

function createBuilder(options: {
  defaultResponse?: BuilderResponse;
  rangeResponse?: BuilderResponse;
  maybeSingleResponse?: BuilderResponse;
  limitResponse?: BuilderResponse;
} = {}) {
  const builder: Record<string, unknown> = {
    data: options.defaultResponse?.data ?? null,
    error: options.defaultResponse?.error ?? null,
    count: options.defaultResponse?.count ?? null,
  };
  builder.select = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.is = jest.fn().mockReturnValue(builder);
  builder.or = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.maybeSingle = jest
    .fn()
    .mockResolvedValue(options.maybeSingleResponse ?? { data: null, error: null, count: null });
  builder.limit = jest
    .fn()
    .mockResolvedValue(options.limitResponse ?? { data: [], error: null, count: null });
  return builder;
}

describe('AuditEventsService', () => {
  let service: AuditEventsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEventsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<AuditEventsService>(AuditEventsService);
    jest.clearAllMocks();
  });

  it('should reject filter teamId when user is not a member', async () => {
    const membershipsBuilder = createBuilder({
      defaultResponse: { data: [], error: null, count: null },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_memberships') return membershipsBuilder;
      return createBuilder();
    });
    await expect(
      service.listAuditEvents({
        actorUserId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        teamId: mockTeamId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should list with or-filter when user has teams', async () => {
    const membershipsBuilder = createBuilder({
      defaultResponse: { data: [{ team_id: mockTeamId }], error: null, count: null },
    });
    const auditBuilder = createBuilder({
      rangeResponse: {
        data: [
          {
            id: '990e8400-e29b-41d4-a716-446655440000',
            event_type: 'round_locked',
            team_id: mockTeamId,
            tournament_id: mockTournamentId,
            round_id: mockRoundId,
            metadata: {},
            created_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        error: null,
        count: 1,
      },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_memberships') return membershipsBuilder;
      if (table === 'audit_events') return auditBuilder;
      return createBuilder();
    });
    const actual = await service.listAuditEvents({
      actorUserId: mockUserId,
      page: 1,
      pageSize: 20,
      sort: '-createdAt',
    });
    expect(actual.data).toHaveLength(1);
    expect(actual.data[0]?.eventType).toBe('round_locked');
    expect(auditBuilder.or).toHaveBeenCalledWith(
      `team_id.in.(${mockTeamId}),and(team_id.is.null,actor_user_id.eq.${mockUserId})`,
    );
  });

  it('should return 404 when tournament filter references missing tournament', async () => {
    const membershipsBuilder = createBuilder({
      defaultResponse: { data: [{ team_id: mockTeamId }], error: null, count: null },
    });
    const tournamentsBuilder = createBuilder({
      maybeSingleResponse: { data: null, error: null, count: null },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_memberships') return membershipsBuilder;
      if (table === 'tournaments') return tournamentsBuilder;
      return createBuilder();
    });
    await expect(
      service.listAuditEvents({
        actorUserId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        tournamentId: mockTournamentId,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
