import React from "react";
import type { ImportedDataSummaryViewModel } from "../types";

interface ImportedDataSummaryProps {
  summary: ImportedDataSummaryViewModel | null;
}

export function ImportedDataSummary({ summary }: ImportedDataSummaryProps) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border p-4 rounded flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Opponents Detected</span>
        <span className="text-xl font-bold">{summary.opponentCountLabel}</span>
      </div>
      
      <div className="bg-card border border-border p-4 rounded flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Data Source</span>
        <span className="text-sm font-semibold mt-1">
          {summary.sourceLabel}
          {summary.usedCache && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded">CACHED</span>}
        </span>
      </div>
      
      <div className="bg-card border border-border p-4 rounded flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Warnings</span>
        <span className={`text-xl font-bold ${summary.warningCount > 0 ? "text-yellow-500" : "text-green-500"}`}>
          {summary.warningCount}
        </span>
      </div>
    </div>
  );
}
