import React, { useState } from "react";
import type { RoundTableDraftViewModel } from "../types";
import type { TableAssetDto } from "@parinator/schema";

interface RoundTablesEditorProps {
  roundId: string;
  items: RoundTableDraftViewModel[];
  availableAssets: TableAssetDto[];
  isSaving: boolean;
  isLocked: boolean;
  onSave: (values: RoundTableDraftViewModel[]) => Promise<void>;
  updateDraft: (roundId: string, tables: RoundTableDraftViewModel[]) => void;
}

export function RoundTablesEditor({ 
  roundId, items, availableAssets, isSaving, isLocked, onSave, updateDraft 
}: RoundTablesEditorProps) {
  const [editedTablesByRoundId, setEditedTablesByRoundId] = useState<Record<string, RoundTableDraftViewModel[]>>({});
  const tables = editedTablesByRoundId[roundId] ?? items;
  const isDirty = Boolean(editedTablesByRoundId[roundId]);

  const handleChange = (index: number, key: keyof RoundTableDraftViewModel, value: string | number | null) => {
    const newTables = [...tables];
    const changedTable = { ...newTables[index], [key]: value };
    newTables[index] = changedTable;
    
    // Auto-fill preview if asset changes
    if (key === "imageAssetId") {
       const asset = availableAssets.find(a => a.id === value);
       newTables[index].imagePreviewUrl = asset?.imageUrl || null;
       newTables[index].sourceAttribution = asset?.sourceAttribution || null;
    }
    setEditedTablesByRoundId((previousValue) => ({
      ...previousValue,
      [roundId]: newTables,
    }));
    updateDraft(roundId, newTables);
  };

  const handleAdd = () => {
    const newTableNo = tables.length > 0 ? Math.max(...tables.map(t => t.tableNo)) + 1 : 1;
    const newTable: RoundTableDraftViewModel = {
      clientId: `temp-${Date.now()}`,
      tableNo: newTableNo,
      tableName: `Table ${newTableNo}`,
      imageAssetId: null,
      imagePreviewUrl: null,
      sourceAttribution: null
    };
    const newTables = [...tables, newTable];
    setEditedTablesByRoundId((previousValue) => ({
      ...previousValue,
      [roundId]: newTables,
    }));
    updateDraft(roundId, newTables);
  };

  const handleRemove = (index: number) => {
    const newTables = [...tables];
    newTables.splice(index, 1);
    setEditedTablesByRoundId((previousValue) => ({
      ...previousValue,
      [roundId]: newTables,
    }));
    updateDraft(roundId, newTables);
  };

  const handleSave = async (): Promise<void> => {
    await onSave(tables);
    setEditedTablesByRoundId((previousValue) => {
      const { [roundId]: removedRound, ...remainingRounds } = previousValue;
      void removedRound;
      return remainingRounds;
    });
  };

  return (
    <div className="flex flex-col mt-6 pt-6 border-t border-border/50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-lg font-bold uppercase tracking-wide">Tables Configuration</h4>
          <p className="text-xs text-muted-foreground">Define tables and map assets for map estimation.</p>
        </div>
        {!isLocked && (
          <button 
            type="button"
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-border rounded hover:bg-muted"
            onClick={handleAdd}
            disabled={isSaving}
          >
            + Add Table
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {tables.length === 0 && (
          <div className="text-sm text-muted-foreground text-center p-4 bg-muted/20 border border-border/50 rounded">
            No tables defined for this round.
          </div>
        )}
        
        {tables.map((table, idx) => (
          <div key={table.clientId} className="flex gap-4 items-start p-3 bg-muted/10 border border-border/50 rounded group">
            <div className="w-16 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">No.</label>
              <input 
                type="number" 
                value={table.tableNo}
                onChange={e => handleChange(idx, "tableNo", parseInt(e.target.value) || 0)}
                disabled={isLocked || isSaving}
                className="bg-background border border-border px-2 py-1 rounded text-sm w-full focus:outline-none focus:border-primary"
              />
            </div>
            
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Table Name</label>
              <input 
                value={table.tableName}
                onChange={e => handleChange(idx, "tableName", e.target.value)}
                disabled={isLocked || isSaving}
                className="bg-background border border-border px-2 py-1 rounded text-sm w-full focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Map Asset</label>
              <select
                value={table.imageAssetId || ""}
                onChange={e => handleChange(idx, "imageAssetId", e.target.value || null)}
                disabled={isLocked || isSaving}
                className="bg-background border border-border px-2 py-1 rounded text-sm w-full focus:outline-none focus:border-primary"
              >
                <option value="">None selected</option>
                {availableAssets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.label}</option>
                ))}
              </select>
            </div>

            {!isLocked && (
              <div className="pt-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleRemove(idx)}
                  disabled={isSaving}
                  className="text-red-500 hover:text-red-400 font-bold"
                  title="Remove Table"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isDirty && !isLocked && (
        <div className="flex justify-end mt-4">
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-sm font-bold uppercase tracking-wider rounded transition disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Tables"}
          </button>
        </div>
      )}
    </div>
  );
}
