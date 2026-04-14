"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  getTournament, getTournamentRounds, getTableAssets,
  updateTournament, createRound, updateRound, activateRound, updateRoundTables, lockSetup 
} from "../api";
import { mapTournamentToHeader } from "../mappers";
import type { 
  TournamentSetupMode, 
  TournamentSetupViewModel, 
  SetupAsyncState, 
  TournamentMetadataFormValues,
  RoundFormValues,
  RoundTableDraftViewModel,
  ImportRunStateViewModel,
  ImportedDataSummaryViewModel
} from "../types";
import type { 
  TournamentDetailDto, 
  RoundSummaryDto, 
  TableAssetDto, 
  ApiErrorDto 
} from "@parinator/schema";

export interface UseTournamentSetupOptions {
  mode: TournamentSetupMode;
  initialTournament: TournamentDetailDto | null;
  initialRounds: RoundSummaryDto[];
  activeTeamId: string;
  activeMembershipId: string;
}

function mapUnknownErrorToApiError(error: unknown): ApiErrorDto["error"] {
  if (typeof error === "object" && error !== null && "error" in error) {
    const nestedError = (error as { error?: unknown }).error;
    if (typeof nestedError === "object" && nestedError !== null && "message" in nestedError) {
      const messageValue = (nestedError as { message?: unknown }).message;
      return {
        code: ((nestedError as { code?: string }).code ?? "ERR"),
        message: typeof messageValue === "string" ? messageValue : "Failed",
        details: ((nestedError as { details?: Record<string, unknown> }).details ?? {}),
      };
    }
  }
  if (error instanceof Error) {
    return {
      code: "ERR",
      message: error.message,
      details: {},
    };
  }
  return {
    code: "ERR",
    message: "Failed",
    details: {},
  };
}

export function useTournamentSetup({ 
  mode, initialTournament, initialRounds, activeTeamId, activeMembershipId 
}: UseTournamentSetupOptions) {
  const [asyncState, setAsyncState] = useState<SetupAsyncState>({
    isBootstrapping: false,
    isImporting: false,
    isSavingTournament: false,
    isSavingRound: false,
    isSavingTables: false,
    isLocking: false,
    error: null,
  });

  const [header, setHeader] = useState(() => mapTournamentToHeader(mode, initialTournament));
  const [importState, setImportState] = useState<ImportRunStateViewModel | null>(null);
  const [summary, setSummary] = useState<ImportedDataSummaryViewModel | null>(null);
  const [roundSummaries, setRoundSummaries] = useState<RoundSummaryDto[]>(initialRounds);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [tableAssets, setTableAssets] = useState<TableAssetDto[]>([]);
  const [tournament, setTournament] = useState<TournamentDetailDto | null>(initialTournament);

  useEffect(() => {
    // Optionally pre-fetch table assets
    getTableAssets().then(res => setTableAssets(res.data)).catch(() => {});
  }, []);

  const refreshTournament = useCallback(async (tournamentId: string): Promise<void> => {
    try {
      const data = await getTournament(tournamentId);
      setTournament(data);
      setHeader(mapTournamentToHeader(mode, data));
      const roundsData = await getTournamentRounds(tournamentId);
      setRoundSummaries(roundsData.data);
    } catch (err) {
      console.error(err);
    }
  }, [mode]);

  // Derived readiness logic based on current context
  const readiness = {
    canLock: false,
    issues: [],
    hasTournament: !!tournament,
    hasImportResult: true, // simplified for now
    hasAnyRound: roundSummaries.length > 0,
    hasExactlyOneActiveRound: roundSummaries.filter(r => r.isActive).length === 1,
    hasRoundsReadyForPlayers: roundSummaries.every(r => r.status === "locked" || r.displayName)
  }; // TODO: proper readiness logic

  const viewModel: TournamentSetupViewModel = {
    header,
    importState,
    summary,
    rounds: [], // Full drafts fetched on demand
    selectedRoundId,
    readiness,
  };

  const saveTournamentMetadata = async (values: TournamentMetadataFormValues, tId: string) => {
    try {
      setAsyncState(p => ({ ...p, isSavingTournament: true, error: null }));
      await updateTournament(tId, { name: values.name });
      await refreshTournament(tId);
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isSavingTournament: false }));
    }
  };

  const handleCreateRound = async (tId: string, values: RoundFormValues) => {
    try {
      setAsyncState(p => ({ ...p, isSavingRound: true, error: null }));
      await createRound(tId, {
        roundNumber: values.roundNumber,
        displayName: values.displayName,
        mission: values.mission,
        deployment: values.deployment,
        opponentTeamName: values.opponentTeamName || null,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      });
      await refreshTournament(tId);
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isSavingRound: false }));
    }
  };

  const handleUpdateRound = async (tId: string, roundId: string, values: RoundFormValues) => {
    try {
      setAsyncState(p => ({ ...p, isSavingRound: true, error: null }));
      await updateRound(roundId, {
        displayName: values.displayName,
        mission: values.mission,
        deployment: values.deployment,
        opponentTeamName: values.opponentTeamName || null,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      });
      await refreshTournament(tId);
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isSavingRound: false }));
    }
  };

  const handleActivateRound = async (tId: string, roundId: string) => {
    try {
      setAsyncState(p => ({ ...p, isSavingRound: true, error: null }));
      await activateRound(roundId);
      await refreshTournament(tId);
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isSavingRound: false }));
    }
  };

  const saveRoundTables = async (roundId: string, tables: RoundTableDraftViewModel[]) => {
    try {
      setAsyncState(p => ({ ...p, isSavingTables: true, error: null }));
      await updateRoundTables(roundId, {
        tables: tables.map(t => ({
          tableNo: t.tableNo,
          tableName: t.tableName,
          imageAssetId: t.imageAssetId
        }))
      });
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isSavingTables: false }));
    }
  };

  const handleLockSetup = async (tId: string) => {
    try {
      setAsyncState(p => ({ ...p, isLocking: true, error: null }));
      await lockSetup(tId);
      await refreshTournament(tId);
    } catch (error: unknown) {
      setAsyncState((previousValue) => ({ ...previousValue, error: mapUnknownErrorToApiError(error) }));
      throw error;
    } finally {
      setAsyncState(p => ({ ...p, isLocking: false }));
    }
  };

  return {
    viewModel,
    asyncState,
    tournament,
    roundSummaries,
    tableAssets,
    actions: {
      saveTournamentMetadata,
      createRound: handleCreateRound,
      updateRound: handleUpdateRound,
      activateRound: handleActivateRound,
      saveRoundTables,
      lockSetup: handleLockSetup,
      selectRound: setSelectedRoundId,
      refresh: refreshTournament
    }
  };
}
