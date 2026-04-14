import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from './users.service';

const mockUserRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'player@example.com',
  display_name: 'Player 1',
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const expectedUserDto = {
  id: mockUserRow.id,
  email: mockUserRow.email,
  displayName: mockUserRow.display_name,
  isActive: mockUserRow.is_active,
  createdAt: mockUserRow.created_at,
  updatedAt: mockUserRow.updated_at,
};

function createMockQueryBuilder(overrides: { data?: unknown; error?: unknown } = {}) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: overrides.data ?? mockUserRow,
      error: overrides.error ?? null,
    }),
  };
  return builder;
}

function createMembershipListBuilder(
  overrides: { data?: unknown; error?: unknown } = {},
) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: overrides.data ?? [],
      error: overrides.error ?? null,
    }),
  };
  return builder;
}

describe('UsersService', () => {
  let service: UsersService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: () => ({ from: mockFrom }),
          },
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user DTO for valid user', async () => {
      const builder = createMockQueryBuilder();
      mockFrom.mockReturnValue(builder);
      const actualResult = await service.findById(mockUserRow.id);
      expect(actualResult).toEqual(expectedUserDto);
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(builder.eq).toHaveBeenCalledWith('id', mockUserRow.id);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const builder = createMockQueryBuilder({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(builder);
      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected DB error', async () => {
      const builder = createMockQueryBuilder({ data: null, error: { code: 'UNEXPECTED' } });
      mockFrom.mockReturnValue(builder);
      await expect(service.findById(mockUserRow.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('listAvailableMemberships', () => {
    it('should map active memberships to DTOs', async () => {
      const rows = [
        {
          id: 'a1111111-1111-4111-8111-111111111111',
          team_id: 'b2222222-2222-4222-8222-222222222222',
          role: 'captain' as const,
          is_playing: true,
        },
      ];
      const builder = createMembershipListBuilder({ data: rows });
      mockFrom.mockReturnValue(builder);
      const actualResult = await service.listAvailableMemberships(mockUserRow.id);
      expect(mockFrom).toHaveBeenCalledWith('team_memberships');
      expect(builder.eq).toHaveBeenCalledWith('user_id', mockUserRow.id);
      expect(builder.is).toHaveBeenCalledWith('left_at', null);
      expect(actualResult).toEqual([
        {
          membershipId: rows[0].id,
          teamId: rows[0].team_id,
          role: rows[0].role,
          isPlaying: rows[0].is_playing,
        },
      ]);
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      const builder = createMembershipListBuilder({ data: null, error: { code: 'UNEXPECTED' } });
      mockFrom.mockReturnValue(builder);
      await expect(service.listAvailableMemberships(mockUserRow.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateDisplayName', () => {
    it('should return updated user DTO', async () => {
      const updatedRow = { ...mockUserRow, display_name: 'Updated Name' };
      const builder = createMockQueryBuilder({ data: updatedRow });
      mockFrom.mockReturnValue(builder);
      const actualResult = await service.updateDisplayName(mockUserRow.id, 'Updated Name');
      expect(actualResult).toEqual({ ...expectedUserDto, displayName: 'Updated Name' });
      expect(builder.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const builder = createMockQueryBuilder({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(builder);
      await expect(
        service.updateDisplayName('nonexistent-id', 'Name'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
