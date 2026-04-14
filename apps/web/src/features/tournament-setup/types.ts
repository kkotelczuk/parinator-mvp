import type { ApiErrorDto } from "@parinator/schema";

export type TournamentSetupMode = "create" | "edit";

export type ImportSourceTypeOption = "champions_hub" | "best_coast_pairings";

export type ImportSourceFormValues = { 
  name: string; 
  teamSize: number; 
  sourceType: ImportSourceTypeOption; 
  sourceUrl: string;
};

export type ImportFallbackFormValues = { 
  sourceUrl?: string; 
  rawText: string;
};

export type TournamentMetadataFormValues = { 
  name: string;
};

export type RoundFormValues = { 
  roundId?: string; 
  roundNumber: number; 
  displayName: string; 
  mission: string; 
  deployment: string; 
  opponentTeamName?: string; 
  isActive: boolean; 
  sortOrder: number;
};

export type RoundTableDraftViewModel = { 
  clientId: string; 
  tableNo: number; 
  tableName: string; 
  imageAssetId: string | null; 
  imagePreviewUrl: string | null; 
  sourceAttribution: string | null;
};

export type RoundDraftViewModel = { 
  id: string; 
  roundNumber: number; 
  displayName: string; 
  mission: string; 
  deployment: string; 
  opponentTeamName: string; 
  isActive: boolean; 
  sortOrder: number; 
  status: "editable" | "locked"; 
  tables: RoundTableDraftViewModel[]; 
  isDirty: boolean;
};

export type ImportRunStateViewModel = { 
  importRunId: string; 
  tournamentId?: string;
  status: "idle" | "pending" | "success" | "partial_success" | "error"; 
  usedCache: boolean; 
  warnings: string[]; 
  sourceType: string | null; 
  sourceUrl: string | null; 
  lastUpdatedAt: string | null;
};

export type ImportedDataSummaryViewModel = { 
  sourceLabel: string; 
  usedCache: boolean; 
  warningCount: number; 
  opponentCountLabel: string; 
  tableAssetsCoverageLabel: string;
};

export type TournamentHeaderViewModel = { 
  title: string; 
  mode: TournamentSetupMode; 
  tournamentName: string | null; 
  setupLockedAt: string | null; 
  sourceTypeLabel: string | null; 
  sourceUrl: string | null;
};

export type RoundListItemViewModel = { 
  id: string; 
  label: string; 
  subtitle: string; 
  isActive: boolean; 
  status: "editable" | "locked"; 
  hasMissingFields: boolean;
};

export type SetupBlockingIssue = { 
  id: string; 
  label: string; 
  description: string; 
  severity: "error" | "warning"; 
  targetSection: "import" | "metadata" | "rounds" | "lock";
};

export type SetupReadinessViewModel = { 
  canLock: boolean; 
  issues: SetupBlockingIssue[]; 
  hasTournament: boolean; 
  hasImportResult: boolean; 
  hasAnyRound: boolean; 
  hasExactlyOneActiveRound: boolean; 
  hasRoundsReadyForPlayers: boolean;
};

export type SetupAsyncState = { 
  isBootstrapping: boolean; 
  isImporting: boolean; 
  isSavingTournament: boolean; 
  isSavingRound: boolean; 
  isSavingTables: boolean; 
  isLocking: boolean; 
  error: ApiErrorDto["error"] | null;
};

export type TournamentSetupViewModel = { 
  header: TournamentHeaderViewModel; 
  importState: ImportRunStateViewModel | null; 
  summary: ImportedDataSummaryViewModel | null; 
  rounds: RoundDraftViewModel[]; 
  selectedRoundId: string | null; 
  readiness: SetupReadinessViewModel;
};
