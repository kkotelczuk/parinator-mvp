import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '990e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockOpponentId = '890e8400-e29b-41d4-a716-446655440000';
const mockTableId = '980e8400-e29b-41d4-a716-446655440000';
const mockEstimationId = '780e8400-e29b-41d4-a716-446655440000';
const mockSecondMembershipId = '670e8400-e29b-41d4-a716-446655440001';
const mockPairingRunId = '570e8400-e29b-41d4-a716-446655440000';
const mockSnapshotId = '470e8400-e29b-41d4-a716-446655440000';

const mockRoundDto = {
  id: mockRoundId,
  tournamentId: mockTournamentId,
  roundNumber: 1,
  displayName: 'Round 1',
  mission: 'Mission A',
  deployment: 'Hammer and Anvil',
  opponentTeamName: 'Team Beta',
  isActive: true,
  sortOrder: 1,
  status: 'editable' as const,
  lockedAt: null,
  lockedByMembershipId: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('RoundsController', () => {
  let controller: RoundsController;
  const mockRoundsService = {
    getRound: jest.fn().mockResolvedValue(mockRoundDto),
    patchRound: jest.fn().mockResolvedValue({ ...mockRoundDto, displayName: 'Updated' }),
    activateRound: jest.fn().mockResolvedValue({ roundId: mockRoundId, isActive: true }),
    reorderRound: jest.fn().mockResolvedValue({ roundId: mockRoundId, sortOrder: 3 }),
    lockRound: jest.fn().mockResolvedValue({
      id: mockRoundId,
      status: 'locked',
      lockedAt: '2025-02-01T00:00:00.000Z',
      lockedByMembershipId: mockMembershipId,
    }),
    listOpponents: jest.fn().mockResolvedValue({
      data: [{
        id: mockOpponentId,
        name: 'Opponent A',
        faction: 'Faction',
        listText: 'Roster',
        externalRef: 'source-id',
        listOpenedRequired: true,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    createOpponent: jest.fn().mockResolvedValue({
      id: mockOpponentId,
      name: 'Opponent A',
      faction: 'Faction',
      listText: 'Roster',
      externalRef: 'source-id',
      listOpenedRequired: true,
    }),
    patchOpponent: jest.fn().mockResolvedValue({
      id: mockOpponentId,
      name: 'Opponent A',
      faction: 'Updated',
      listText: 'Updated roster',
      externalRef: 'source-id',
      listOpenedRequired: true,
    }),
    deleteOpponent: jest.fn().mockResolvedValue({ deleted: true }),
    listTables: jest.fn().mockResolvedValue({
      data: [{
        id: mockTableId,
        tableNo: 1,
        tableName: 'Top table',
        imageAssetId: null,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    replaceTables: jest.fn().mockResolvedValue({
      data: [{
        id: mockTableId,
        tableNo: 1,
        tableName: 'Top table',
        imageAssetId: null,
      }],
    }),
    listEstimations: jest.fn().mockResolvedValue({
      data: [{
        id: mockEstimationId,
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        listOpenedAt: '2025-01-01T00:00:00.000Z',
        hasFirstTurnImpact: false,
        scoreSingle: 10,
        scoreGoFirst: null,
        scoreGoSecond: null,
        comment: null,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    upsertEstimation: jest.fn().mockResolvedValue({
      id: mockEstimationId,
      playerMembershipId: mockMembershipId,
      opponentPlayerId: mockOpponentId,
      listOpenedAt: '2025-01-01T00:00:00.000Z',
      hasFirstTurnImpact: false,
      scoreSingle: 10,
      scoreGoFirst: null,
      scoreGoSecond: null,
      comment: null,
    }),
    deleteEstimation: jest.fn().mockResolvedValue({ deleted: true }),
    listTablePreferences: jest.fn().mockResolvedValue({
      data: [{
        id: '670e8400-e29b-41d4-a716-446655440000',
        playerMembershipId: mockMembershipId,
        roundTableId: mockTableId,
        preference: 'preferred',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    upsertTablePreference: jest.fn().mockResolvedValue({
      id: '670e8400-e29b-41d4-a716-446655440000',
      playerMembershipId: mockMembershipId,
      roundTableId: mockTableId,
      preference: 'preferred',
    }),
    deleteTablePreference: jest.fn().mockResolvedValue({ deleted: true, interpretedAs: 'neutral' }),
    getMyEstimationStatus: jest.fn().mockResolvedValue({ completed: true, opponentCount: 5, myEstimationsCount: 5 }),
    getRoundMatrix: jest.fn().mockResolvedValue({
      rows: [{ playerMembershipId: mockMembershipId }],
      columns: [{ opponentPlayerId: mockOpponentId, name: 'Opponent A' }],
      cells: [{
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        estimation: null,
        tablePreferenceSummary: { preferred: 1, notPreferred: 0 },
        comment: null,
      }],
    }),
    listRoundMatrixCells: jest.fn().mockResolvedValue({
      data: [{
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        estimation: null,
        tablePreferenceSummary: { preferred: 1, notPreferred: 0 },
        comment: null,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    getRoundMatrixCell: jest.fn().mockResolvedValue({
      playerMembershipId: mockMembershipId,
      opponentPlayerId: mockOpponentId,
      estimation: null,
      tablePreferences: [{
        id: '670e8400-e29b-41d4-a716-446655440000',
        playerMembershipId: mockMembershipId,
        roundTableId: mockTableId,
        preference: 'preferred',
      }],
      comment: null,
    }),
    listPairingRuns: jest.fn().mockResolvedValue({
      data: [{
        id: mockPairingRunId,
        mode: 'simulation',
        name: 'Plan A',
        simulationRating: 'neutral',
        isFinal: false,
        finalizedAt: null,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    createPairingRun: jest.fn().mockResolvedValue({
      id: mockPairingRunId,
      mode: 'simulation',
      name: 'Plan A',
      simulationRating: 'neutral',
      isFinal: false,
      finalizedAt: null,
      roundId: mockRoundId,
      createdByMembershipId: mockMembershipId,
      sortOrder: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }),
    getFinalPairings: jest.fn().mockResolvedValue({
      roundId: mockRoundId,
      pairings: [{
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        estimation: null,
        table: null,
        comment: null,
        gameResult: 14,
      }],
    }),
    pushOfflineSync: jest.fn().mockResolvedValue({
      applied: true,
      snapshotId: mockSnapshotId,
      conflictResolution: 'local_wins',
    }),
    listOfflineSyncSnapshots: jest.fn().mockResolvedValue({
      data: [{
        id: mockSnapshotId,
        captainMembershipId: mockMembershipId,
        clientSnapshotId: 'client-snapshot-1',
        roundId: mockRoundId,
        payload: { pairingRunDraft: {}, timestamp: '2025-02-10T00:00:00.000Z' },
        syncedAt: '2025-02-10T00:00:01.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoundsController],
      providers: [
        {
          provide: RoundsService,
          useValue: mockRoundsService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<RoundsController>(RoundsController);
    jest.clearAllMocks();
  });

  describe('getRound', () => {
    it('should return round detail', async () => {
      const actualResult = await controller.getRound(mockUserId, mockRoundId);
      expect(actualResult.id).toBe(mockRoundId);
      expect(mockRoundsService.getRound).toHaveBeenCalledWith(mockUserId, mockRoundId);
    });

    it('should reject invalid roundId UUID', async () => {
      await expect(
        controller.getRound(mockUserId, 'not-a-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('patchRound', () => {
    it('should call service with partial update', async () => {
      await controller.patchRound(mockUserId, mockRoundId, { displayName: 'Updated' });
      expect(mockRoundsService.patchRound).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: {
          displayName: 'Updated',
          mission: undefined,
          deployment: undefined,
          opponentTeamName: undefined,
          isActive: undefined,
          sortOrder: undefined,
        },
      });
    });

    it('should reject empty payload', async () => {
      await expect(
        controller.patchRound(mockUserId, mockRoundId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activateRound', () => {
    it('should call service and return activation response', async () => {
      const actualResult = await controller.activateRound(mockUserId, mockRoundId);
      expect(actualResult.roundId).toBe(mockRoundId);
      expect(actualResult.isActive).toBe(true);
      expect(mockRoundsService.activateRound).toHaveBeenCalledWith(mockUserId, mockRoundId);
    });
  });

  describe('reorderRound', () => {
    it('should call service with validated sortOrder', async () => {
      const actualResult = await controller.reorderRound(mockUserId, mockRoundId, { sortOrder: 3 });
      expect(actualResult.sortOrder).toBe(3);
      expect(mockRoundsService.reorderRound).toHaveBeenCalledWith(mockUserId, mockRoundId, 3);
    });

    it('should reject sortOrder out of range', async () => {
      await expect(
        controller.reorderRound(mockUserId, mockRoundId, { sortOrder: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing sortOrder', async () => {
      await expect(
        controller.reorderRound(mockUserId, mockRoundId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockRound', () => {
    it('should call service and return lock response', async () => {
      const actualResult = await controller.lockRound(mockUserId, mockRoundId);
      expect(actualResult.status).toBe('locked');
      expect(actualResult.lockedAt).toBeDefined();
      expect(mockRoundsService.lockRound).toHaveBeenCalledWith(mockUserId, mockRoundId);
    });
  });

  describe('listOpponents', () => {
    it('should return paginated opponent list', async () => {
      const actualResult = await controller.listOpponents(mockUserId, mockRoundId, { page: '1', pageSize: '20' });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listOpponents).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: 'name',
        name: undefined,
      });
    });
  });

  describe('createOpponent', () => {
    it('should map payload and call service', async () => {
      await controller.createOpponent(mockUserId, mockRoundId, {
        name: 'Opponent A',
        faction: 'Faction',
        listText: 'Roster',
        externalRef: 'source-id',
        listOpenedRequired: true,
      });
      expect(mockRoundsService.createOpponent).toHaveBeenCalledWith({
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
    });

    it('should reject invalid payload', async () => {
      await expect(
        controller.createOpponent(mockUserId, mockRoundId, { name: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('patchOpponent', () => {
    it('should call service with validated ids and payload', async () => {
      await controller.patchOpponent(mockUserId, mockRoundId, mockOpponentId, { faction: 'Updated' });
      expect(mockRoundsService.patchOpponent).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        opponentId: mockOpponentId,
        command: { faction: 'Updated', listText: undefined },
      });
    });
  });

  describe('deleteOpponent', () => {
    it('should call service and return deleted flag', async () => {
      const actualResult = await controller.deleteOpponent(mockUserId, mockRoundId, mockOpponentId);
      expect(actualResult.deleted).toBe(true);
      expect(mockRoundsService.deleteOpponent).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        opponentId: mockOpponentId,
      });
    });
  });

  describe('listTables', () => {
    it('should parse table filter and call service', async () => {
      const actualResult = await controller.listTables(mockUserId, mockRoundId, { 'filter[tableNo]': '1' });
      expect(actualResult.data[0].tableNo).toBe(1);
      expect(mockRoundsService.listTables).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: 'tableNo',
        tableNo: 1,
      });
    });
  });

  describe('replaceTables', () => {
    it('should call service with normalized table payload', async () => {
      await controller.replaceTables(mockUserId, mockRoundId, {
        tables: [{ tableNo: 1, tableName: 'Top table', imageAssetId: null }],
      });
      expect(mockRoundsService.replaceTables).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: { tables: [{ tableNo: 1, tableName: 'Top table', imageAssetId: null }] },
      });
    });
  });

  describe('listEstimations', () => {
    it('should parse filters and call service', async () => {
      const actualResult = await controller.listEstimations(mockUserId, mockRoundId, { 'filter[playerMembershipId]': mockMembershipId });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listEstimations).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        playerMembershipId: mockMembershipId,
        opponentPlayerId: undefined,
      });
    });
  });

  describe('upsertEstimation', () => {
    it('should validate payload and call service', async () => {
      await controller.upsertEstimation(mockUserId, mockRoundId, mockOpponentId, {
        listOpenedAt: '2025-01-01T00:00:00.000Z',
        hasFirstTurnImpact: false,
        scoreSingle: 10,
        scoreGoFirst: null,
        scoreGoSecond: null,
        comment: null,
      });
      expect(mockRoundsService.upsertEstimation).toHaveBeenCalled();
    });
  });

  describe('listTablePreferences', () => {
    it('should parse filters and call service', async () => {
      const actualResult = await controller.listTablePreferences(mockUserId, mockRoundId, { 'filter[roundTableId]': mockTableId });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listTablePreferences).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        playerMembershipId: undefined,
        roundTableId: mockTableId,
      });
    });
  });

  describe('getMyEstimationStatus', () => {
    it('should return completion status', async () => {
      const actualResult = await controller.getMyEstimationStatus(mockUserId, mockRoundId);
      expect(actualResult.completed).toBe(true);
      expect(mockRoundsService.getMyEstimationStatus).toHaveBeenCalledWith(mockUserId, mockRoundId);
    });
  });

  describe('getRoundMatrix', () => {
    it('should parse view filter and call service', async () => {
      const actualResult = await controller.getRoundMatrix(mockUserId, mockRoundId, { 'filter[view]': 'player' });
      expect(actualResult.cells).toHaveLength(1);
      expect(mockRoundsService.getRoundMatrix).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        view: 'player',
      });
    });
  });

  describe('listRoundMatrixCells', () => {
    it('should parse filters and call service', async () => {
      const actualResult = await controller.listRoundMatrixCells(mockUserId, mockRoundId, {
        sort: '-opponentPlayerId',
        'filter[playerMembershipId]': mockSecondMembershipId,
        'filter[opponentPlayerId]': mockOpponentId,
      });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listRoundMatrixCells).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: '-opponentPlayerId',
        playerMembershipId: mockSecondMembershipId,
        opponentPlayerId: mockOpponentId,
      });
    });
  });

  describe('getRoundMatrixCell', () => {
    it('should validate params and call service', async () => {
      const actualResult = await controller.getRoundMatrixCell(
        mockUserId,
        mockRoundId,
        mockMembershipId,
        mockOpponentId,
      );
      expect(actualResult.playerMembershipId).toBe(mockMembershipId);
      expect(mockRoundsService.getRoundMatrixCell).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
      });
    });
  });

  describe('listPairingRuns', () => {
    it('should parse filters and call service', async () => {
      const actualResult = await controller.listPairingRuns(mockUserId, mockRoundId, {
        'filter[mode]': 'simulation',
        'filter[isFinal]': 'false',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listPairingRuns).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        mode: 'simulation',
        isFinal: false,
        simulationRating: undefined,
      });
    });
  });

  describe('createPairingRun', () => {
    it('should map payload and call service', async () => {
      await controller.createPairingRun(mockUserId, mockRoundId, {
        mode: 'simulation',
        name: 'Plan A',
        simulationRating: 'neutral',
        sortOrder: 1,
      });
      expect(mockRoundsService.createPairingRun).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: {
          mode: 'simulation',
          name: 'Plan A',
          simulationRating: 'neutral',
          sortOrder: 1,
        },
      });
    });
  });

  describe('getFinalPairings', () => {
    it('should return final pairings and call service', async () => {
      const actualResult = await controller.getFinalPairings(mockUserId, mockRoundId);
      expect(actualResult.roundId).toBe(mockRoundId);
      expect(mockRoundsService.getFinalPairings).toHaveBeenCalledWith(mockUserId, mockRoundId);
    });
  });

  describe('pushOfflineSync', () => {
    it('should validate payload and call service', async () => {
      const actualResult = await controller.pushOfflineSync(mockUserId, mockRoundId, {
        clientSnapshotId: 'client-snapshot-1',
        payload: { pairingRunDraft: { mode: 'live' }, timestamp: '2025-02-10T00:00:00.000Z' },
      });
      expect(actualResult.applied).toBe(true);
      expect(mockRoundsService.pushOfflineSync).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        command: {
          clientSnapshotId: 'client-snapshot-1',
          payload: { pairingRunDraft: { mode: 'live' }, timestamp: '2025-02-10T00:00:00.000Z' },
        },
      });
    });

    it('should reject payload without timestamp', async () => {
      await expect(
        controller.pushOfflineSync(mockUserId, mockRoundId, {
          clientSnapshotId: 'client-snapshot-1',
          payload: { pairingRunDraft: {} },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listOfflineSyncSnapshots', () => {
    it('should parse query and call service', async () => {
      const actualResult = await controller.listOfflineSyncSnapshots(mockUserId, mockRoundId, {
        page: '2',
        pageSize: '10',
        sort: '-syncedAt',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(mockRoundsService.listOfflineSyncSnapshots).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        roundId: mockRoundId,
        page: 2,
        pageSize: 10,
        sort: '-syncedAt',
      });
    });
  });
});
