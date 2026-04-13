import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { EstimatorSessionsController } from './estimator-sessions.controller';
import { RoundsService } from './rounds.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockRoundId = '990e8400-e29b-41d4-a716-446655440000';
const mockSessionId = '390e8400-e29b-41d4-a716-446655440000';
const mockMembershipId = '770e8400-e29b-41d4-a716-446655440000';

describe('EstimatorSessionsController', () => {
  let controller: EstimatorSessionsController;
  const mockRoundsService = {
    createEstimatorSession: jest.fn().mockResolvedValue({
      id: mockSessionId,
      roundId: mockRoundId,
      createdByMembershipId: mockMembershipId,
      createdAt: '2025-01-01T00:00:00.000Z',
    }),
    listEstimatorSessions: jest.fn().mockResolvedValue({
      data: [{
        id: mockSessionId,
        roundId: mockRoundId,
        createdByMembershipId: mockMembershipId,
        createdAt: '2025-01-01T00:00:00.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    listEstimatorEvents: jest.fn().mockResolvedValue({
      data: [{
        id: '290e8400-e29b-41d4-a716-446655440000',
        actorMembershipId: mockMembershipId,
        tileLabel: 'green',
        tileValue: 12,
        eventOrder: 1,
        clickedAt: '2025-01-01T00:01:00.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    appendEstimatorEvent: jest.fn().mockResolvedValue({
      id: '190e8400-e29b-41d4-a716-446655440000',
      actorMembershipId: mockMembershipId,
      tileLabel: 'green',
      tileValue: 12,
      eventOrder: 2,
      clickedAt: '2025-01-01T00:02:00.000Z',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatorSessionsController],
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
    controller = module.get<EstimatorSessionsController>(EstimatorSessionsController);
    jest.clearAllMocks();
  });

  it('should create estimator session for round', async () => {
    const actualResult = await controller.createEstimatorSession(mockUserId, mockRoundId);
    expect(actualResult.id).toBe(mockSessionId);
    expect(mockRoundsService.createEstimatorSession).toHaveBeenCalledWith({
      actorUserId: mockUserId,
      roundId: mockRoundId,
    });
  });

  it('should list estimator sessions with default pagination', async () => {
    const actualResult = await controller.listEstimatorSessions(mockUserId, mockRoundId, {});
    expect(actualResult.data).toHaveLength(1);
    expect(mockRoundsService.listEstimatorSessions).toHaveBeenCalledWith({
      actorUserId: mockUserId,
      roundId: mockRoundId,
      page: 1,
      pageSize: 20,
      sort: '-createdAt',
    });
  });

  it('should list estimator events sorted by event order', async () => {
    const actualResult = await controller.listEstimatorEvents(mockUserId, mockSessionId, { sort: 'eventOrder' });
    expect(actualResult.data).toHaveLength(1);
    expect(mockRoundsService.listEstimatorEvents).toHaveBeenCalledWith({
      actorUserId: mockUserId,
      sessionId: mockSessionId,
      page: 1,
      pageSize: 20,
      sort: 'eventOrder',
    });
  });

  it('should append estimator event', async () => {
    const actualResult = await controller.appendEstimatorEvent(mockUserId, mockSessionId, {
      actorMembershipId: mockMembershipId,
      tileLabel: 'green',
      tileValue: 12,
      eventOrder: 2,
    });
    expect(actualResult.eventOrder).toBe(2);
    expect(mockRoundsService.appendEstimatorEvent).toHaveBeenCalledWith({
      actorUserId: mockUserId,
      sessionId: mockSessionId,
      command: {
        actorMembershipId: mockMembershipId,
        tileLabel: 'green',
        tileValue: 12,
        eventOrder: 2,
        clickedAt: undefined,
      },
    });
  });

  it('should reject invalid session id', async () => {
    await expect(
      controller.listEstimatorEvents(mockUserId, 'not-a-uuid', {}),
    ).rejects.toThrow(BadRequestException);
  });
});
