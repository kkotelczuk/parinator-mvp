import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';

describe('AuditEventsController', () => {
  let controller: AuditEventsController;
  const mockAuditEventsService = {
    listAuditEvents: jest.fn().mockResolvedValue({
      data: [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          eventType: 'round_hard_reset',
          teamId: mockTeamId,
          tournamentId: '880e8400-e29b-41d4-a716-446655440000',
          roundId: '990e8400-e29b-41d4-a716-446655440000',
          metadata: {},
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditEventsController],
      providers: [
        {
          provide: AuditEventsService,
          useValue: mockAuditEventsService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<AuditEventsController>(AuditEventsController);
    jest.clearAllMocks();
  });

  describe('listAuditEvents', () => {
    it('should validate query and delegate to service', async () => {
      const actualResult = await controller.listAuditEvents(mockUserId, {
        'filter[teamId]': mockTeamId,
        'filter[eventType]': 'round_hard_reset',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(mockAuditEventsService.listAuditEvents).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        teamId: mockTeamId,
        tournamentId: undefined,
        roundId: undefined,
        eventType: 'round_hard_reset',
      });
    });

    it('should reject invalid teamId filter', async () => {
      await expect(controller.listAuditEvents(mockUserId, { 'filter[teamId]': 'not-uuid' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
