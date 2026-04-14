import React, { useEffect, useMemo, useState } from "react";
import { RoundList } from "./RoundList";
import { RoundEditorCard } from "./RoundEditorCard";
import { RoundTablesEditor } from "./RoundTablesEditor";
import { useRoundEditorState } from "../hooks/use-round-editor-state";
import { getRound, getRoundTables } from "../api";
import { mapRoundToDraft, mapRoundListItems } from "../mappers";
import type { 
  RoundSummaryDto, 
  TableAssetDto
} from "@parinator/schema";
import type { RoundDraftViewModel, RoundFormValues, RoundTableDraftViewModel } from "../types";

interface RoundSetupSectionProps {
  roundSummaries: RoundSummaryDto[];
  tableAssets: TableAssetDto[];
  selectedRoundId: string | null;
  onSelectRound: (id: string | null) => void;
  isLocked: boolean;
  onCreateRound: (values: RoundFormValues) => Promise<void>;
  onSaveRound: (roundId: string, values: RoundFormValues) => Promise<void>;
  onActivateRound: (roundId: string) => Promise<void>;
  onSaveTables: (roundId: string, tables: RoundTableDraftViewModel[]) => Promise<void>;
  isSavingRound: boolean;
  isSavingTables: boolean;
}

export function RoundSetupSection({
  roundSummaries,
  tableAssets,
  selectedRoundId,
  onSelectRound,
  isLocked,
  onCreateRound,
  onSaveRound,
  onActivateRound,
  onSaveTables,
  isSavingRound,
  isSavingTables
}: RoundSetupSectionProps) {
  const { updateDraftTables, getDraftTables } = useRoundEditorState();
  const [fetchedDraft, setFetchedDraft] = useState<RoundDraftViewModel | null>(null);

  useEffect(() => {
    if (!selectedRoundId || selectedRoundId === "NEW") {
      return;
    }
    let isActive = true;
    const executeLoadRound = async (): Promise<void> => {
      try {
        const [round, tables] = await Promise.all([
          getRound(selectedRoundId),
          getRoundTables(selectedRoundId),
        ]);
        if (!isActive) {
          return;
        }
        const draft = mapRoundToDraft(round, tables, tableAssets);
        setFetchedDraft(draft);
        updateDraftTables(draft.id, draft.tables);
      } catch (error: unknown) {
        console.error("Failed to fetch round details", error);
      }
    };
    void executeLoadRound();
    return () => {
      isActive = false;
    };
  }, [selectedRoundId, tableAssets, updateDraftTables]);

  const newRoundDraft = useMemo<RoundDraftViewModel | null>(() => {
    if (selectedRoundId !== "NEW") {
      return null;
    }
    const maxOrder = roundSummaries.length > 0 ? Math.max(...roundSummaries.map((roundSummary) => roundSummary.sortOrder)) : 0;
    const nextRoundNo = roundSummaries.length > 0 ? Math.max(...roundSummaries.map((roundSummary) => roundSummary.roundNumber)) + 1 : 1;
    return {
      id: "NEW",
      roundNumber: nextRoundNo,
      displayName: `Round ${nextRoundNo}`,
      mission: "",
      deployment: "",
      opponentTeamName: "",
      isActive: false,
      sortOrder: maxOrder + 1,
      status: "editable",
      tables: [],
      isDirty: false,
    };
  }, [roundSummaries, selectedRoundId]);

  const activeDraft = useMemo<RoundDraftViewModel | null>(() => {
    if (!selectedRoundId) {
      return null;
    }
    if (selectedRoundId === "NEW") {
      return newRoundDraft;
    }
    if (!fetchedDraft || fetchedDraft.id !== selectedRoundId) {
      return null;
    }
    return fetchedDraft;
  }, [fetchedDraft, newRoundDraft, selectedRoundId]);

  const isLoadingDraft = selectedRoundId !== null && selectedRoundId !== "NEW" && activeDraft === null;

  const listItems = mapRoundListItems(roundSummaries);
  
  const handleSaveRound = async (values: RoundFormValues) => {
    if (selectedRoundId === "NEW") {
      await onCreateRound(values);
      onSelectRound(null); // Deselect or we could technically select the newly created if backend returned ID, simplified here.
    } else if (selectedRoundId) {
      await onSaveRound(selectedRoundId, values);
    }
  };

  const handleCreateNew = () => {
    if (roundSummaries.length >= 200) {
      alert("Maximum round limit reached (200)");
      return;
    }
    onSelectRound("NEW");
  };

  return (
    <section className="bg-card border border-border p-6 rounded-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wide">Rounds Configuration</h2>
        {!isLocked && (
          <button 
            type="button" 
            onClick={handleCreateNew}
            disabled={isSavingRound || roundSummaries.length >= 200}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/50 text-xs font-bold uppercase rounded hover:bg-primary/30 disabled:opacity-50"
          >
            + Add Round
          </button>
        )}
      </div>

      <div className="flex gap-6 items-start">
        <RoundList 
          items={listItems} 
          selectedRoundId={selectedRoundId}
          isLocked={isLocked}
          onSelect={onSelectRound}
          onActivate={onActivateRound}
        />
        
        <div className="flex-1 flex flex-col relative min-h-[400px]">
          {isLoadingDraft ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10 text-muted-foreground">
              Loading round details...
            </div>
          ) : null}

          <RoundEditorCard 
             round={activeDraft} 
             isLocked={isLocked}
             onSave={handleSaveRound}
             onActivate={onActivateRound}
          />

          {activeDraft && selectedRoundId !== "NEW" && (
            <div className="mt-4 bg-card border border-border p-6 rounded-lg">
              <RoundTablesEditor 
                roundId={activeDraft.id}
                items={getDraftTables(activeDraft.id) || activeDraft.tables}
                availableAssets={tableAssets}
                isSaving={isSavingTables}
                isLocked={isLocked}
                onSave={async (tables) => {
                  await onSaveTables(activeDraft.id, tables);
                }}
                updateDraft={updateDraftTables}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
