import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUserDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'player@example.com',
  displayName: 'Player 1',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockUserDto),
            updateDisplayName: jest.fn().mockResolvedValue({
              ...mockUserDto,
              displayName: 'Updated Name',
            }),
          },
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('getMe', () => {
    it('should return the user profile', async () => {
      const actualResult = await controller.getMe(mockUserDto.id);
      expect(actualResult).toEqual(mockUserDto);
      expect(usersService.findById).toHaveBeenCalledWith(mockUserDto.id);
    });
  });

  describe('updateMe', () => {
    it('should update and return the user profile', async () => {
      const inputBody = { displayName: 'Updated Name' };
      const actualResult = await controller.updateMe(mockUserDto.id, inputBody);
      expect(actualResult.displayName).toBe('Updated Name');
      expect(usersService.updateDisplayName).toHaveBeenCalledWith(
        mockUserDto.id,
        'Updated Name',
      );
    });

    it('should trim whitespace from displayName', async () => {
      const inputBody = { displayName: '  Trimmed Name  ' };
      await controller.updateMe(mockUserDto.id, inputBody);
      expect(usersService.updateDisplayName).toHaveBeenCalledWith(
        mockUserDto.id,
        'Trimmed Name',
      );
    });

    it('should throw BadRequestException for empty displayName', async () => {
      const inputBody = { displayName: '' };
      await expect(controller.updateMe(mockUserDto.id, inputBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for whitespace-only displayName', async () => {
      const inputBody = { displayName: '   ' };
      await expect(controller.updateMe(mockUserDto.id, inputBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing displayName', async () => {
      const inputBody = {};
      await expect(controller.updateMe(mockUserDto.id, inputBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-string displayName', async () => {
      const inputBody = { displayName: 123 };
      await expect(controller.updateMe(mockUserDto.id, inputBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for displayName exceeding 100 chars', async () => {
      const inputBody = { displayName: 'a'.repeat(101) };
      await expect(controller.updateMe(mockUserDto.id, inputBody)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
