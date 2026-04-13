import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TournamentsService } from './tournaments.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';

type BuilderResponse = { data: unknown; error: { code?: string; message?: string } | null; count?: number | null };

function createBuilder(options: {
  defaultResponse?: BuilderResponse;
  rangeResponse?: BuilderResponse;
  singleResponse?: BuilderResponse;
  maybeSingleResponse?: BuilderResponse;
  limitResponse?: BuilderResponse;
  deleteResponse?: BuilderResponse;
} = {}) {
  const builder: Record<string, unknown> = {
    data: options.defaultResponse?.data ?? null,
    error: options.defaultResponse?.error ?? null,
    count: options.defaultResponse?.count ?? null,
  };
  builder.select = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.in = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
  builder.delete = jest.fn().mockReturnValue(
    options.deleteResponse
      ? { ...builder, ...(options.deleteResponse as object) }
      : builder,
  );
  builder.single = jest
    .fn()
    .mockResolvedValue(options.singleResponse ?? { data: null, error: null, count: null });
  builder.maybeSingle = jest
    .fn()
    .mockResolvedValue(options.maybeSingleResponse ?? { data: null, error: null, count: null });
  builder.limit = jest
    .fn()
    .mockResolvedValue(options.limitResponse ?? { data: [], error: null, count: null });
  builder.is = jest.fn().mockReturnValue(builder);
  builder.not = jest.fn().mockReturnValue(builder);
  return builder;
}

const mockTournamentRow = {
  id: mockTournamentId,
  name: 'WTC Warmup',
  status: 'active',
  team_id: mockTeamId,
  team_size: 5,
  setup_locked_at: null,
  closed_at: null,
  source_type: null,
  source_url: null,
  created_by_membership_id: mockMembershipId,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('TournamentsService', () => {
  let service: TournamentsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<TournamentsService>(TournamentsService);
  });

  describe('listTournaments', () => {
    it('should return paginated tournaments list', async () => {
      const membershipsBuilder = createBuilder({
        defaultResponse: { data: [{ team_id: mockTeamId }], error: null, count: null },
      });
      const tournamentsBuilder = createBuilder({
        rangeResponse: {
          data: [{
            id: mockTournamentId,
            name: 'WTC Warmup',
            status: 'active',
            team_size: 5,
            setup_locked_at: null,
          }],
          error: null,
          count: 1,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return membershipsBuilder;
        if (table === 'tournaments') return tournamentsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listTournaments({
        userId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
      });
      expect(actualResult.data).toEqual([{
        id: mockTournamentId,
        name: 'WTC Warmup',
        status: 'active',
        teamSize: 5,
        setupLockedAt: null,
      }]);
      expect(actualResult.pagination.total).toBe(1);
    });

    it('should return empty list when user has no team memberships', async () => {
      const membershipsBuilder = createBuilder({
        defaultResponse: { data: [], error: null, count: null },
      });
      mockFrom.mockImplementation(() => membershipsBuilder);
      const actualResult = await service.listTournaments({
        userId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
      });
      expect(actualResult.data).toEqual([]);
      expect(actualResult.pagination.total).toBe(0);
    });
  });

  describe('createTournament', () => {
    it('should create tournament and return DTO', async () => {
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const insertBuilder = createBuilder({
        singleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'tournaments') return insertBuilder;
        return createBuilder();
      });
      const actualResult = await service.createTournament({
        actorUserId: mockUserId,
        command: { name: 'WTC Warmup', teamId: mockTeamId, teamSize: 5 },
      });
      expect(actualResult.id).toBe(mockTournamentId);
      expect(actualResult.name).toBe('WTC Warmup');
      expect(actualResult.teamSize).toBe(5);
    });

    it('should throw ForbiddenException when actor is not captain', async () => {
      const captainBuilder = createBuilder({
        singleResponse: { data: null, error: { code: 'PGRST116' }, count: null },
      });
      mockFrom.mockImplementation(() => captainBuilder);
      await expect(
        service.createTournament({
          actorUserId: mockUserId,
          command: { name: 'Test', teamId: mockTeamId, teamSize: 5 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTournamentDetail', () => {
    it('should return tournament with round stats', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const roundsBuilder = createBuilder({
        defaultResponse: {
          data: [
            { id: 'round-1', is_active: false },
            { id: 'round-2', is_active: true },
          ],
          error: null,
          count: 2,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return memberBuilder;
        if (table === 'rounds') return roundsBuilder;
        return createBuilder();
      });
      const actualResult = await service.getTournamentDetail(mockUserId, mockTournamentId);
      expect(actualResult.roundCount).toBe(2);
      expect(actualResult.activeRoundId).toBe('round-2');
    });

    it('should throw NotFoundException when tournament does not exist', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation(() => tournamentBuilder);
      await expect(
        service.getTournamentDetail(mockUserId, mockTournamentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('lockSetup', () => {
    it('should throw ConflictException when setup is already locked', async () => {
      const lockedRow = { ...mockTournamentRow, setup_locked_at: '2025-01-15T00:00:00.000Z' };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: lockedRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.lockSetup(mockUserId, mockTournamentId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('closeTournament', () => {
    it('should throw ConflictException when tournament is already closed', async () => {
      const closedRow = { ...mockTournamentRow, status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: closedRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.closeTournament(mockUserId, mockTournamentId, {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('replaceRoster', () => {
    it('should throw ConflictException for duplicate membershipId in input', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.replaceRoster({
          actorUserId: mockUserId,
          tournamentId: mockTournamentId,
          command: {
            members: [
              { membershipId: mockMembershipId, slotNo: 1, role: 'captain', isPlaying: false },
              { membershipId: mockMembershipId, slotNo: 2, role: 'player', isPlaying: true },
            ],
          },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate slotNo in input', async () => {
      const mockMembership2 = '990e8400-e29b-41d4-a716-446655440000';
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.replaceRoster({
          actorUserId: mockUserId,
          tournamentId: mockTournamentId,
          command: {
            members: [
              { membershipId: mockMembershipId, slotNo: 1, role: 'captain', isPlaying: false },
              { membershipId: mockMembership2, slotNo: 1, role: 'player', isPlaying: true },
            ],
          },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
