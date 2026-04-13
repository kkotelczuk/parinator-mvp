import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { ImportRunsController } from './import-runs.controller';
import { ImportsService } from './imports.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockImportRunId = '770e8400-e29b-41d4-a716-446655440000';

describe('ImportRunsController', () => {
  let controller: ImportRunsController;
  const mockImportsService = {
    listImportRuns: jest.fn().mockResolvedValue({
      data: [
        {
          id: mockImportRunId,
          sourceType: 'champions_hub',
          sourceUrl: 'https://championshub.gg/events/wtc-warmup',
          status: 'success',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    getImportRunDetail: jest.fn().mockResolvedValue({
      id: mockImportRunId,
      sourceType: 'champions_hub',
      sourceUrl: 'https://championshub.gg/events/wtc-warmup',
      sourceHash: 'hash',
      status: 'success',
      createdByUserId: mockUserId,
      errorMessage: null,
      normalizedPayload: { tournamentName: 'WTC Warmup', teamSize: 5, warnings: [], rosterPreview: [] },
      rawPayload: { preview: '<title>WTC Warmup</title>' },
      createdAt: '2025-01-01T00:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportRunsController],
      providers: [
        {
          provide: ImportsService,
          useValue: mockImportsService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<ImportRunsController>(ImportRunsController);
    jest.clearAllMocks();
  });

  describe('listImportRuns', () => {
    it('should validate query and delegate to service', async () => {
      const actualResult = await controller.listImportRuns(mockUserId, {
        'filter[sourceType]': 'champions_hub',
      });
      expect(actualResult.data).toHaveLength(1);
      expect(mockImportsService.listImportRuns).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        page: 1,
        pageSize: 20,
        sort: '-createdAt',
        sourceType: 'champions_hub',
        status: undefined,
        sourceUrl: undefined,
      });
    });

    it('should reject invalid status filter', async () => {
      await expect(
        controller.listImportRuns(mockUserId, { 'filter[status]': 'unknown' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getImportRunDetail', () => {
    it('should validate UUID and delegate to service', async () => {
      const actualResult = await controller.getImportRunDetail(mockUserId, mockImportRunId);
      expect(actualResult.id).toBe(mockImportRunId);
      expect(mockImportsService.getImportRunDetail).toHaveBeenCalledWith(mockUserId, mockImportRunId);
    });

    it('should reject invalid importRunId', async () => {
      await expect(
        controller.getImportRunDetail(mockUserId, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
