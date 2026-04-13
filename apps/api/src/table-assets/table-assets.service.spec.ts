import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { TableAssetsService } from './table-assets.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockAssetId = '770e8400-e29b-41d4-a716-446655440000';

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
  builder.ilike = jest.fn().mockReturnValue(builder);
  builder.order = jest.fn().mockReturnValue(builder);
  builder.range = jest
    .fn()
    .mockResolvedValue(options.rangeResponse ?? { data: [], error: null, count: 0 });
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
  builder.delete = jest.fn().mockReturnValue(builder);
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
  return builder;
}

const mockAssetRow = {
  id: mockAssetId,
  label: 'WTC Table 1',
  image_url: 'https://cdn.example.com/table-1.png',
  source_url: 'https://example.com/source',
  source_attribution: 'Event pack',
  created_at: '2025-01-01T00:00:00.000Z',
};

describe('TableAssetsService', () => {
  let service: TableAssetsService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TableAssetsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();
    service = module.get<TableAssetsService>(TableAssetsService);
  });

  describe('listTableAssets', () => {
    it('should return paginated list', async () => {
      const tableAssetsBuilder = createBuilder({
        rangeResponse: { data: [mockAssetRow], error: null, count: 1 },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'table_assets') return tableAssetsBuilder;
        return createBuilder();
      });
      const actualResult = await service.listTableAssets({
        page: 1,
        pageSize: 20,
        sort: 'label',
      });
      expect(actualResult.data[0]?.id).toBe(mockAssetId);
      expect(actualResult.pagination.total).toBe(1);
    });
  });

  describe('createTableAsset', () => {
    it('should create asset for captain', async () => {
      const captainBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const tableAssetsBuilder = createBuilder({
        singleResponse: { data: mockAssetRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'table_assets') return tableAssetsBuilder;
        return createBuilder();
      });
      const actualResult = await service.createTableAsset(mockUserId, {
        label: 'WTC Table 1',
        imageUrl: 'https://cdn.example.com/table-1.png',
        sourceUrl: 'https://example.com/source',
        sourceAttribution: 'Event pack',
      });
      expect(actualResult.label).toBe('WTC Table 1');
    });

    it('should throw ForbiddenException when user is not captain', async () => {
      const captainBuilder = createBuilder({
        limitResponse: { data: [], error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        return createBuilder();
      });
      await expect(
        service.createTableAsset(mockUserId, {
          label: 'WTC Table 1',
          imageUrl: 'https://cdn.example.com/table-1.png',
          sourceUrl: 'https://example.com/source',
          sourceAttribution: 'Event pack',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('patchTableAsset', () => {
    it('should throw NotFoundException when asset does not exist', async () => {
      const captainBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const tableAssetsBuilder = createBuilder({
        maybeSingleResponse: { data: null, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'table_assets') return tableAssetsBuilder;
        return createBuilder();
      });
      await expect(
        service.patchTableAsset({
          actorUserId: mockUserId,
          assetId: mockAssetId,
          command: { label: 'Updated label' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTableAsset', () => {
    it('should map FK violation to ASSET_IN_USE conflict', async () => {
      const captainBuilder = createBuilder({
        limitResponse: { data: [{ id: 'captain-membership' }], error: null, count: null },
      });
      const tableAssetsBuilder = createBuilder({
        defaultResponse: { data: null, error: { code: '23503' }, count: null },
        maybeSingleResponse: { data: mockAssetRow, error: null, count: null },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_memberships') return captainBuilder;
        if (table === 'table_assets') return tableAssetsBuilder;
        return createBuilder();
      });
      await expect(
        service.deleteTableAsset(mockUserId, mockAssetId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
