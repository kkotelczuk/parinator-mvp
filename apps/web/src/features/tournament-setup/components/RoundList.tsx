import React from "react";
import type { RoundListItemViewModel } from "../types";

interface RoundListProps {
  items: RoundListItemViewModel[];
  selectedRoundId: string | null;
  isLocked: boolean;
  onSelect: (roundId: string) => void;
  onActivate: (roundId: string) => Promise<void>;
}

export function RoundList({ items, selectedRoundId, isLocked, onSelect, onActivate }: RoundListProps) {
  return (
    <aside className="flex flex-col gap-2 min-w-[250px] max-w-[280px]">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rounds</h3>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{items.length}/200</span>
      </div>
      
      {items.length === 0 && (
        <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded border border-border/50 text-center flex flex-col gap-2">
          <span>No rounds setup yet.</span>
        </div>
      )}

      {items.map(item => (
        <div 
          key={item.id}
          className={`flex flex-col border rounded p-3 cursor-pointer transition-colors ${selectedRoundId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
          onClick={() => onSelect(item.id)}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-sm tracking-wide">{item.label}</span>
            {item.isActive && (
               <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">Active</span>
            )}
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
            {item.hasMissingFields && (
               <span className="text-red-500 text-[10px] uppercase font-bold tracking-wider">Missing data</span>
            )}
          </div>
        </div>
      ))}
    </aside>
  );
}
