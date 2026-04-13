import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { PairingRunsController } from './pairing-runs.controller';
import { RoundsService } from './rounds.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockPairingRunId = '570e8400-e29b-41d4-a716-446655440000';
const mockAssignmentId = '470e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockOpponentId = '890e8400-e29b-41d4-a716-446655440000';

describe('PairingRunsController', () => {
  let controller: PairingRunsController;
  const mockRoundsService = {
    patchPairingRun: jest.fn().mockResolvedValue({
      id: mockPairingRunId,
      mode: 'simulation',
      name: 'Plan B',
      simulationRating: 'better',
      isFinal: false,
      finalizedAt: null,
      roundId: '990e8400-e29b-41d4-a716-446655440000',
      createdByMembershipId: mockMembershipId,
      sortOrder: 2,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }),
    finalizePairingRun: jest.fn().mockResolvedValue({
      id: mockPairingRunId,
      mode: 'live',
      isFinal: true,
      finalizedAt: '2025-01-01T00:00:00.000Z',
    }),
    deletePairingRun: jest.fn().mockResolvedValue({ deleted: true }),
    listPairingSteps: jest.fn().mockResolvedValue({
      data: [{ id: '1', stepNo: 1, phaseKey: 'defender_pick', payload: { playerId: mockMembershipId } }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    putPairingSteps: jest.fn().mockResolvedValue({
      data: [{ id: '1', stepNo: 1, phaseKey: 'defender_pick', payload: { playerId: mockMembershipId } }],
    }),
    listPairingAssignments: jest.fn().mockResolvedValue({
      data: [{
        id: '1',
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        roundTableId: null,
        estimationId: null,
        gameResult: null,
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    putPairingAssignments: jest.fn().mockResolvedValue({
      data: [{
        id: '1',
        playerMembershipId: mockMembershipId,
        opponentPlayerId: mockOpponentId,
        roundTableId: null,
        estimationId: null,
        gameResult: null,
      }],
    }),
    patchPairingAssignmentResult: jest.fn().mockResolvedValue({
      id: mockAssignmentId,
      playerMembershipId: mockMembershipId,
      opponentPlayerId: mockOpponentId,
      roundTableId: null,
      estimationId: null,
      gameResult: 14,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PairingRunsController],
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
    controller = module.get<PairingRunsController>(PairingRunsController);
    jest.clearAllMocks();
  });

  it('should validate and patch pairing run', async () => {
    await controller.patchPairingRun(mockUserId, mockPairingRunId, { name: 'Plan B' });
    expect(mockRoundsService.patchPairingRun).toHaveBeenCalledWith({
      actorUserId: mockUserId,
      pairingRunId: mockPairingRunId,
      command: { name: 'Plan B', simulationRating: undefined, sortOrder: undefined },
    });
  });

  it('should validate and list pairing assignments', async () => {
    const actualResult = await controller.listPairingAssignments(mockUserId, mockPairingRunId, {
      'filter[playerMembershipId]': mockMembershipId,
    });
    expect(actualResult.data).toHaveLength(1);
    expect(mockRoundsService.listPairingAssignments).toHaveBeenCalled();
  });

  it('should reject invalid assignmentId uuid', async () => {
    await expect(
      controller.patchPairingAssignmentResult(mockUserId, 'not-a-uuid', { gameResult: 14 }),
    ).rejects.toThrow(BadRequestException);
  });
});
