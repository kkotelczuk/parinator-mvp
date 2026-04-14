import React from "react";
import type { TournamentHeaderViewModel } from "../types";

interface SetupHeaderProps {
  header: TournamentHeaderViewModel;
  onBack: () => void;
  onOpenRoster: () => void;
}

export function SetupHeader({ header, onBack, onOpenRoster }: SetupHeaderProps) {
  return (
    <header className="flex items-center justify-between py-6 border-b border-border/50">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            {header.title}
          </h1>
          <span className="bg-primary/20 text-primary uppercase text-[10px] font-bold px-2 py-0.5 rounded-sm">
            {header.mode === "create" ? "New" : "Edit"}
          </span>
          {header.setupLockedAt && (
            <span className="bg-red-500/20 text-red-500 uppercase text-[10px] font-bold px-2 py-0.5 rounded-sm">
              Locked
            </span>
          )}
        </div>
        {header.tournamentName && (
          <p className="text-sm text-muted-foreground">
            {header.tournamentName} 
            {header.sourceTypeLabel && ` • Source: ${header.sourceTypeLabel}`}
          </p>
        )}
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted"
        >
          Back to Dashboard
        </button>
        {header.setupLockedAt && (
          <button 
            onClick={onOpenRoster}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to roster
          </button>
        )}
      </div>
    </header>
  );
}
