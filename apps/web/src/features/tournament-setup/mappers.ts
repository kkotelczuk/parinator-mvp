import type {
  TournamentDetailDto,
  RoundSummaryDto,
  RoundDto,
  RoundTableDto,
  TableAssetDto,
  ImportTournamentFallbackResponseDto,
  ImportTournamentAcceptedResponseDto
} from "@parinator/schema";
import type {
  RoundDraftViewModel,
  RoundListItemViewModel,
  TournamentHeaderViewModel,
  TournamentSetupMode,
  ImportRunStateViewModel
} from "./types";

const IMPORT_STATUS_VALUES: ReadonlyArray<ImportRunStateViewModel["status"]> = [
  "idle",
  "pending",
  "success",
  "partial_success",
  "error",
];

export function mapTournamentToHeader(
  mode: TournamentSetupMode,
  tournament: TournamentDetailDto | null
): TournamentHeaderViewModel {
  return {
    mode,
    title: "Tournament Setup",
    tournamentName: tournament?.name || null,
    setupLockedAt: tournament?.setupLockedAt || null,
    sourceTypeLabel: tournament?.sourceType === "champions_hub" ? "Champions Hub" : tournament?.sourceType === "best_coast_pairings" ? "Best Coast Pairings" : tournament?.sourceType === "manual_fallback" ? "Manual Override" : null,
    sourceUrl: tournament?.sourceUrl || null,
  };
}

export function mapRoundListItems(
  rounds: RoundSummaryDto[]
): RoundListItemViewModel[] {
  return rounds.map((r) => ({
    id: r.id,
    label: r.displayName || `Round ${r.roundNumber}`,
    subtitle: r.status === "locked" ? "Ready" : "Edit to setup",
    isActive: r.isActive,
    status: r.status,
    hasMissingFields: false, // We'll compute this more accurately based on deep details if needed, but summary doesn't have it all. For simple UI, assume 'true' if we need mission, deployment, etc.
  }));
}

export function mapRoundToDraft(
  round: RoundDto,
  tables: RoundTableDto[],
  assets: TableAssetDto[]
): RoundDraftViewModel {
  const assetMap = new Map(assets.map(a => [a.id, a]));

  return {
    id: round.id,
    roundNumber: round.roundNumber,
    displayName: round.displayName || "",
    mission: round.mission || "",
    deployment: round.deployment || "",
    opponentTeamName: round.opponentTeamName || "",
    isActive: round.isActive,
    sortOrder: round.sortOrder,
    status: round.status,
    isDirty: false,
    tables: tables.map(t => {
      const asset = t.imageAssetId ? assetMap.get(t.imageAssetId) : null;
      return {
        clientId: t.id, // For existing tables, use their ID
        tableNo: t.tableNo,
        tableName: t.tableName || "",
        imageAssetId: t.imageAssetId || null,
        imagePreviewUrl: asset?.imageUrl || null,
        sourceAttribution: asset?.sourceAttribution || null,
      };
    })
  };
}

// Additional mappers can be added for the Import status based on how the responses come back.
export function mapImportResponseToState(
  response: ImportTournamentAcceptedResponseDto | ImportTournamentFallbackResponseDto,
  sourceType: string | null = null,
  sourceUrl: string | null = null
): ImportRunStateViewModel {
  const warnings = "warnings" in response ? response.warnings : [];
  const usedCache = "usedCache" in response ? response.usedCache : false;
  
  const status = IMPORT_STATUS_VALUES.includes(response.status as ImportRunStateViewModel["status"])
    ? (response.status as ImportRunStateViewModel["status"])
    : "error";

  return {
    importRunId: response.importRunId,
    tournamentId: "tournamentId" in response ? response.tournamentId : undefined,
    status,
    usedCache,
    warnings,
    sourceType,
    sourceUrl,
    lastUpdatedAt: new Date().toISOString()
  };
}
