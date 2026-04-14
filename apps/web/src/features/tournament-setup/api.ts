import type { 
  ImportTournamentCommand,
  ImportTournamentAcceptedResponseDto,
  ImportTournamentFallbackCommand,
  ImportTournamentFallbackResponseDto,
  TournamentDetailDto,
  PatchTournamentCommand,
  TournamentDto,
  PaginatedListDto,
  RoundSummaryDto,
  CreateRoundCommand,
  RoundDto,
  PatchRoundCommand,
  ActivateRoundResponseDto,
  RoundTableDto,
  PutRoundTablesCommand,
  PutRoundTablesResponseDto,
  TableAssetDto,
  LockSetupResponseDto
} from "@parinator/schema";

function getAuthHeaders() {
  if (typeof document === 'undefined') return { "Content-Type": "application/json" };
  const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw {
      status: response.status,
      ...errorData
    };
  }

  return response.json();
}

export async function createImportRun(data: ImportTournamentCommand): Promise<ImportTournamentAcceptedResponseDto> {
  return fetchWithAuth("/api/v1/imports/tournaments", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function createFallbackImportRun(data: ImportTournamentFallbackCommand): Promise<ImportTournamentFallbackResponseDto> {
  return fetchWithAuth("/api/v1/imports/tournaments/fallback", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getTournament(tournamentId: string): Promise<TournamentDetailDto> {
  return fetchWithAuth(`/api/v1/tournaments/${tournamentId}`);
}

export async function updateTournament(tournamentId: string, data: PatchTournamentCommand): Promise<TournamentDto> {
  return fetchWithAuth(`/api/v1/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function getTournamentRounds(tournamentId: string): Promise<PaginatedListDto<RoundSummaryDto>> {
  return fetchWithAuth(`/api/v1/tournaments/${tournamentId}/rounds`);
}

export async function createRound(tournamentId: string, data: CreateRoundCommand): Promise<RoundDto> {
  return fetchWithAuth(`/api/v1/tournaments/${tournamentId}/rounds`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getRound(roundId: string): Promise<RoundDto> {
  return fetchWithAuth(`/api/v1/rounds/${roundId}`);
}

export async function updateRound(roundId: string, data: PatchRoundCommand): Promise<RoundDto> {
  return fetchWithAuth(`/api/v1/rounds/${roundId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function activateRound(roundId: string): Promise<ActivateRoundResponseDto> {
  return fetchWithAuth(`/api/v1/rounds/${roundId}/activate`, {
    method: "POST"
  });
}

export async function getRoundTables(roundId: string): Promise<RoundTableDto[]> {
  const result = await fetchWithAuth(`/api/v1/rounds/${roundId}/tables`);
  return result.data || result; // API might wrap it in { data: [] }
}

export async function updateRoundTables(roundId: string, data: PutRoundTablesCommand): Promise<PutRoundTablesResponseDto> {
  return fetchWithAuth(`/api/v1/rounds/${roundId}/tables`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function getTableAssets(): Promise<PaginatedListDto<TableAssetDto>> {
  return fetchWithAuth(`/api/v1/table-assets`);
}

export async function lockSetup(tournamentId: string): Promise<LockSetupResponseDto> {
  return fetchWithAuth(`/api/v1/tournaments/${tournamentId}/lock-setup`, {
    method: "POST"
  });
}
