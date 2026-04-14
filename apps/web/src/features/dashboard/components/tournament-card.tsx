"use client";

import React from "react";
import type { TournamentCardViewModel } from "../types";

export interface TournamentCardProps {
  item: TournamentCardViewModel;
  onSelect: (item: TournamentCardViewModel) => void;
}

export function TournamentCard({ item, onSelect }: TournamentCardProps) {
  const isClosed = item.status === "closed";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item);
    }
  };

  return (
    <article 
      onClick={() => onSelect(item)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      className="group relative bg-[#121212] border border-slate-800 rounded p-6 hover:border-green-500/50 hover:bg-[#161616] hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6 gap-4">
        <h3 className="font-bold text-lg text-white line-clamp-2 leading-tight group-hover:text-green-400 transition-colors uppercase tracking-wide">
          {item.name}
        </h3>
        <span className={`shrink-0 inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
          isClosed 
            ? 'bg-[#1a1a1a] text-slate-500 border border-slate-800' 
            : 'bg-green-500 text-[#0a0a0a] shadow-[0_0_8px_rgba(34,197,94,0.4)]'
        }`}>
          {isClosed ? 'ARCHIVED' : 'ACTIVE'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-wider mb-8">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Size: {item.teamSize}v{item.teamSize}
        </div>
        
        {item.setupLockedAt && (
          <div className="flex items-center gap-1.5" title="Skład turnieju został zablokowany">
            <svg className="w-4 h-4 text-red-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[10px] text-red-500/80">LOCKED</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 group-hover:text-green-400 uppercase tracking-widest transition-colors flex items-center gap-2">
          {isClosed ? 'ACCESS ARCHIVE' : 'INITIATE SEQUENCE'}
        </span>
        <svg className="w-4 h-4 text-slate-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </article>
  );
}
