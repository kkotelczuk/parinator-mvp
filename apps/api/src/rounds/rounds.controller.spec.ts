import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '990e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';

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
});
