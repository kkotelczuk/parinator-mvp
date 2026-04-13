import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { JoinCodesService } from './join-codes.service';
import { TournamentJoinCodeController } from './tournament-join-code.controller';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockCodeId = '990e8400-e29b-41d4-a716-446655440000';

const mockActiveCode = {
  id: mockCodeId,
  code: '123456',
  status: 'active' as const,
  remainingUses: 3,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

describe('TournamentJoinCodeController', () => {
  let controller: TournamentJoinCodeController;
  let joinCodesService: JoinCodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentJoinCodeController],
      providers: [
        {
          provide: JoinCodesService,
          useValue: {
            getActiveJoinCode: jest.fn().mockResolvedValue(mockActiveCode),
            generateJoinCode: jest.fn().mockResolvedValue(mockActiveCode),
            revokeJoinCode: jest.fn().mockResolvedValue({ revoked: true }),
          },
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TournamentJoinCodeController>(TournamentJoinCodeController);
    joinCodesService = module.get<JoinCodesService>(JoinCodesService);
  });

  describe('getActiveJoinCode', () => {
    it('should return active join code', async () => {
      const actualResult = await controller.getActiveJoinCode(mockUserId, mockTournamentId);
      expect(actualResult).toEqual(mockActiveCode);
      expect(joinCodesService.getActiveJoinCode).toHaveBeenCalledWith(mockUserId, mockTournamentId);
    });

    it('should reject invalid tournamentId UUID', async () => {
      await expect(
        controller.getActiveJoinCode(mockUserId, 'not-a-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateJoinCode', () => {
    it('should call service with validated body', async () => {
      const actualResult = await controller.generateJoinCode(mockUserId, mockTournamentId, {
        ttlMinutes: 120,
      });
      expect(actualResult).toEqual(mockActiveCode);
      expect(joinCodesService.generateJoinCode).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: { ttlMinutes: 120 },
      });
    });

    it('should reject ttlMinutes below 1', async () => {
      await expect(
        controller.generateJoinCode(mockUserId, mockTournamentId, { ttlMinutes: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ttlMinutes above 10080', async () => {
      await expect(
        controller.generateJoinCode(mockUserId, mockTournamentId, { ttlMinutes: 10081 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty body', async () => {
      await expect(
        controller.generateJoinCode(mockUserId, mockTournamentId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeJoinCode', () => {
    it('should return revoked response', async () => {
      const actualResult = await controller.revokeJoinCode(mockUserId, mockTournamentId);
      expect(actualResult).toEqual({ revoked: true });
      expect(joinCodesService.revokeJoinCode).toHaveBeenCalledWith(mockUserId, mockTournamentId);
    });

    it('should reject invalid tournamentId UUID', async () => {
      await expect(
        controller.revokeJoinCode(mockUserId, 'not-a-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
