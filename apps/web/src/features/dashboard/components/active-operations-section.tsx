"use client";

import React from "react";
import type { TournamentCardViewModel } from "../types";
import { TournamentCardList } from "./tournament-card-list";

export interface ActiveOperationsSectionProps {
  items: TournamentCardViewModel[];
  onOpenTournament: (tournamentId: string) => void;
  onCreateTournament?: () => void;
}

export function ActiveOperationsSection({ items, onOpenTournament, onCreateTournament }: ActiveOperationsSectionProps) {
  return (
    <section className="mb-12">
      <div className="mb-6 border-b border-slate-800/50 pb-4 flex justify-between items-start">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-3 uppercase tracking-widest">
             <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
             Active Operations
          </h2>
          <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase mt-2 pl-8">
            Manage ongoing tournaments, access live data streams, and update deployment scores.
          </p>
        </div>
        {onCreateTournament && (
          <button 
            onClick={onCreateTournament}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/50 uppercase text-xs font-bold tracking-wider rounded transition-colors"
          >
            + Initialize Operation
          </button>
        )}
      </div>

      <TournamentCardList
        items={items}
        emptyTitle="Brak aktywnych turniejów"
        emptyDescription="Aktualnie nie masz przypisanych żadnych otwartych turniejów w wybranej drużynie."
        onSelect={(item) => onOpenTournament(item.id)}
        onCreateTournament={onCreateTournament}
      />
    </section>
  );
}
