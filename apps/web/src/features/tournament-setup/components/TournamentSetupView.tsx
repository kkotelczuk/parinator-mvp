"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SetupHeader } from "./SetupHeader";
import { ImportSourceForm } from "./ImportSourceForm";
import { ImportStatusPanel } from "./ImportStatusPanel";
import { ImportFallbackModal } from "./ImportFallbackModal";
import { TournamentMetadataSection } from "./TournamentMetadataSection";
import { ImportedDataSummary } from "./ImportedDataSummary";
import { RoundSetupSection } from "./RoundSetupSection";
import { SetupReadinessChecklist } from "./SetupReadinessChecklist";
import { LockSetupBar } from "./LockSetupBar";

import { useTournamentSetup } from "../hooks/use-tournament-setup";
import { useImportTournament } from "../hooks/use-import-tournament";
import type { TournamentSetupMode, ImportFallbackFormValues, ImportSourceFormValues } from "../types";
import type { TournamentDetailDto, RoundSummaryDto } from "@parinator/schema";

interface TournamentSetupViewProps {
  mode: TournamentSetupMode;
  initialTournament: TournamentDetailDto | null;
  initialRounds: RoundSummaryDto[];
  activeTeamId: string;
  activeMembershipId: string;
}

export function TournamentSetupView({
  mode,
  initialTournament,
  initialRounds,
  activeTeamId,
  activeMembershipId,
}: TournamentSetupViewProps) {
  const router = useRouter();
  
  const { 
    viewModel, 
    asyncState, 
    tournament, 
    roundSummaries, 
    tableAssets, 
    actions 
  } = useTournamentSetup({
    mode, initialTournament, initialRounds, activeTeamId, activeMembershipId
  });

  const importState = useImportTournament();
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);

  const isLocked = !!tournament?.setupLockedAt;

  const handleBack = () => router.push("/dashboard");
  const handleOpenRoster = () => {
    if (tournament?.id) {
       router.push(`/tournaments/${tournament.id}/roster`);
    }
  };

  const handleImportSubmit = async (values: ImportSourceFormValues): Promise<void> => {
    try {
      const result = await importState.importFromUrl({
        ...values,
        teamId: activeTeamId,
      });
      // If create mode, we need to transition to edit mode with ID
      if (mode === "create" && result.status !== "error" && result.tournamentId) {
        router.push(`/tournaments/${result.tournamentId}/setup`);
      }
    } catch {
      setIsFallbackOpen(true);
    }
  };

  const handleFallbackSubmit = async (values: ImportFallbackFormValues): Promise<void> => {
    try {
      const result = await importState.importFromFallback({
        ...values,
        teamId: activeTeamId,
      });
      setIsFallbackOpen(false);
      if (mode === "create" && result.status !== "error" && result.tournamentId) {
        router.push(`/tournaments/${result.tournamentId}/setup`);
      } else if (mode === "edit") {
        actions.refresh(tournament!.id);
      }
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <SetupHeader 
        header={viewModel.header} 
        onBack={handleBack} 
        onOpenRoster={handleOpenRoster} 
      />

      <main className="flex-1 mt-8 w-full max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Import section shown prominently if new, or editable if not locked */}
        {(!tournament || mode === "create") ? (
          <section className="bg-card border border-border p-6 rounded-lg mb-8">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Initialize Data</h2>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <ImportSourceForm 
                  defaultValues={{}}
                  isSubmitting={importState.isPending}
                  isLocked={isLocked}
                  onSubmit={handleImportSubmit}
                  onOpenFallback={() => setIsFallbackOpen(true)}
                />
                <ImportStatusPanel 
                  state={importState.lastResult} 
                  onRetry={() => {}} 
                  onOpenFallback={() => setIsFallbackOpen(true)}
                />
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-muted/20 border border-dashed border-border/50 rounded flex items-center justify-center text-muted-foreground p-8 text-center text-sm">
                  Initialize tournament data by scraping official roster platforms or utilizing manual data injection. 
                  Ensure all tactical data matches the current WTC or Captain scale requirements.
                </div>
              </div>
            </div>
          </section>
        ) : (
          <TournamentMetadataSection 
            tournament={tournament!}
            isSaving={asyncState.isSavingTournament}
            isLocked={isLocked}
            onSave={(v) => actions.saveTournamentMetadata(v, tournament!.id)}
          />
        )}

        {tournament && (
          <ImportedDataSummary summary={viewModel.summary} />
        )}

        {tournament && (
          <RoundSetupSection 
            roundSummaries={roundSummaries}
            tableAssets={tableAssets}
            selectedRoundId={viewModel.selectedRoundId}
            onSelectRound={actions.selectRound}
            isLocked={isLocked}
            onCreateRound={(v) => actions.createRound(tournament.id, v)}
            onSaveRound={(roundId, values) => actions.updateRound(tournament.id, roundId, values)}
            onActivateRound={(rId) => actions.activateRound(tournament.id, rId)}
            onSaveTables={actions.saveRoundTables}
            isSavingRound={asyncState.isSavingRound}
            isSavingTables={asyncState.isSavingTables}
          />
        )}

        {tournament && (
          <SetupReadinessChecklist 
            readiness={viewModel.readiness} 
            onFocusIssue={() => {}} // Could scroll into view of failing section
          />
        )}

        {tournament && (
          <LockSetupBar 
            tournamentId={tournament.id}
            canLock={viewModel.readiness.canLock}
            isSubmitting={asyncState.isLocking}
            isLocked={isLocked}
            blockingIssues={viewModel.readiness.issues}
            onLock={() => actions.lockSetup(tournament.id)}
          />
        )}
      </main>

      <ImportFallbackModal 
        isOpen={isFallbackOpen}
        defaultSourceUrl=""
        isSubmitting={importState.isPending}
        onClose={() => setIsFallbackOpen(false)}
        onSubmit={handleFallbackSubmit}
      />
    </div>
  );
}
