import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { RoundsService } from './rounds.service';
import { TournamentRoundsController } from './tournament-rounds.controller';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '990e8400-e29b-41d4-a716-446655440000';

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

const mockRoundsList = {
  data: [{ id: mockRoundId, roundNumber: 1, displayName: 'Round 1', status: 'editable', isActive: true, sortOrder: 1 }],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

describe('TournamentRoundsController', () => {
  let controller: TournamentRoundsController;
  const mockRoundsService = {
    listRounds: jest.fn().mockResolvedValue(mockRoundsList),
    createRound: jest.fn().mockResolvedValue(mockRoundDto),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentRoundsController],
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
    controller = module.get<TournamentRoundsController>(TournamentRoundsController);
    jest.clearAllMocks();
  });

  describe('listRounds', () => {
    it('should return paginated rounds list', async () => {
      const actualResult = await controller.listRounds(mockUserId, mockTournamentId, {});
      expect(actualResult).toEqual(mockRoundsList);
      expect(mockRoundsService.listRounds).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        status: undefined,
        isActive: undefined,
      });
    });

    it('should reject invalid tournamentId UUID', async () => {
      await expect(
        controller.listRounds(mockUserId, 'not-a-uuid', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid page value', async () => {
      await expect(
        controller.listRounds(mockUserId, mockTournamentId, { page: '0' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createRound', () => {
    it('should call service with validated body', async () => {
      const inputBody = {
        roundNumber: 1,
        displayName: ' Round 1 ',
        mission: 'Mission A',
        deployment: 'Hammer and Anvil',
        opponentTeamName: 'Team Beta',
        isActive: true,
        sortOrder: 1,
      };
      const actualResult = await controller.createRound(mockUserId, mockTournamentId, inputBody);
      expect(actualResult.id).toBe(mockRoundId);
      expect(mockRoundsService.createRound).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: {
          roundNumber: 1,
          displayName: 'Round 1',
          mission: 'Mission A',
          deployment: 'Hammer and Anvil',
          opponentTeamName: 'Team Beta',
          isActive: true,
          sortOrder: 1,
        },
      });
    });

    it('should reject empty body', async () => {
      await expect(
        controller.createRound(mockUserId, mockTournamentId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject roundNumber out of range', async () => {
      await expect(
        controller.createRound(mockUserId, mockTournamentId, {
          roundNumber: 0,
          displayName: 'R1',
          mission: 'M',
          deployment: 'D',
          sortOrder: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject sortOrder out of range', async () => {
      await expect(
        controller.createRound(mockUserId, mockTournamentId, {
          roundNumber: 1,
          displayName: 'R1',
          mission: 'M',
          deployment: 'D',
          sortOrder: 201,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
