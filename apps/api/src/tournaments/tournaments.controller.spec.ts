import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';

const mockTournamentDto = {
  id: mockTournamentId,
  name: 'WTC Warmup',
  status: 'active' as const,
  teamId: mockTeamId,
  teamSize: 5,
  setupLockedAt: null,
  closedAt: null,
  sourceType: null,
  sourceUrl: null,
  createdByMembershipId: mockMembershipId,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockTournamentsList = {
  data: [{ id: mockTournamentId, name: 'WTC Warmup', status: 'active', teamSize: 5, setupLockedAt: null }],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

describe('TournamentsController', () => {
  let controller: TournamentsController;
  const mockTournamentsService = {
    listTournaments: jest.fn().mockResolvedValue(mockTournamentsList),
    createTournament: jest.fn().mockResolvedValue(mockTournamentDto),
    getTournamentDetail: jest.fn().mockResolvedValue({
      ...mockTournamentDto,
      roundCount: 3,
      activeRoundId: null,
    }),
    patchTournament: jest.fn().mockResolvedValue({ ...mockTournamentDto, name: 'Updated' }),
    lockSetup: jest.fn().mockResolvedValue({
      id: mockTournamentId,
      setupLockedAt: '2025-02-01T00:00:00.000Z',
    }),
    closeTournament: jest.fn().mockResolvedValue({
      id: mockTournamentId,
      status: 'closed',
      closedAt: '2025-03-01T00:00:00.000Z',
    }),
    listRoster: jest.fn().mockResolvedValue({ data: [] }),
    replaceRoster: jest.fn().mockResolvedValue({ data: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        {
          provide: TournamentsService,
          useValue: mockTournamentsService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TournamentsController>(TournamentsController);
    jest.clearAllMocks();
  });

  describe('listTournaments', () => {
    it('should return paginated tournaments list', async () => {
      const actualResult = await controller.listTournaments(mockUserId, {});
      expect(actualResult).toEqual(mockTournamentsList);
      expect(mockTournamentsService.listTournaments).toHaveBeenCalledWith({
        userId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        status: undefined,
        teamId: undefined,
      });
    });

    it('should validate query params — reject invalid page', async () => {
      await expect(
        controller.listTournaments(mockUserId, { page: '0' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTournament', () => {
    it('should call service with validated body', async () => {
      const actualResult = await controller.createTournament(mockUserId, {
        name: ' WTC Warmup ',
        teamId: mockTeamId,
        teamSize: 5,
      });
      expect(actualResult.name).toBe('WTC Warmup');
      expect(mockTournamentsService.createTournament).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        command: {
          name: 'WTC Warmup',
          teamId: mockTeamId,
          teamSize: 5,
          sourceType: undefined,
          sourceUrl: undefined,
        },
      });
    });

    it('should reject teamSize below 5', async () => {
      await expect(
        controller.createTournament(mockUserId, {
          name: 'Test',
          teamId: mockTeamId,
          teamSize: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty body', async () => {
      await expect(
        controller.createTournament(mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTournament', () => {
    it('should return tournament detail', async () => {
      const actualResult = await controller.getTournament(mockUserId, mockTournamentId);
      expect(actualResult.roundCount).toBe(3);
      expect(mockTournamentsService.getTournamentDetail).toHaveBeenCalledWith(mockUserId, mockTournamentId);
    });

    it('should reject invalid tournamentId UUID', async () => {
      await expect(
        controller.getTournament(mockUserId, 'not-a-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('patchTournament', () => {
    it('should call service with partial update', async () => {
      await controller.patchTournament(mockUserId, mockTournamentId, { name: 'Updated' });
      expect(mockTournamentsService.patchTournament).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: { name: 'Updated', status: undefined },
      });
    });

    it('should reject empty payload', async () => {
      await expect(
        controller.patchTournament(mockUserId, mockTournamentId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockSetup', () => {
    it('should call service and return lock response', async () => {
      const actualResult = await controller.lockSetup(mockUserId, mockTournamentId);
      expect(actualResult.setupLockedAt).toBeDefined();
      expect(mockTournamentsService.lockSetup).toHaveBeenCalledWith(mockUserId, mockTournamentId);
    });
  });

  describe('closeTournament', () => {
    it('should call service with optional closedAt', async () => {
      const actualResult = await controller.closeTournament(mockUserId, mockTournamentId, {});
      expect(actualResult.status).toBe('closed');
      expect(mockTournamentsService.closeTournament).toHaveBeenCalledWith(
        mockUserId,
        mockTournamentId,
        { closedAt: undefined },
      );
    });
  });

  describe('replaceRoster', () => {
    it('should call service with validated roster', async () => {
      await controller.replaceRoster(mockUserId, mockTournamentId, {
        members: [
          { membershipId: mockMembershipId, slotNo: 1, role: 'captain', isPlaying: false },
        ],
      });
      expect(mockTournamentsService.replaceRoster).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: {
          members: [
            { membershipId: mockMembershipId, slotNo: 1, role: 'captain', isPlaying: false },
          ],
        },
      });
    });

    it('should reject empty members array', async () => {
      await expect(
        controller.replaceRoster(mockUserId, mockTournamentId, { members: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid slotNo', async () => {
      await expect(
        controller.replaceRoster(mockUserId, mockTournamentId, {
          members: [{ membershipId: mockMembershipId, slotNo: 0, role: 'player', isPlaying: true }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
