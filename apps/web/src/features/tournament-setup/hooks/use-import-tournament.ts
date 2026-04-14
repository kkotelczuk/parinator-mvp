import { useState, useCallback } from "react";
import { createImportRun, createFallbackImportRun } from "../api";
import type { ImportTournamentCommand, ImportTournamentFallbackCommand } from "@parinator/schema";
import type { ImportRunStateViewModel } from "../types";
import { mapImportResponseToState } from "../mappers";

export function useImportTournament() {
  const [isPending, setIsPending] = useState(false);
  const [lastResult, setLastResult] = useState<ImportRunStateViewModel | null>(null);
  const [lastError, setLastError] = useState<unknown>(null);

  const importFromUrl = useCallback(async (data: ImportTournamentCommand) => {
    setIsPending(true);
    setLastError(null);
    try {
      const response = await createImportRun(data);
      const state = mapImportResponseToState(response, data.sourceType, data.sourceUrl);
      setLastResult(state);
      return state;
    } catch (err: unknown) {
      setLastError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  const importFromFallback = useCallback(async (data: ImportTournamentFallbackCommand) => {
    setIsPending(true);
    setLastError(null);
    try {
      const response = await createFallbackImportRun(data);
      const state = mapImportResponseToState(response, "manual_fallback", data.sourceUrl);
      setLastResult(state);
      return state;
    } catch (err: unknown) {
      setLastError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLastResult(null);
    setLastError(null);
    setIsPending(false);
  }, []);

  return {
    isPending,
    lastResult,
    lastError,
    importFromUrl,
    importFromFallback,
    reset,
  };
}
