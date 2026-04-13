import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockTeamId = '660e8400-e29b-41d4-a716-446655440000';
const mockImportRunId = '770e8400-e29b-41d4-a716-446655440000';
const mockTournamentId = '880e8400-e29b-41d4-a716-446655440000';

describe('ImportsController', () => {
  let controller: ImportsController;
  const mockImportsService = {
    importTournament: jest.fn().mockResolvedValue({
      statusCode: HttpStatus.ACCEPTED,
      body: {
        importRunId: mockImportRunId,
        status: 'success',
        usedCache: false,
        tournamentId: mockTournamentId,
      },
    }),
    importTournamentFallback: jest.fn().mockResolvedValue({
      statusCode: HttpStatus.OK,
      body: {
        importRunId: mockImportRunId,
        status: 'partial_success',
        tournamentId: mockTournamentId,
        warnings: ['Could not parse player 4 list fully'],
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportsController],
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
    controller = module.get<ImportsController>(ImportsController);
    jest.clearAllMocks();
  });

  describe('importTournament', () => {
    it('should validate body, delegate to service, and set accepted status', async () => {
      const mockResponseStatus = jest.fn().mockReturnThis();
      const mockResponse = { status: mockResponseStatus } as unknown as Response;
      const actualResult = await controller.importTournament(
        mockUserId,
        {
          sourceType: 'champions_hub',
          sourceUrl: 'https://championshub.gg/events/wtc-warmup',
          teamId: mockTeamId,
        },
        mockResponse,
      );
      expect(actualResult.importRunId).toBe(mockImportRunId);
      expect(mockImportsService.importTournament).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        command: {
          sourceType: 'champions_hub',
          sourceUrl: 'https://championshub.gg/events/wtc-warmup',
          teamId: mockTeamId,
        },
      });
      expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
    });

    it('should reject unsupported payload shape', async () => {
      const mockResponseStatus = jest.fn().mockReturnThis();
      const mockResponse = { status: mockResponseStatus } as unknown as Response;
      await expect(
        controller.importTournament(
          mockUserId,
          { sourceType: 'manual_fallback', sourceUrl: 'https://example.com', teamId: mockTeamId },
          mockResponse,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('importTournamentFallback', () => {
    it('should validate fallback payload and return warnings', async () => {
      const mockResponse = { status: jest.fn().mockReturnThis() } as unknown as Response;
      const actualResult = await controller.importTournamentFallback(
        mockUserId,
        {
          teamId: mockTeamId,
          rawText: 'Tournament: WTC Warmup\n- Player One\n- Player Two',
        },
        mockResponse,
      );
      expect(actualResult.status).toBe('partial_success');
      expect(actualResult.warnings).toHaveLength(1);
      expect(mockImportsService.importTournamentFallback).toHaveBeenCalledWith({
        actorUserId: mockUserId,
        command: {
          teamId: mockTeamId,
          sourceUrl: undefined,
          rawText: 'Tournament: WTC Warmup\n- Player One\n- Player Two',
        },
      });
      expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should reject empty fallback text', async () => {
      const mockResponse = { status: jest.fn().mockReturnThis() } as unknown as Response;
      await expect(
        controller.importTournamentFallback(
          mockUserId,
          { teamId: mockTeamId, rawText: '   ' },
          mockResponse,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
