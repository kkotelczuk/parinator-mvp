import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';

const mockTeamsListResponse = {
  data: [{ id: mockTeamId, name: 'Team Alpha', createdAt: '2025-01-01T00:00:00.000Z' }],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

const mockMembership = {
  id: mockMembershipId,
  userId: mockUserId,
  role: 'player' as const,
  isPlaying: true,
  joinedAt: '2025-01-01T00:00:00.000Z',
  leftAt: null,
};

describe('TeamsController', () => {
  let controller: TeamsController;
  let teamsService: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: {
            listTeams: jest.fn().mockResolvedValue(mockTeamsListResponse),
            createTeam: jest.fn().mockResolvedValue({
              id: mockTeamId,
              name: 'Team Alpha',
              createdByUserId: mockUserId,
              createdAt: '2025-01-01T00:00:00.000Z',
            }),
            listMemberships: jest.fn().mockResolvedValue({
              data: [mockMembership],
              pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            }),
            createMembership: jest.fn().mockResolvedValue(mockMembership),
            patchMembership: jest.fn().mockResolvedValue({ ...mockMembership, role: 'captain' }),
          },
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TeamsController>(TeamsController);
    teamsService = module.get<TeamsService>(TeamsService);
  });

  describe('listTeams', () => {
    it('should return paginated teams list', async () => {
      const actualResult = await controller.listTeams(mockUserId, {});
      expect(actualResult).toEqual(mockTeamsListResponse);
      expect(teamsService.listTeams).toHaveBeenCalledWith({
        userId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        activeOnly: undefined,
      });
    });

    it('should validate query params', async () => {
      await expect(
        controller.listTeams(mockUserId, { page: '0' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTeam', () => {
    it('should call service with validated body', async () => {
      const actualResult = await controller.createTeam(mockUserId, { name: ' Team Alpha ' });
      expect(actualResult.name).toBe('Team Alpha');
      expect(teamsService.createTeam).toHaveBeenCalledWith(mockUserId, {
        name: 'Team Alpha',
      });
    });
  });

  describe('listMemberships', () => {
    it('should pass validated filters to service', async () => {
      const actualResult = await controller.listMemberships(mockUserId, mockTeamId, {
        'filter[role]': 'player',
        'filter[active]': 'true',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(teamsService.listMemberships).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        page: 1,
        pageSize: 20,
        sort: '-joinedAt',
        role: 'player',
        active: true,
      });
    });

    it('should reject invalid teamId UUID', async () => {
      await expect(
        controller.listMemberships(mockUserId, 'not-a-uuid', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMembership', () => {
    it('should call service when payload is valid', async () => {
      await controller.createMembership(mockUserId, mockTeamId, {
        userId: mockUserId,
        role: 'player',
        isPlaying: true,
      });
      expect(teamsService.createMembership).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        command: { userId: mockUserId, role: 'player', isPlaying: true },
      });
    });

    it('should throw on invalid payload', async () => {
      await expect(
        controller.createMembership(mockUserId, mockTeamId, {
          userId: 'invalid',
          role: 'invalid',
          isPlaying: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('patchMembership', () => {
    it('should call service with partial payload', async () => {
      await controller.patchMembership(mockUserId, mockTeamId, mockMembershipId, {
        leftAt: null,
      });
      expect(teamsService.patchMembership).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        membershipId: mockMembershipId,
        command: { role: undefined, isPlaying: undefined, leftAt: null },
      });
    });

    it('should reject empty payload', async () => {
      await expect(
        controller.patchMembership(mockUserId, mockTeamId, mockMembershipId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid membershipId UUID', async () => {
      await expect(
        controller.patchMembership(mockUserId, mockTeamId, 'not-valid', { role: 'player' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
