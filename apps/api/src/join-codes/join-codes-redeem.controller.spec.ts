import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { JoinCodesRedeemController } from './join-codes-redeem.controller';
import { JoinCodesService } from './join-codes.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = 'aa0e8400-e29b-41d4-a716-446655440000';

const mockRedeemResponse = {
  joined: true as const,
  membershipId: mockMembershipId,
  teamId: mockTeamId,
  tournamentId: mockTournamentId,
};

describe('JoinCodesRedeemController', () => {
  let controller: JoinCodesRedeemController;
  const mockJoinCodesService = {
    redeemJoinCode: jest.fn().mockResolvedValue(mockRedeemResponse),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JoinCodesRedeemController],
      providers: [
        {
          provide: JoinCodesService,
          useValue: mockJoinCodesService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<JoinCodesRedeemController>(JoinCodesRedeemController);
    jest.clearAllMocks();
  });

  describe('redeemJoinCode', () => {
    it('should call service with validated code', async () => {
      const actualResult = await controller.redeemJoinCode(mockUserId, { code: '123456' });
      expect(actualResult).toEqual(mockRedeemResponse);
      expect(mockJoinCodesService.redeemJoinCode).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        code: '123456',
      });
    });

    it('should reject code with letters', async () => {
      await expect(
        controller.redeemJoinCode(mockUserId, { code: 'abcdef' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject code shorter than 6 digits', async () => {
      await expect(
        controller.redeemJoinCode(mockUserId, { code: '12345' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject code longer than 6 digits', async () => {
      await expect(
        controller.redeemJoinCode(mockUserId, { code: '1234567' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty body', async () => {
      await expect(
        controller.redeemJoinCode(mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject null body', async () => {
      await expect(
        controller.redeemJoinCode(mockUserId, null),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
