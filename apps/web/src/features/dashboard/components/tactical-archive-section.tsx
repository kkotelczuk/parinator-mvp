"use client";

import React from "react";
import type { TournamentCardViewModel } from "../types";
import { TournamentCardList } from "./tournament-card-list";

export interface TacticalArchiveSectionProps {
  items: TournamentCardViewModel[];
  onOpenTournamentHistory: (tournamentId: string) => void;
}

export function TacticalArchiveSection({ items, onOpenTournamentHistory }: TacticalArchiveSectionProps) {
  return (
    <section>
      <div className="mb-6 border-b border-slate-800/50 pb-4">
        <h2 className="text-sm font-bold text-slate-400 flex items-center gap-3 uppercase tracking-widest">
           <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
           </svg>
           Tactical Archive
        </h2>
        <p className="text-slate-600 text-[10px] font-mono tracking-widest uppercase mt-2 pl-8">
          Historical records of concluded operations. Review past pairings and tactical outcomes.
        </p>
      </div>

      <TournamentCardList
        items={items}
        emptyTitle="Puste archiwum"
        emptyDescription="Nie masz jeszcze żadnych zamkniętych turniejów w tej drużynie."
        onSelect={(item) => onOpenTournamentHistory(item.id)}
      />
    </section>
  );
}
