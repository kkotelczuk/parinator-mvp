import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TeamsService } from './teams.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';

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
  builder.in = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
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

describe('TeamsService', () => {
  let service: TeamsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
  });

  describe('listTeams', () => {
    it('should return paginated teams list', async () => {
      const membershipsBuilder = createBuilder({
        defaultResponse: { data: [{ team_id: mockTeamId }], error: null, count: null },
      });
      const teamsBuilder = createBuilder({
        rangeResponse: {
          data: [{ id: mockTeamId, name: 'Team Alpha', created_at: '2025-01-01T00:00:00.000Z' }],
          error: null,
          count: 1,
        },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return membershipsBuilder;
        if (table === 'teams') return teamsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listTeams({
        userId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
      });
      expect(actualResult.data).toEqual([
        { id: mockTeamId, name: 'Team Alpha', createdAt: '2025-01-01T00:00:00.000Z' },
      ]);
      expect(actualResult.pagination.total).toBe(1);
    });
  });

  describe('createTeam', () => {
    it('should create team, auto-captain membership, and map response', async () => {
      const teamsBuilder = createBuilder({
        singleResponse: {
          data: {
            id: mockTeamId,
            name: 'Team Alpha',
            created_by_user_id: mockUserId,
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
          count: null,
        },
      });
      const membershipInsertBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'teams') return teamsBuilder;
        if (table === 'team_memberships') return membershipInsertBuilder;
        return createBuilder();
      });
      const actualResult = await service.createTeam(mockUserId, { name: 'Team Alpha' });
      expect(actualResult).toEqual({
        id: mockTeamId,
        name: 'Team Alpha',
        createdByUserId: mockUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(mockFrom).toHaveBeenCalledWith('team_memberships');
    });
  });

  describe('listMemberships', () => {
    it('should return paginated memberships when user has team access', async () => {
      const mockMembershipRow = {
        id: mockMembershipId,
        user_id: mockUserId,
        role: 'player',
        is_playing: true,
        joined_at: '2025-01-01T00:00:00.000Z',
        left_at: null,
      };
      let callCount = 0;
      const accessBuilder = createBuilder({
        limitResponse: { data: [{ id: mockMembershipId }], error: null, count: null },
      });
      const listBuilder = createBuilder({
        rangeResponse: { data: [mockMembershipRow], error: null, count: 1 },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') {
          callCount++;
          return callCount === 1 ? accessBuilder : listBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.listMemberships({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        page: 1,
        pageSize: 20,
        sort: '-joinedAt',
      });
      expect(actualResult.data).toEqual([{
        id: mockMembershipId,
        userId: mockUserId,
        role: 'player',
        isPlaying: true,
        joinedAt: '2025-01-01T00:00:00.000Z',
        leftAt: null,
      }]);
      expect(actualResult.pagination.total).toBe(1);
    });

    it('should throw NotFoundException when team does not exist', async () => {
      const accessMembershipBuilder = createBuilder({
        limitResponse: { data: [], error: null, count: null },
      });
      const teamsBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return accessMembershipBuilder;
        if (table === 'teams') return teamsBuilder;
        return createBuilder();
      });
      await expect(
        service.listMemberships({
          actorUserId: mockUserId,
          teamId: mockTeamId,
          page: 1,
          pageSize: 20,
          sort: '-joinedAt',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMembership', () => {
    it('should create membership and return DTO', async () => {
      const mockMembershipRow = {
        id: mockMembershipId,
        user_id: mockUserId,
        role: 'player',
        is_playing: true,
        joined_at: '2025-01-01T00:00:00.000Z',
        left_at: null,
      };
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const insertBuilder = createBuilder({
        singleResponse: { data: mockMembershipRow, error: null, count: null },
      });
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') {
          callCount++;
          return callCount === 1 ? captainCheckBuilder : insertBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.createMembership({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        command: { userId: mockUserId, role: 'player', isPlaying: true },
      });
      expect(actualResult).toEqual({
        id: mockMembershipId,
        userId: mockUserId,
        role: 'player',
        isPlaying: true,
        joinedAt: '2025-01-01T00:00:00.000Z',
        leftAt: null,
      });
    });

    it('should throw ConflictException on duplicate active membership', async () => {
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const createMembershipBuilder = createBuilder({
        singleResponse: { data: null, error: { code: '23505' }, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships' && mockFrom.mock.calls.length === 1) {
          return captainCheckBuilder;
        }
        if (table === 'team_memberships') {
          return createMembershipBuilder;
        }
        return createBuilder();
      });
      await expect(
        service.createMembership({
          actorUserId: mockUserId,
          teamId: mockTeamId,
          command: { userId: mockUserId, role: 'player', isPlaying: true },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when actor is not captain', async () => {
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [], error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainCheckBuilder;
        return createBuilder();
      });
      await expect(
        service.createMembership({
          actorUserId: mockUserId,
          teamId: mockTeamId,
          command: { userId: mockUserId, role: 'player', isPlaying: true },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('patchMembership', () => {
    it('should update membership and return DTO', async () => {
      const updatedRow = {
        id: mockMembershipId,
        user_id: mockUserId,
        role: 'captain',
        is_playing: false,
        joined_at: '2025-01-01T00:00:00.000Z',
        left_at: null,
      };
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const patchBuilder = createBuilder({
        singleResponse: { data: updatedRow, error: null, count: null },
      });
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') {
          callCount++;
          return callCount === 1 ? captainCheckBuilder : patchBuilder;
        }
        return createBuilder();
      });
      const actualResult = await service.patchMembership({
        actorUserId: mockUserId,
        teamId: mockTeamId,
        membershipId: mockMembershipId,
        command: { role: 'captain', isPlaying: false },
      });
      expect(actualResult).toEqual({
        id: mockMembershipId,
        userId: mockUserId,
        role: 'captain',
        isPlaying: false,
        joinedAt: '2025-01-01T00:00:00.000Z',
        leftAt: null,
      });
    });

    it('should throw BadRequestException when leftAt is before joinedAt', async () => {
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const fetchBuilder = createBuilder({
        singleResponse: {
          data: { joined_at: '2025-06-01T00:00:00.000Z' },
          error: null,
          count: null,
        },
      });
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') {
          callCount++;
          return callCount === 1 ? captainCheckBuilder : fetchBuilder;
        }
        return createBuilder();
      });
      await expect(
        service.patchMembership({
          actorUserId: mockUserId,
          teamId: mockTeamId,
          membershipId: mockMembershipId,
          command: { leftAt: '2025-01-01T00:00:00.000Z' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown membership', async () => {
      const captainCheckBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const patchBuilder = createBuilder({
        singleResponse: { data: null, error: { code: 'PGRST116' }, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships' && mockFrom.mock.calls.length === 1) {
          return captainCheckBuilder;
        }
        if (table === 'team_memberships') return patchBuilder;
        return createBuilder();
      });
      await expect(
        service.patchMembership({
          actorUserId: mockUserId,
          teamId: mockTeamId,
          membershipId: mockMembershipId,
          command: { role: 'player' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
