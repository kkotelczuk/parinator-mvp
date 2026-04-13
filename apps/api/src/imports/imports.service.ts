import {
  BadGatewayException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  Database,
  ImportRunDetailDto,
  ImportRunListItemDto,
  ImportTournamentAcceptedResponseDto,
  ImportTournamentCommand,
  ImportTournamentFallbackCommand,
  ImportTournamentFallbackResponseDto,
  PaginatedListDto,
} from '@parinator/schema';
import { SupabaseService } from '../supabase/supabase.service';

type TeamMembershipRow = Database['public']['Tables']['team_memberships']['Row'];
type TournamentRow = Database['public']['Tables']['tournaments']['Row'];
type ImportRunRow = Database['public']['Tables']['import_runs']['Row'];
type ImportRunInsert = Database['public']['Tables']['import_runs']['Insert'];
type SupportedImportSource = Extract<ImportRunRow['source_type'], 'champions_hub' | 'best_coast_pairings'>;
type ImportTournamentParams = {
  actorUserId: string;
  command: ImportTournamentCommand;
};
type ImportTournamentFallbackParams = {
  actorUserId: string;
  command: ImportTournamentFallbackCommand;
};
type ImportRunsListParams = {
  actorUserId: string;
  page: number;
  pageSize: number;
  sort: 'createdAt' | '-createdAt';
  sourceType?: ImportRunRow['source_type'];
  status?: ImportRunRow['status'];
  sourceUrl?: string;
};
type ControllerResponse<TBody> = {
  statusCode: HttpStatus.OK | HttpStatus.ACCEPTED;
  body: TBody;
};
type NormalizedImportPayload = {
  tournamentName: string;
  teamSize: number;
  warnings: string[];
  rosterPreview: string[];
};

const DEFAULT_TEAM_SIZE = 5;
const MAX_TEAM_SIZE = 12;
const IMPORT_FETCH_TIMEOUT_MS = 5000;
const IMPORT_PREVIEW_LENGTH = 5000;
const SUPPORTED_SOURCE_HOSTS: Record<SupportedImportSource, readonly string[]> = {
  champions_hub: ['championshub.gg', 'www.championshub.gg'],
  best_coast_pairings: ['bestcoastpairings.com', 'www.bestcoastpairings.com'],
};

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Import a tournament from a supported source URL and reuse cache when possible. */
  async importTournament(
    params: ImportTournamentParams,
  ): Promise<ControllerResponse<ImportTournamentAcceptedResponseDto>> {
    const sourceType = this.resolveSupportedImportSource(params.command.sourceType);
    const captainMembership = await this.resolveCaptainMembershipForTeam(params.actorUserId, params.command.teamId);
    const sourceUrl = this.normalizeSourceUrl(params.command.sourceUrl);
    this.assertSupportedSourceUrl(sourceType, sourceUrl);
    const sourceHash = this.createHashValue(`${sourceType}:${sourceUrl}`);
    const cachedRun = await this.fetchImportRunBySource(sourceUrl, sourceHash);
    if (cachedRun && cachedRun.status !== 'failed' && cachedRun.normalized_payload) {
      const normalizedPayload = this.readNormalizedPayload(cachedRun.normalized_payload);
      const tournament = await this.createTournamentFromImport({
        teamId: params.command.teamId,
        actorMembershipId: captainMembership.id,
        sourceType,
        sourceUrl,
        normalizedPayload,
      });
      return {
        statusCode: HttpStatus.OK,
        body: {
          importRunId: cachedRun.id,
          status: cachedRun.status,
          usedCache: true,
          tournamentId: tournament.id,
        },
      };
    }
    try {
      const scrapedImport = await this.scrapeSourceDocument({
        sourceType,
        sourceUrl,
      });
      const importRun = await this.upsertImportRun({
        sourceType,
        sourceUrl,
        sourceHash,
        status: 'success',
        rawPayload: scrapedImport.rawPayload,
        normalizedPayload: scrapedImport.normalizedPayload,
        errorMessage: null,
        createdByUserId: params.actorUserId,
      });
      const tournament = await this.createTournamentFromImport({
        teamId: params.command.teamId,
        actorMembershipId: captainMembership.id,
        sourceType,
        sourceUrl,
        normalizedPayload: scrapedImport.normalizedPayload,
      });
      return {
        statusCode: HttpStatus.ACCEPTED,
        body: {
          importRunId: importRun.id,
          status: importRun.status,
          usedCache: false,
          tournamentId: tournament.id,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scrape source URL.';
      await this.upsertImportRun({
        sourceType,
        sourceUrl,
        sourceHash,
        status: 'failed',
        rawPayload: { sourceUrl },
        normalizedPayload: null,
        errorMessage,
        createdByUserId: params.actorUserId,
      });
      throw this.createScrapingFailedException(errorMessage);
    }
  }

  /** Import a tournament from manually pasted text and persist diagnostics in import_runs. */
  async importTournamentFallback(
    params: ImportTournamentFallbackParams,
  ): Promise<ControllerResponse<ImportTournamentFallbackResponseDto>> {
    const captainMembership = await this.resolveCaptainMembershipForTeam(params.actorUserId, params.command.teamId);
    const sourceHash = this.createHashValue(params.command.rawText.trim());
    const sourceUrl = params.command.sourceUrl
      ? this.normalizeSourceUrl(params.command.sourceUrl)
      : `manual-fallback://raw/${sourceHash}`;
    const cachedRun = await this.fetchImportRunBySource(sourceUrl, sourceHash);
    if (cachedRun && cachedRun.normalized_payload) {
      const normalizedPayload = this.readNormalizedPayload(cachedRun.normalized_payload);
      const tournament = await this.createTournamentFromImport({
        teamId: params.command.teamId,
        actorMembershipId: captainMembership.id,
        sourceType: 'manual_fallback',
        sourceUrl,
        normalizedPayload,
      });
      return {
        statusCode: HttpStatus.OK,
        body: {
          importRunId: cachedRun.id,
          status: cachedRun.status,
          tournamentId: tournament.id,
          warnings: normalizedPayload.warnings,
        },
      };
    }
    const parsedFallback = this.parseFallbackText({
      rawText: params.command.rawText,
      sourceUrl: params.command.sourceUrl,
    });
    const importRun = await this.upsertImportRun({
      sourceType: 'manual_fallback',
      sourceUrl,
      sourceHash,
      status: parsedFallback.warnings.length === 0 ? 'success' : 'partial_success',
      rawPayload: { rawText: params.command.rawText },
      normalizedPayload: parsedFallback,
      errorMessage: null,
      createdByUserId: params.actorUserId,
    });
    const tournament = await this.createTournamentFromImport({
      teamId: params.command.teamId,
      actorMembershipId: captainMembership.id,
      sourceType: 'manual_fallback',
      sourceUrl,
      normalizedPayload: parsedFallback,
    });
    return {
      statusCode: HttpStatus.ACCEPTED,
      body: {
        importRunId: importRun.id,
        status: importRun.status,
        tournamentId: tournament.id,
        warnings: parsedFallback.warnings,
      },
    };
  }

  /** List import run diagnostics for captains. */
  async listImportRuns(params: ImportRunsListParams): Promise<PaginatedListDto<ImportRunListItemDto>> {
    await this.ensureCaptainAccess(params.actorUserId);
    const offset = (params.page - 1) * params.pageSize;
    const { ascending } = this.resolveImportRunSort(params.sort);
    let query = this.supabaseService
      .getClient()
      .from('import_runs')
      .select('id, source_type, source_url, status, created_at', { count: 'exact' });
    if (params.sourceType) {
      query = query.eq('source_type', params.sourceType);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.sourceUrl) {
      query = query.ilike('source_url', `%${params.sourceUrl}%`);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending })
      .range(offset, offset + params.pageSize - 1);
    if (error || !data) {
      this.logger.error('Failed to list import runs', error);
      throw this.createInternalErrorException();
    }
    return {
      data: data.map((row) => this.mapImportRunListItem(row)),
      pagination: this.createPagination(params.page, params.pageSize, count ?? 0),
    };
  }

  /** Return detailed diagnostics for a single import run. */
  async getImportRunDetail(actorUserId: string, importRunId: string): Promise<ImportRunDetailDto> {
    await this.ensureCaptainAccess(actorUserId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('import_runs')
      .select('*')
      .eq('id', importRunId)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch import run detail', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw new NotFoundException({
        error: { code: 'IMPORT_RUN_NOT_FOUND', message: 'Import run not found.', details: {} },
      });
    }
    return this.mapImportRunDetail(data);
  }

  private async scrapeSourceDocument(params: {
    sourceType: SupportedImportSource;
    sourceUrl: string;
  }): Promise<{ normalizedPayload: NormalizedImportPayload; rawPayload: Record<string, string> }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMPORT_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(params.sourceUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Source returned HTTP ${response.status}.`);
      }
      const html = await response.text();
      const tournamentName = this.extractTournamentNameFromHtml(html, params.sourceUrl);
      const teamSize = this.extractTeamSize(html, tournamentName);
      return {
        normalizedPayload: {
          tournamentName,
          teamSize,
          warnings: [],
          rosterPreview: [],
        },
        rawPayload: {
          fetchedAt: new Date().toISOString(),
          pageTitle: tournamentName,
          preview: html.slice(0, IMPORT_PREVIEW_LENGTH),
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseFallbackText(params: {
    rawText: string;
    sourceUrl?: string;
  }): NormalizedImportPayload {
    const lines = params.rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const warnings: string[] = [];
    const tournamentName = this.extractTournamentNameFromFallback(lines, params.sourceUrl);
    const rosterPreview = lines.slice(0, DEFAULT_TEAM_SIZE);
    const detectedPlayerLines = lines.filter((line) => /^(\d+[).\s-]+|-|\*)\s+/.test(line));
    const detectedTeamSize = detectedPlayerLines.length >= DEFAULT_TEAM_SIZE
      ? Math.min(detectedPlayerLines.length, MAX_TEAM_SIZE)
      : DEFAULT_TEAM_SIZE;
    if (detectedPlayerLines.length < DEFAULT_TEAM_SIZE) {
      warnings.push('Could not confidently determine team size from pasted text; defaulted to 5 players.');
    }
    if (lines.length > rosterPreview.length) {
      warnings.push('Could not parse the full pasted text structure; only a preview was normalized.');
    }
    return {
      tournamentName,
      teamSize: detectedTeamSize,
      warnings,
      rosterPreview,
    };
  }

  private extractTournamentNameFromHtml(html: string, sourceUrl: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch?.[1]?.trim();
    if (rawTitle && rawTitle.length > 0) {
      return this.sanitizeTournamentName(rawTitle);
    }
    return this.deriveTournamentNameFromUrl(sourceUrl);
  }

  private extractTournamentNameFromFallback(lines: string[], sourceUrl?: string): string {
    for (const line of lines) {
      const explicitMatch = line.match(/^(tournament|event)\s*[:-]\s*(.+)$/i);
      if (explicitMatch?.[2]) {
        return this.sanitizeTournamentName(explicitMatch[2]);
      }
    }
    if (sourceUrl) {
      return this.deriveTournamentNameFromUrl(sourceUrl);
    }
    if (lines[0]) {
      return this.sanitizeTournamentName(lines[0]);
    }
    return 'Manual fallback import';
  }

  private extractTeamSize(html: string, tournamentName: string): number {
    const teamSizeRegex = /\b([5-9]|1[0-2])\s*(?:v|vs|man|player)/i;
    const match = `${tournamentName} ${html}`.match(teamSizeRegex);
    const parsedValue = Number(match?.[1]);
    if (!Number.isNaN(parsedValue) && parsedValue >= DEFAULT_TEAM_SIZE) {
      return Math.min(parsedValue, MAX_TEAM_SIZE);
    }
    return DEFAULT_TEAM_SIZE;
  }

  private deriveTournamentNameFromUrl(sourceUrl: string): string {
    const parsedUrl = new URL(sourceUrl);
    const lastSegment = parsedUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .at(-1);
    if (!lastSegment) {
      return parsedUrl.hostname;
    }
    return this.sanitizeTournamentName(lastSegment.replace(/[-_]+/g, ' '));
  }

  private sanitizeTournamentName(value: string): string {
    const sanitized = value.replace(/\s+/g, ' ').trim();
    return sanitized.length > 120 ? sanitized.slice(0, 120).trim() : sanitized;
  }

  private normalizeSourceUrl(sourceUrl: string): string {
    const parsedUrl = new URL(sourceUrl);
    parsedUrl.hash = '';
    if ((parsedUrl.protocol === 'https:' && parsedUrl.port === '443') || (parsedUrl.protocol === 'http:' && parsedUrl.port === '80')) {
      parsedUrl.port = '';
    }
    return parsedUrl.toString();
  }

  private assertSupportedSourceUrl(sourceType: SupportedImportSource, sourceUrl: string): void {
    const parsedUrl = new URL(sourceUrl);
    const supportedHosts = SUPPORTED_SOURCE_HOSTS[sourceType];
    if (!supportedHosts.includes(parsedUrl.hostname)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'UNSUPPORTED_SOURCE',
          message: 'Source URL is not supported for the selected sourceType.',
          details: {},
        },
      });
    }
  }

  private resolveSupportedImportSource(sourceType: ImportRunRow['source_type']): SupportedImportSource {
    if (sourceType === 'champions_hub' || sourceType === 'best_coast_pairings') {
      return sourceType;
    }
    throw new UnprocessableEntityException({
      error: {
        code: 'UNSUPPORTED_SOURCE',
        message: 'Source type is not supported for URL-based imports.',
        details: {},
      },
    });
  }

  private createHashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async fetchImportRunBySource(sourceUrl: string, sourceHash: string): Promise<ImportRunRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('import_runs')
      .select('*')
      .eq('source_url', sourceUrl)
      .eq('source_hash', sourceHash)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to fetch import run cache', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async upsertImportRun(params: {
    sourceType: ImportRunRow['source_type'];
    sourceUrl: string;
    sourceHash: string;
    status: ImportRunRow['status'];
    rawPayload: Record<string, string>;
    normalizedPayload: NormalizedImportPayload | null;
    errorMessage: string | null;
    createdByUserId: string;
  }): Promise<ImportRunRow> {
    const row: ImportRunInsert = {
      source_type: params.sourceType,
      source_url: params.sourceUrl,
      source_hash: params.sourceHash,
      status: params.status,
      raw_payload: params.rawPayload as ImportRunInsert['raw_payload'],
      normalized_payload: params.normalizedPayload as ImportRunInsert['normalized_payload'],
      error_message: params.errorMessage,
      created_by_user_id: params.createdByUserId,
    };
    const { data, error } = await this.supabaseService
      .getClient()
      .from('import_runs')
      .upsert(row, { onConflict: 'source_url,source_hash' })
      .select('*')
      .single();
    if (error || !data) {
      this.logger.error('Failed to persist import run', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private readNormalizedPayload(payload: ImportRunRow['normalized_payload']): NormalizedImportPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw this.createInternalErrorException();
    }
    const tournamentName = typeof payload.tournamentName === 'string' ? payload.tournamentName : null;
    const teamSize = typeof payload.teamSize === 'number' ? payload.teamSize : null;
    const warnings = Array.isArray(payload.warnings) ? payload.warnings.filter((item): item is string => typeof item === 'string') : [];
    const rosterPreview = Array.isArray(payload.rosterPreview)
      ? payload.rosterPreview.filter((item): item is string => typeof item === 'string')
      : [];
    if (!tournamentName || !teamSize) {
      throw this.createInternalErrorException();
    }
    return { tournamentName, teamSize, warnings, rosterPreview };
  }

  private async createTournamentFromImport(params: {
    teamId: string;
    actorMembershipId: string;
    sourceType: ImportRunRow['source_type'];
    sourceUrl: string;
    normalizedPayload: NormalizedImportPayload;
  }): Promise<TournamentRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tournaments')
      .insert({
        name: params.normalizedPayload.tournamentName,
        team_id: params.teamId,
        team_size: params.normalizedPayload.teamSize,
        source_type: params.sourceType,
        source_url: params.sourceUrl,
        created_by_membership_id: params.actorMembershipId,
      })
      .select('*')
      .single();
    if (error || !data) {
      this.logger.error('Failed to create tournament from import', error);
      throw this.createInternalErrorException();
    }
    return data;
  }

  private async resolveCaptainMembershipForTeam(actorUserId: string, teamId: string): Promise<TeamMembershipRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', actorUserId)
      .eq('role', 'captain')
      .is('left_at', null)
      .maybeSingle();
    if (error) {
      this.logger.error('Failed to resolve captain membership for import', error);
      throw this.createInternalErrorException();
    }
    if (!data) {
      throw this.createForbiddenException();
    }
    return data;
  }

  private async ensureCaptainAccess(actorUserId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('team_memberships')
      .select('id')
      .eq('user_id', actorUserId)
      .eq('role', 'captain')
      .is('left_at', null)
      .limit(1);
    if (error) {
      this.logger.error('Failed to verify captain access', error);
      throw this.createInternalErrorException();
    }
    if (!data || data.length === 0) {
      throw this.createForbiddenException();
    }
  }

  private resolveImportRunSort(sort: ImportRunsListParams['sort']): { ascending: boolean } {
    if (sort === 'createdAt') {
      return { ascending: true };
    }
    return { ascending: false };
  }

  private mapImportRunListItem(
    row: Pick<ImportRunRow, 'id' | 'source_type' | 'source_url' | 'status' | 'created_at'>,
  ): ImportRunListItemDto {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapImportRunDetail(row: ImportRunRow): ImportRunDetailDto {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      sourceHash: row.source_hash,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      errorMessage: row.error_message,
      normalizedPayload: row.normalized_payload,
      rawPayload: row.raw_payload,
      createdAt: row.created_at,
    };
  }

  private createPagination(page: number, pageSize: number, total: number): {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } {
    return {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private createForbiddenException(): ForbiddenException {
    return new ForbiddenException({
      error: { code: 'FORBIDDEN', message: 'Operation is forbidden.', details: {} },
    });
  }

  private createInternalErrorException(): InternalServerErrorException {
    return new InternalServerErrorException({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.', details: {} },
    });
  }

  private createScrapingFailedException(message: string): BadGatewayException {
    return new BadGatewayException({
      error: { code: 'SCRAPING_FAILED', message, details: {} },
    });
  }
}
