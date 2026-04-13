import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { JoinCodesService } from './join-codes.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';
const mockCodeId = '990e8400-e29b-41d4-a716-446655440000';

type BuilderResponse = { data: unknown; error: { code?: string; message?: string } | null; count?: number | null };

function createBuilder(options: {
  defaultResponse?: BuilderResponse;
  singleResponse?: BuilderResponse;
  maybeSingleResponse?: BuilderResponse;
} = {}) {
  const builder: Record<string, jest.Mock | unknown> = {
    data: options.defaultResponse?.data ?? null,
    error: options.defaultResponse?.error ?? null,
    count: options.defaultResponse?.count ?? null,
  };
  builder.select = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.gt = jest.fn().mockReturnValue(builder);
  builder.in = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
  builder.delete = jest.fn().mockReturnValue(builder);
  builder.is = jest.fn().mockReturnValue(builder);
  builder.single = jest
    .fn()
    .mockResolvedValue(options.singleResponse ?? { data: null, error: null, count: null });
  builder.maybeSingle = jest
    .fn()
    .mockResolvedValue(options.maybeSingleResponse ?? { data: null, error: null, count: null });
  return builder;
}

const futureDate = new Date(Date.now() + 3_600_000).toISOString();
const pastDate = new Date(Date.now() - 3_600_000).toISOString();

const mockTournamentRow = {
  id: mockTournamentId,
  name: 'WTC Warmup',
  status: 'active',
  team_id: mockTeamId,
  team_size: 5,
  setup_locked_at: null,
  closed_at: null,
  source_type: null,
  source_url: null,
  created_by_membership_id: mockMembershipId,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const mockJoinCodeRow = {
  id: mockCodeId,
  team_id: mockTeamId,
  tournament_id: mockTournamentId,
  code: '123456',
  status: 'active',
  remaining_uses: 3,
  generated_by_membership_id: mockMembershipId,
  revoked_at: null,
  expires_at: futureDate,
  created_at: '2025-01-01T00:00:00.000Z',
};

describe('JoinCodesService', () => {
  let service: JoinCodesService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinCodesService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<JoinCodesService>(JoinCodesService);
  });

  describe('getActiveJoinCode', () => {
    it('should return active join code when found', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: mockJoinCodeRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') return codeBuilder;
        return createBuilder();
      });
      const actualResult = await service.getActiveJoinCode(mockUserId, mockTournamentId);
      expect(actualResult.id).toBe(mockCodeId);
      expect(actualResult.code).toBe('123456');
      expect(actualResult.remainingUses).toBe(3);
    });

    it('should throw NotFoundException when no active code exists', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') return codeBuilder;
        return createBuilder();
      });
      await expect(
        service.getActiveJoinCode(mockUserId, mockTournamentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when code is expired', async () => {
      const expiredCode = { ...mockJoinCodeRow, expires_at: pastDate };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: expiredCode, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') return codeBuilder;
        return createBuilder();
      });
      await expect(
        service.getActiveJoinCode(mockUserId, mockTournamentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when actor is not captain', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: null, error: { code: 'PGRST116' }, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.getActiveJoinCode(mockUserId, mockTournamentId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateJoinCode', () => {
    it('should generate a new join code', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const deactivateBuilder = createBuilder({
        defaultResponse: { data: null, error: null, count: null },
      });
      const insertBuilder = createBuilder({
        singleResponse: { data: mockJoinCodeRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') {
          const builder = createBuilder({
            defaultResponse: { data: null, error: null, count: null },
            singleResponse: { data: mockJoinCodeRow, error: null, count: null },
          });
          return builder;
        }
        return createBuilder();
      });
      const actualResult = await service.generateJoinCode({
        actorUserId: mockUserId,
        tournamentId: mockTournamentId,
        command: { ttlMinutes: 120 },
      });
      expect(actualResult.code).toBeDefined();
      expect(actualResult.status).toBe('active');
    });

    it('should throw ConflictException when tournament is not active', async () => {
      const closedTournament = { ...mockTournamentRow, status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' };
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: closedTournament, error: null, count: null },
      });
      mockFrom.mockImplementation(() => tournamentBuilder);
      await expect(
        service.generateJoinCode({
          actorUserId: mockUserId,
          tournamentId: mockTournamentId,
          command: { ttlMinutes: 120 },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeJoinCode', () => {
    it('should revoke active join code', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: mockJoinCodeRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') return codeBuilder;
        return createBuilder();
      });
      const actualResult = await service.revokeJoinCode(mockUserId, mockTournamentId);
      expect(actualResult).toEqual({ revoked: true });
    });

    it('should throw NotFoundException when no active code to revoke', async () => {
      const tournamentBuilder = createBuilder({
        maybeSingleResponse: { data: mockTournamentRow, error: null, count: null },
      });
      const captainBuilder = createBuilder({
        singleResponse: { data: { id: mockMembershipId }, error: null, count: null },
      });
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tournaments') return tournamentBuilder;
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'join_codes') return codeBuilder;
        return createBuilder();
      });
      await expect(
        service.revokeJoinCode(mockUserId, mockTournamentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('redeemJoinCode', () => {
    it('should throw NotFoundException when code does not exist', async () => {
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation(() => codeBuilder);
      await expect(
        service.redeemJoinCode({ actorUserId: mockUserId, code: '999999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when code is expired', async () => {
      const expiredCode = { ...mockJoinCodeRow, expires_at: pastDate };
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: expiredCode, error: null, count: null },
      });
      mockFrom.mockImplementation(() => codeBuilder);
      await expect(
        service.redeemJoinCode({ actorUserId: mockUserId, code: '123456' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when code has no remaining uses', async () => {
      const exhaustedCode = { ...mockJoinCodeRow, remaining_uses: 0 };
      const codeBuilder = createBuilder({
        maybeSingleResponse: { data: exhaustedCode, error: null, count: null },
      });
      mockFrom.mockImplementation(() => codeBuilder);
      await expect(
        service.redeemJoinCode({ actorUserId: mockUserId, code: '123456' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
