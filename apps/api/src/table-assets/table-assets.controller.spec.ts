import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TableAssetsController } from './table-assets.controller';
import { TableAssetsService } from './table-assets.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockAssetId = '770e8400-e29b-41d4-a716-446655440000';

describe('TableAssetsController', () => {
  let controller: TableAssetsController;
  const mockTableAssetsService = {
    listTableAssets: jest.fn().mockResolvedValue({
      data: [{
        id: mockAssetId,
        label: 'WTC Table 1',
        imageUrl: 'https://cdn.example.com/table-1.png',
        sourceUrl: 'https://example.com/source',
        sourceAttribution: 'Event pack',
        createdAt: '2025-01-01T00:00:00.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    createTableAsset: jest.fn().mockResolvedValue({
      id: mockAssetId,
      label: 'WTC Table 1',
      imageUrl: 'https://cdn.example.com/table-1.png',
      sourceUrl: 'https://example.com/source',
      sourceAttribution: 'Event pack',
      createdAt: '2025-01-01T00:00:00.000Z',
    }),
    patchTableAsset: jest.fn().mockResolvedValue({
      id: mockAssetId,
      label: 'Updated label',
      imageUrl: 'https://cdn.example.com/table-1.png',
      sourceUrl: 'https://example.com/source',
      sourceAttribution: 'Event pack',
      createdAt: '2025-01-01T00:00:00.000Z',
    }),
    deleteTableAsset: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableAssetsController],
      providers: [
        {
          provide: TableAssetsService,
          useValue: mockTableAssetsService,
        },
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TableAssetsController>(TableAssetsController);
    jest.clearAllMocks();
  });

  describe('listTableAssets', () => {
    it('should parse query and call service', async () => {
      const actualResult = await controller.listTableAssets({ 'filter[label]': 'WTC' });
      expect(actualResult.data).toHaveLength(1);
      expect(mockTableAssetsService.listTableAssets).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        sort: 'label',
        label: 'WTC',
      });
    });
  });

  describe('createTableAsset', () => {
    it('should validate payload and call service', async () => {
      await controller.createTableAsset(mockUserId, {
        label: 'WTC Table 1',
        imageUrl: 'https://cdn.example.com/table-1.png',
        sourceUrl: 'https://example.com/source',
        sourceAttribution: 'Event pack',
      });
      expect(mockTableAssetsService.createTableAsset).toHaveBeenCalledWith(mockUserId, {
        label: 'WTC Table 1',
        imageUrl: 'https://cdn.example.com/table-1.png',
        sourceUrl: 'https://example.com/source',
        sourceAttribution: 'Event pack',
      });
    });

    it('should reject invalid payload', async () => {
      await expect(
        controller.createTableAsset(mockUserId, { label: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('patchTableAsset', () => {
    it('should validate params and payload', async () => {
      await controller.patchTableAsset(mockUserId, mockAssetId, { label: 'Updated label' });
      expect(mockTableAssetsService.patchTableAsset).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        assetId: mockAssetId,
        command: { label: 'Updated label' },
      });
    });

    it('should reject invalid assetId', async () => {
      await expect(
        controller.patchTableAsset(mockUserId, 'not-a-uuid', { label: 'Updated label' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTableAsset', () => {
    it('should validate params and call service', async () => {
      const actualResult = await controller.deleteTableAsset(mockUserId, mockAssetId);
      expect(actualResult.deleted).toBe(true);
      expect(mockTableAssetsService.deleteTableAsset).toHaveBeenCalledWith(mockUserId, mockAssetId);
    });
  });
});
