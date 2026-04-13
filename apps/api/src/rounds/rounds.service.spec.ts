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
const mockOtherRoundId = 'aa0e8400-e29b-41d4-a716-446655440001';
const mockSnapshotId = '470e8400-e29b-41d4-a716-446655440000';

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
  builder.ilike = jest.fn().mockReturnValue(builder);
  builder.neq = jest.fn().mockReturnValue(builder);
  builder.in = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.upsert = jest.fn().mockResolvedValue({ data: null, error: null, count: null });
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

const mockOpponentRow = {
  id: 'aa0e8400-e29b-41d4-a716-446655440000',
  round_id: mockRoundId,
  name: 'Opponent A',
  faction: 'Faction',
  list_text: 'Roster',
  external_ref: 'source-id',
  list_opened_required: true,
  created_at: '2025-01-01T00:00:00.000Z',
};

const mockRoundTableRow = {
  id: 'bb0e8400-e29b-41d4-a716-446655440000',
  round_id: mockRoundId,
  table_no: 1,
  table_name: 'Top table',
  image_asset_id: null,
  created_at: '2025-01-01T00:00:00.000Z',
};

const mockOfflineSyncSnapshotRow = {
  id: mockSnapshotId,
  captain_membership_id: mockMembershipId,
  client_snapshot_id: 'client-snapshot-1',
  round_id: mockRoundId,
  payload: { pairingRunDraft: { mode: 'live' }, timestamp: '2025-02-10T00:00:00.000Z' },
  synced_at: '2025-02-10T00:00:01.000Z',
};

describe('RoundsService', () => {
  let service: RoundsService;
  let mockFrom: jest.Mock;
  let mockRpc: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom, rpc: mockRpc }) },
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

  describe('hardResetRound', () => {
    it('should delete round operational data and return counters', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const pairingRunsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 2 },
      });
      const pairingRunsDeleteBuilder = createBuilder();
      const estimationsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 5 },
      });
      const estimationsDeleteBuilder = createBuilder();
      const preferencesCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 4 },
      });
      const preferencesDeleteBuilder = createBuilder();
      const estimatorSessionsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 1 },
      });
      const estimatorSessionsDeleteBuilder = createBuilder();
      const offlineSnapshotsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 1 },
      });
      const offlineSnapshotsDeleteBuilder = createBuilder();
      const opponentsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 5 },
      });
      const opponentsDeleteBuilder = createBuilder();
      const auditBuilder = createBuilder();
      const tableCallCounts: Record<string, number> = {};
      mockFrom.mockImplementation((table: string) => {
        tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1;
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'pairing_runs') return tableCallCounts[table] === 1 ? pairingRunsCountBuilder : pairingRunsDeleteBuilder;
        if (table === 'matchup_estimations') {
          return tableCallCounts[table] === 1 ? estimationsCountBuilder : estimationsDeleteBuilder;
        }
        if (table === 'table_preferences') {
          return tableCallCounts[table] === 1 ? preferencesCountBuilder : preferencesDeleteBuilder;
        }
        if (table === 'estimator_sessions') {
          return tableCallCounts[table] === 1 ? estimatorSessionsCountBuilder : estimatorSessionsDeleteBuilder;
        }
        if (table === 'offline_sync_snapshots') {
          return tableCallCounts[table] === 1 ? offlineSnapshotsCountBuilder : offlineSnapshotsDeleteBuilder;
        }
        if (table === 'opponent_players') {
          return tableCallCounts[table] === 1 ? opponentsCountBuilder : opponentsDeleteBuilder;
        }
        if (table === 'audit_events') return auditBuilder;
        return createBuilder();
      });
      const actualResult = await service.hardResetRound({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: { reason: 'manual_reset' },
      });
      expect(actualResult).toEqual({
        reset: true,
        deleted: {
          pairingRuns: 2,
          estimations: 5,
          preferences: 4,
          offlineSnapshots: 1,
          opponents: 5,
        },
      });
      expect(auditBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'round_hard_reset',
        metadata: {
          reason: 'manual_reset',
          deleted: actualResult.deleted,
        },
      }));
    });

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
        service.hardResetRound({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          command: { reason: 'manual_reset' },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateOpponentTeam', () => {
    it('should update opponent team name and report triggered reset', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const updateBuilder = createBuilder({
        singleResponse: {
          data: { id: mockRoundId, opponent_team_name: 'Team Omega' },
          error: null,
          count: null,
        },
      });
      let roundsCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'rounds') {
          roundsCallCount++;
          return roundsCallCount === 1 ? roundBuilder : updateBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.updateOpponentTeam({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: { opponentTeamName: 'Team Omega' },
      });
      expect(actualResult).toEqual({
        id: mockRoundId,
        opponentTeamName: 'Team Omega',
        hardResetTriggered: true,
      });
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

  describe('listOpponents', () => {
    it('should return paginated opponents list', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const opponentsBuilder = createBuilder({
        rangeResponse: { data: [mockOpponentRow], error: null, count: 1 },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return memberBuilder;
        if (table === 'opponent_players') return opponentsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listOpponents({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: 'name',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(actualResult.data[0]?.name).toBe('Opponent A');
      expect(actualResult.pagination.total).toBe(1);
    });
  });

  describe('createOpponent', () => {
    it('should create opponent for editable round', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const opponentInsertBuilder = createBuilder({
        singleResponse: { data: mockOpponentRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'opponent_players') return opponentInsertBuilder;
        return createBuilder();
      });
      const actualResult = await service.createOpponent({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: {
          name: 'Opponent A',
          faction: 'Faction',
          listText: 'Roster',
          externalRef: 'source-id',
          listOpenedRequired: true,
        },
      });
      expect(actualResult.name).toBe('Opponent A');
    });
  });

  describe('replaceTables', () => {
    it('should reject duplicate table numbers in payload', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
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
        service.replaceTables({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          command: {
            tables: [
              { tableNo: 1, tableName: 'Top table', imageAssetId: null },
              { tableNo: 1, tableName: 'Second table', imageAssetId: null },
            ],
          },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should replace table set and return mapped response', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const tablesBuilder = createBuilder({
        defaultResponse: { data: [mockRoundTableRow], error: null, count: null },
      });
      tablesBuilder.upsert = jest.fn().mockResolvedValue({ data: null, error: null, count: null });
      tablesBuilder.not = jest.fn().mockReturnValue(tablesBuilder);
      tablesBuilder.order = jest
        .fn()
        .mockResolvedValue({ data: [mockRoundTableRow], error: null, count: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'round_tables') return tablesBuilder;
        return createBuilder();
      });
      const actualResult = await service.replaceTables({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: { tables: [{ tableNo: 1, tableName: 'Top table', imageAssetId: null }] },
      });
      expect(actualResult.data[0]?.tableNo).toBe(1);
      expect(actualResult.data[0]?.tableName).toBe('Top table');
    });
  });

  describe('upsertEstimation', () => {
    it('should throw ForbiddenException when actor is not player', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const activeMembershipBuilder = createBuilder({
        singleResponse: {
          data: {
            id: mockMembershipId,
            team_id: mockTeamId,
            user_id: mockUserId,
            role: 'captain',
            is_playing: false,
            joined_at: '2025-01-01T00:00:00.000Z',
            left_at: null,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const opponentBuilder = createBuilder({
        maybeSingleResponse: { data: { id: mockOpponentRow.id }, error: null, count: null },
      });
      let tournamentCalls = 0;
      let membershipCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') {
          tournamentCalls++;
          return tournamentBuilder;
        }
        if (table === 'team_memberships') {
          membershipCalls++;
          return membershipCalls === 1 ? memberBuilder : activeMembershipBuilder;
        }
        if (table === 'opponent_players') return opponentBuilder;
        return createBuilder();
      });
      await expect(
        service.upsertEstimation({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          opponentPlayerId: mockOpponentRow.id,
          command: {
            listOpenedAt: '2025-01-01T00:00:00.000Z',
            hasFirstTurnImpact: false,
            scoreSingle: 10,
            scoreGoFirst: null,
            scoreGoSecond: null,
            comment: null,
          },
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(tournamentCalls).toBeGreaterThan(0);
    });
  });

  describe('getMyEstimationStatus', () => {
    it('should return completion summary for player', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const activeMembershipBuilder = createBuilder({
        singleResponse: {
          data: {
            id: mockMembershipId,
            team_id: mockTeamId,
            user_id: mockUserId,
            role: 'player',
            is_playing: true,
            joined_at: '2025-01-01T00:00:00.000Z',
            left_at: null,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const opponentsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 5 },
      });
      const estimationsCountBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: 5 },
      });
      let teamMembershipCalls = 0;
      let tournamentsCalls = 0;
      let matchupCalls = 0;
      let opponentsCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') {
          tournamentsCalls++;
          return tournamentBuilder;
        }
        if (table === 'team_memberships') {
          teamMembershipCalls++;
          return teamMembershipCalls === 1 ? memberBuilder : activeMembershipBuilder;
        }
        if (table === 'opponent_players') {
          opponentsCalls++;
          return opponentsCountBuilder;
        }
        if (table === 'matchup_estimations') {
          matchupCalls++;
          return estimationsCountBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.getMyEstimationStatus(mockUserId, mockRoundId);
      expect(actualResult).toEqual({ completed: true, opponentCount: 5, myEstimationsCount: 5 });
      expect(tournamentsCalls).toBeGreaterThan(0);
      expect(matchupCalls).toBe(1);
      expect(opponentsCalls).toBe(1);
    });
  });

  describe('getRoundMatrix', () => {
    it('should return matrix aggregate for player view', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const accessMembershipBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const actorMembershipBuilder = createBuilder({
        singleResponse: {
          data: {
            id: mockMembershipId,
            team_id: mockTeamId,
            user_id: mockUserId,
            role: 'player',
            is_playing: true,
            joined_at: '2025-01-01T00:00:00.000Z',
            left_at: null,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const matrixMembersBuilder = createBuilder({
        defaultResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const opponentsBuilder = createBuilder({
        defaultResponse: { data: [{ id: mockOpponentRow.id, name: mockOpponentRow.name }], error: null, count: null },
      });
      const estimationsBuilder = createBuilder({
        defaultResponse: {
          data: [{
            id: 'e10e8400-e29b-41d4-a716-446655440000',
            player_membership_id: mockMembershipId,
            opponent_player_id: mockOpponentRow.id,
            list_opened_at: '2025-01-01T00:00:00.000Z',
            has_first_turn_impact: false,
            score_single: 10,
            score_go_first: null,
            score_go_second: null,
            comment: 'Good matchup',
          }],
          error: null,
          count: null,
        },
      });
      const tablePreferencesBuilder = createBuilder({
        defaultResponse: {
          data: [{ player_membership_id: mockMembershipId, preference: 'preferred' }],
          error: null,
          count: null,
        },
      });
      let teamMembershipCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') {
          teamMembershipCalls++;
          if (teamMembershipCalls === 1) return accessMembershipBuilder;
          if (teamMembershipCalls === 2) return actorMembershipBuilder;
          return matrixMembersBuilder;
        }
        if (table === 'opponent_players') return opponentsBuilder;
        if (table === 'matchup_estimations') return estimationsBuilder;
        if (table === 'table_preferences') return tablePreferencesBuilder;
        return createBuilder();
      });
      const actualResult = await service.getRoundMatrix({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        view: 'player',
      });
      expect(actualResult.rows).toEqual([{ playerMembershipId: mockMembershipId }]);
      expect(actualResult.columns).toEqual([{ opponentPlayerId: mockOpponentRow.id, name: mockOpponentRow.name }]);
      expect(actualResult.cells[0]?.comment).toBe('Good matchup');
      expect(actualResult.cells[0]?.tablePreferenceSummary).toEqual({ preferred: 1, notPreferred: 0 });
    });
  });

  describe('getRoundMatrixCell', () => {
    it('should throw NotFoundException when matrix cell has no data', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const accessMembershipBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const actorMembershipBuilder = createBuilder({
        singleResponse: {
          data: {
            id: mockMembershipId,
            team_id: mockTeamId,
            user_id: mockUserId,
            role: 'captain',
            is_playing: false,
            joined_at: '2025-01-01T00:00:00.000Z',
            left_at: null,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const validatedPlayerMembershipBuilder = createBuilder({
        maybeSingleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const opponentBuilder = createBuilder({
        maybeSingleResponse: { data: { id: mockOpponentRow.id }, error: null, count: null },
      });
      const estimationBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      const tablePreferencesBuilder = createBuilder({
        defaultResponse: { data: [], error: null, count: null },
      });
      let teamMembershipCalls = 0;
      let opponentCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') {
          teamMembershipCalls++;
          if (teamMembershipCalls === 1) return accessMembershipBuilder;
          if (teamMembershipCalls === 2) return actorMembershipBuilder;
          return validatedPlayerMembershipBuilder;
        }
        if (table === 'opponent_players') {
          opponentCalls++;
          return opponentBuilder;
        }
        if (table === 'matchup_estimations') return estimationBuilder;
        if (table === 'table_preferences') return tablePreferencesBuilder;
        return createBuilder();
      });
      await expect(
        service.getRoundMatrixCell({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          playerMembershipId: mockMembershipId,
          opponentPlayerId: mockOpponentRow.id,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(opponentCalls).toBe(1);
    });
  });

  describe('pushOfflineSync', () => {
    it('should insert snapshot when clientSnapshotId does not exist', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const existingSnapshotBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      const insertSnapshotBuilder = createBuilder({
        singleResponse: { data: mockOfflineSyncSnapshotRow, error: null, count: null },
      });
      let teamMembershipCalls = 0;
      let tournamentsCalls = 0;
      let offlineSyncCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') {
          tournamentsCalls++;
          return tournamentBuilder;
        }
        if (table === 'team_memberships') {
          teamMembershipCalls++;
          return captainBuilder;
        }
        if (table === 'offline_sync_snapshots') {
          offlineSyncCalls++;
          return offlineSyncCalls === 1 ? existingSnapshotBuilder : insertSnapshotBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.pushOfflineSync({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: {
          clientSnapshotId: 'client-snapshot-1',
          payload: { pairingRunDraft: { mode: 'live' }, timestamp: '2025-02-10T00:00:00.000Z' },
        },
      });
      expect(actualResult).toEqual({
        applied: true,
        snapshotId: mockSnapshotId,
        conflictResolution: 'local_wins',
      });
      expect(teamMembershipCalls).toBeGreaterThan(0);
      expect(tournamentsCalls).toBeGreaterThan(0);
    });

    it('should throw BadRequestException when clientSnapshotId exists for another round', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const conflictingSnapshotBuilder = createBuilder({
        maybeSingleResponse: {
          data: { id: mockSnapshotId, round_id: mockOtherRoundId },
          error: null,
          count: null,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'offline_sync_snapshots') return conflictingSnapshotBuilder;
        return createBuilder();
      });
      await expect(
        service.pushOfflineSync({
          actorUserId: mockUserId,
          roundId: mockRoundId,
          command: {
            clientSnapshotId: 'client-snapshot-1',
            payload: { pairingRunDraft: {}, timestamp: '2025-02-10T00:00:00.000Z' },
          },
        }),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'clientSnapshotId already exists for another round.',
            details: {},
          },
        },
      });
    });
  });

  describe('listOfflineSyncSnapshots', () => {
    it('should return paginated snapshot list', async () => {
      const roundBuilder = createBuilder({
        maybeSingleResponse: { data: mockRoundRow, error: null, count: null },
      });
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const memberBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const snapshotsBuilder = createBuilder({
        rangeResponse: { data: [mockOfflineSyncSnapshotRow], error: null, count: 1 },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rounds') return roundBuilder;
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return memberBuilder;
        if (table === 'offline_sync_snapshots') return snapshotsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listOfflineSyncSnapshots({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: '-syncedAt',
      });
      expect(actualResult.data[0]).toEqual({
        id: mockSnapshotId,
        captainMembershipId: mockMembershipId,
        clientSnapshotId: 'client-snapshot-1',
        roundId: mockRoundId,
        payload: { pairingRunDraft: { mode: 'live' }, timestamp: '2025-02-10T00:00:00.000Z' },
        syncedAt: '2025-02-10T00:00:01.000Z',
      });
      expect(actualResult.pagination.total).toBe(1);
    });
  });
});
