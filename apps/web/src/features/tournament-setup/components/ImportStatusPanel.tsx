import React from "react";
import type { ImportRunStateViewModel } from "../types";

interface ImportStatusPanelProps {
  state: ImportRunStateViewModel | null;
  onRetry: () => void;
  onOpenFallback: () => void;
}

export function ImportStatusPanel({ state, onRetry, onOpenFallback }: ImportStatusPanelProps) {
  if (!state) return null;

  const getStatusColor = () => {
    switch (state.status) {
      case "success": return "bg-green-500/20 text-green-500 border-green-500/50";
      case "partial_success": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
      case "error": return "bg-red-500/20 text-red-500 border-red-500/50";
      case "pending": return "bg-blue-500/20 text-blue-500 border-blue-500/50";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  return (
    <div className={`mt-4 p-4 rounded border flex flex-col gap-3 ${getStatusColor()}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-sm">
            Status: {state.status.replace("_", " ")}
          </span>
          {state.usedCache && (
            <span className="text-[10px] bg-background/50 px-2 py-0.5 rounded font-mono">
              [Used Cache]
            </span>
          )}
        </div>
      </div>

      {state.warnings && state.warnings.length > 0 && (
        <div className="text-xs opacity-90">
          <p className="font-semibold mb-1 uppercase tracking-wider">Warnings:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {state.warnings.map((w, idx) => (
              <li key={idx} className="truncate">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex gap-2 mt-2">
          <button 
            onClick={onRetry}
            className="flex-1 bg-background/50 hover:bg-background/80 py-2 rounded text-xs font-bold uppercase transition"
          >
            Retry Import
          </button>
          <button 
            onClick={onOpenFallback}
            className="flex-1 bg-background/50 hover:bg-background/80 py-2 rounded text-xs font-bold uppercase transition"
          >
            Open Fallback
          </button>
        </div>
      )}
    </div>
  );
}
