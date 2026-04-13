import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { ImportsService } from './imports.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockImportRunId = '880e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '990e8400-e29b-41d4-a716-446655440000';

type BuilderResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
  count?: number | null;
};

function createBuilder(options: {
  defaultResponse?: BuilderResponse;
  rangeResponse?: BuilderResponse;
  singleResponse?: BuilderResponse;
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
  builder.ilike = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.upsert = jest.fn().mockReturnValue(builder);
  builder.single = jest
    .fn()
    .mockResolvedValue(options.singleResponse ?? { data: null, error: null, count: null });
  builder.maybeSingle = jest
    .fn()
    .mockResolvedValue(options.maybeSingleResponse ?? { data: null, error: null, count: null });
  builder.limit = jest
    .fn()
    .mockResolvedValue(options.limitResponse ?? { data: [], error: null, count: null });
  return builder;
}

const mockCaptainMembershipRow = {
  id: mockMembershipId,
  team_id: mockTeamId,
  user_id: mockUserId,
  role: 'captain',
  is_playing: false,
  joined_at: '2025-01-01T00:00:00.000Z',
  left_at: null,
};

const mockTournamentRow = {
  id: mockTournamentId,
  name: 'WTC Warmup',
  status: 'active',
  team_id: mockTeamId,
  team_size: 5,
  setup_locked_at: null,
  closed_at: null,
  source_type: 'champions_hub',
  source_url: 'https://championshub.gg/events/wtc-warmup',
  created_by_membership_id: mockMembershipId,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('ImportsService', () => {
  let service: ImportsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<ImportsService>(ImportsService);
    jest.clearAllMocks();
  });

  describe('importTournament', () => {
    it('should reuse cached normalized payload and return 200', async () => {
      const captainBuilder = createBuilder({
        maybeSingleResponse: { data: mockCaptainMembershipRow, error: null, count: null },
      });
      const importRunsBuilder = createBuilder({
        maybeSingleResponse: {
          data: {
            id: mockImportRunId,
            source_type: 'champions_hub',
            source_url: 'https://championshub.gg/events/wtc-warmup',
            source_hash: 'cache-hash',
            status: 'success',
            raw_payload: { preview: '<title>WTC Warmup</title>' },
            normalized_payload: { tournamentName: 'Cached Warmup', teamSize: 5, warnings: [], rosterPreview: [] },
            error_message: null,
            created_by_user_id: mockUserId,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const tournamentsBuilder = createBuilder({
        singleResponse: {
          data: { ...mockTournamentRow, name: 'Cached Warmup' },
          error: null,
          count: null,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'import_runs') return importRunsBuilder;
        if (table === 'tournaments') return tournamentsBuilder;
        return createBuilder();
      });
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const actualResult = await service.importTournament({
        actorUserId: mockUserId,
        command: {
          sourceType: 'champions_hub',
          sourceUrl: 'https://championshub.gg/events/wtc-warmup',
          teamId: mockTeamId,
        },
      });
      expect(actualResult.statusCode).toBe(HttpStatus.OK);
      expect(actualResult.body.usedCache).toBe(true);
      expect(actualResult.body.importRunId).toBe(mockImportRunId);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('should fetch source, persist import run, and return 202 when cache is missing', async () => {
      const captainBuilder = createBuilder({
        maybeSingleResponse: { data: mockCaptainMembershipRow, error: null, count: null },
      });
      const importRunsBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
        singleResponse: {
          data: {
            id: mockImportRunId,
            source_type: 'champions_hub',
            source_url: 'https://championshub.gg/events/wtc-warmup',
            source_hash: 'fresh-hash',
            status: 'success',
            raw_payload: { preview: '<title>WTC Warmup 5v5</title>' },
            normalized_payload: { tournamentName: 'WTC Warmup 5v5', teamSize: 5, warnings: [], rosterPreview: [] },
            error_message: null,
            created_by_user_id: mockUserId,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const tournamentsBuilder = createBuilder({
        singleResponse: {
          data: { ...mockTournamentRow, name: 'WTC Warmup 5v5' },
          error: null,
          count: null,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'import_runs') return importRunsBuilder;
        if (table === 'tournaments') return tournamentsBuilder;
        return createBuilder();
      });
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('<html><title>WTC Warmup 5v5</title></html>'),
      } as never);
      const actualResult = await service.importTournament({
        actorUserId: mockUserId,
        command: {
          sourceType: 'champions_hub',
          sourceUrl: 'https://championshub.gg/events/wtc-warmup',
          teamId: mockTeamId,
        },
      });
      expect(actualResult.statusCode).toBe(HttpStatus.ACCEPTED);
      expect(actualResult.body.usedCache).toBe(false);
      expect(actualResult.body.tournamentId).toBe(mockTournamentId);
      fetchSpy.mockRestore();
    });

    it('should throw forbidden when actor is not a captain of the target team', async () => {
      const captainBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation(() => captainBuilder);
      await expect(
        service.importTournament({
          actorUserId: mockUserId,
          command: {
            sourceType: 'champions_hub',
            sourceUrl: 'https://championshub.gg/events/wtc-warmup',
            teamId: mockTeamId,
          },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('importTournamentFallback', () => {
    it('should parse manual fallback text and return partial success with warnings', async () => {
      const captainBuilder = createBuilder({
        maybeSingleResponse: { data: mockCaptainMembershipRow, error: null, count: null },
      });
      const importRunsBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
        singleResponse: {
          data: {
            id: mockImportRunId,
            source_type: 'manual_fallback',
            source_url: 'manual-fallback://raw/hash',
            source_hash: 'hash',
            status: 'partial_success',
            raw_payload: { rawText: 'Tournament: WTC Warmup\n- A\n- B' },
            normalized_payload: {
              tournamentName: 'WTC Warmup',
              teamSize: 5,
              warnings: ['Could not confidently determine team size from pasted text; defaulted to 5 players.'],
              rosterPreview: ['Tournament: WTC Warmup', '- A', '- B'],
            },
            error_message: null,
            created_by_user_id: mockUserId,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const tournamentsBuilder = createBuilder({
        singleResponse: {
          data: { ...mockTournamentRow, source_type: 'manual_fallback', source_url: 'manual-fallback://raw/hash' },
          error: null,
          count: null,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'import_runs') return importRunsBuilder;
        if (table === 'tournaments') return tournamentsBuilder;
        return createBuilder();
      });
      const actualResult = await service.importTournamentFallback({
        actorUserId: mockUserId,
        command: {
          teamId: mockTeamId,
          rawText: 'Tournament: WTC Warmup\n- A\n- B',
        },
      });
      expect(actualResult.statusCode).toBe(HttpStatus.ACCEPTED);
      expect(actualResult.body.status).toBe('partial_success');
      expect(actualResult.body.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('listImportRuns', () => {
    it('should return paginated import runs for captains', async () => {
      const captainBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const importRunsBuilder = createBuilder({
        rangeResponse: {
          data: [
            {
              id: mockImportRunId,
              source_type: 'champions_hub',
              source_url: 'https://championshub.gg/events/wtc-warmup',
              status: 'success',
              created_at: '2025-01-01T00:00:00.000Z',
            },
          ],
          error: null,
          count: 1,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'import_runs') return importRunsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listImportRuns({
        actorUserId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(actualResult.pagination.total).toBe(1);
    });
  });
});
