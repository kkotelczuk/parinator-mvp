"use client";

import React from "react";
import type { DashboardFiltersState, TournamentStatusFilter } from "../types";

export interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (next: Partial<DashboardFiltersState>) => void;
  teamName?: string;
}

export function DashboardFilters({ filters, onFiltersChange, teamName }: DashboardFiltersProps) {
  const tabs: { label: string; value: TournamentStatusFilter }[] = [
    { label: "Wszystkie", value: "all" },
    { label: "Aktywne", value: "active" },
    { label: "Zakończone", value: "closed" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-slate-800 pb-6 mb-8 mt-4 gap-6">
      <div className="w-full sm:w-auto">
        {teamName && (
           <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500/50"></span>
             Active Organization: <strong className="text-green-400">{teamName}</strong>
           </p>
        )}
        <div className="flex w-full sm:w-auto border border-slate-800 rounded bg-[#161616] overflow-hidden">
          {tabs.map((tab) => {
            const isActive = filters.status === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onFiltersChange({ status: tab.value })}
                className={`
                  flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all 
                  ${isActive 
                    ? "bg-slate-800 text-green-400 shadow-[inset_0_-2px_0_rgba(34,197,94,1)]" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <label htmlFor="sort-select" className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">
          Sort By:
        </label>
        <div className="relative flex-1 sm:flex-none">
          <select
            id="sort-select"
            value={filters.sort}
            onChange={(e) => onFiltersChange({ sort: e.target.value as DashboardFiltersState["sort"] })}
             className="w-full appearance-none text-xs bg-[#161616] text-white border border-slate-800 rounded py-2 pl-3 pr-8 focus:outline-none focus:border-green-500 uppercase tracking-wider cursor-pointer"
          >
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
            <option value="name">Name (A-Z)</option>
            <option value="-name">Name (Z-A)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-500">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
