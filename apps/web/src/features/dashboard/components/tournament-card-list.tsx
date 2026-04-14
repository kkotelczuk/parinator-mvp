"use client";

import React from "react";
import type { TournamentCardViewModel } from "../types";
import { TournamentCard } from "./tournament-card";

export interface TournamentCardListProps {
  items: TournamentCardViewModel[];
  emptyTitle: string;
  emptyDescription: string;
  onSelect: (item: TournamentCardViewModel) => void;
  onCreateTournament?: () => void;
}

export function TournamentCardList({ items, emptyTitle, emptyDescription, onSelect, onCreateTournament }: TournamentCardListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#121212] border border-dashed border-slate-800 rounded">
        <div className="bg-[#161616] border border-slate-800 p-3 rounded-full mb-4">
           <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
           </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-300 mb-1 uppercase tracking-widest">{emptyTitle}</h3>
        <p className="text-xs font-mono text-slate-600 text-center uppercase max-w-sm tracking-wider mt-2 mb-6">{emptyDescription}</p>
        
        {onCreateTournament && (
          <button 
            onClick={onCreateTournament}
            className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/50 uppercase text-xs font-bold tracking-widest rounded transition-colors"
          >
            + Initialize First Operation
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <li key={item.id} className="h-full">
          <TournamentCard item={item} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
