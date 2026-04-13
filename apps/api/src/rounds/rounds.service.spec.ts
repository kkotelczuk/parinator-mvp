import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { RoundsService } from './rounds.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '990e8400-e29b-41d4-a716-446655440000';

type BuilderResponse = { data: unknown; error: { code?: string; message?: string } | null; count?: number | null };

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
  builder.neq = jest.fn().mockReturnValue(builder);
  builder.in = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
  builder.delete = jest.fn().mockReturnValue(builder);
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

const mockRoundRow = {
  id: mockRoundId,
  tournament_id: mockTournamentId,
  round_number: 1,
  display_name: 'Round 1',
  mission: 'Mission A',
  deployment: 'Hammer and Anvil',
  opponent_team_name: 'Team Beta',
  is_active: false,
  sort_order: 1,
  status: 'editable',
  locked_at: null,
  locked_by_membership_id: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('RoundsService', () => {
  let service: RoundsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<RoundsService>(RoundsService);
  });

  describe('listRounds', () => {
    it('should return paginated rounds list', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const roundsBuilder = createBuilder({
        rangeResponse: {
          data: [{
            id: mockRoundId,
            round_number: 1,
            display_name: 'Round 1',
            status: 'editable',
            is_active: false,
            sort_order: 1,
          }],
          error: null,
          count: 1,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return memberBuilder;
        if (table === 'rounds') return roundsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listRounds({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
      });
      expect(actualResult.data).toEqual([{
        id: mockRoundId,
        roundNumber: 1,
        displayName: 'Round 1',
        status: 'editable',
        isActive: false,
        sortOrder: 1,
      }]);
      expect(actualResult.pagination.total).toBe(1);
    });
  });

  describe('createRound', () => {
    it('should create round and return DTO', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const countBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 5 },
      });
      const insertBuilder = createBuilder({
        singleResponse: { data: mockRoundRow, error: null, count: null },
      });
      let roundsCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'rounds') {
          roundsCallCount++;
          return roundsCallCount === 1 ? countBuilder : insertBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.createRound({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: {
          roundNumber: 1,
          displayName: 'Round 1',
          mission: 'Mission A',
          deployment: 'Hammer and Anvil',
          opponentTeamName: 'Team Beta',
          isActive: false,
          sortOrder: 1,
        },
      });
      expect(actualResult.id).toBe(mockRoundId);
      expect(actualResult.roundNumber).toBe(1);
      expect(actualResult.displayName).toBe('Round 1');
    });

    it('should throw ForbiddenException when actor is not captain', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: null, error: { code: 'PGRST116' }, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.createRound({
          actorUserId: mockUserId,
          tournamentId: mockTournamentId,
          command: {
            roundNumber: 1,
            displayName: 'R1',
            mission: 'M',
            deployment: 'D',
            opponentTeamName: null,
            isActive: false,
            sortOrder: 1,
          },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for closed tournament', async () => {
      const closedTournament = { ...mockTournamentRow, status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: closedTournament, error: null, count: null },
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
        service.createRound({
          actorUserId: mockUserId,
          tournamentId: mockTournamentId,
          command: {
            roundNumber: 1,
            displayName: 'R1',
            mission: 'M',
            deployment: 'D',
            opponentTeamName: null,
            isActive: false,
            sortOrder: 1,
          },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getRound', () => {
    it('should return round DTO', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return memberBuilder;
        return createBuilder();
      });
      const actualResult = await service.getRound(mockUserId, mockRoundId);
      expect(actualResult.id).toBe(mockRoundId);
      expect(actualResult.roundNumber).toBe(1);
    });

    it('should throw NotFoundException when round does not exist', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation(() => roundBuilder);
      await expect(
        service.getRound(mockUserId, mockRoundId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('lockRound', () => {
    it('should throw ConflictException when round is already locked', async () => {
      const lockedRound = { ...mockRoundRow, status: 'locked', locked_at: '2025-01-15T00:00:00.000Z', locked_by_membership_id: mockMembershipId };
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: lockedRound, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.lockRound(mockUserId, mockRoundId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when tournament is closed', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const closedTournament = { ...mockTournamentRow, status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: closedTournament, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.lockRound(mockUserId, mockRoundId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('patchRound', () => {
    it('should throw ConflictException when round is locked', async () => {
      const lockedRound = { ...mockRoundRow, status: 'locked', locked_at: '2025-01-15T00:00:00.000Z', locked_by_membership_id: mockMembershipId };
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: lockedRound, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.patchRound({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          command: { displayName: 'Updated' },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activateRound', () => {
    it('should throw ConflictException when round is locked', async () => {
      const lockedRound = { ...mockRoundRow, status: 'locked', locked_at: '2025-01-15T00:00:00.000Z', locked_by_membership_id: mockMembershipId };
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: lockedRound, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.activateRound(mockUserId, mockRoundId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
