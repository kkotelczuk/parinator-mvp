import { useState, useCallback } from "react";
import type { RoundTableDraftViewModel } from "../types";

export function useRoundEditorState() {
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [draftTablesByRoundId, setDraftTablesByRoundId] = useState<Record<string, RoundTableDraftViewModel[]>>({});
  
  const selectRound = useCallback((roundId: string | null) => {
    setSelectedRoundId(roundId);
  }, []);

  const updateDraftTables = useCallback((roundId: string, tables: RoundTableDraftViewModel[]) => {
    setDraftTablesByRoundId(prev => ({
      ...prev,
      [roundId]: tables
    }));
  }, []);

  const clearDraftTables = useCallback((roundId: string) => {
    setDraftTablesByRoundId(prev => {
      const next = { ...prev };
      delete next[roundId];
      return next;
    });
  }, []);
  
  const getDraftTables = useCallback((roundId: string) => {
    return draftTablesByRoundId[roundId] || null;
  }, [draftTablesByRoundId]);

  return {
    selectedRoundId,
    selectRound,
    updateDraftTables,
    clearDraftTables,
    getDraftTables,
  };
}
