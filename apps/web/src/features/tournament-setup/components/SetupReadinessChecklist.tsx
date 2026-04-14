import React from "react";
import type { SetupReadinessViewModel } from "../types";

interface SetupReadinessChecklistProps {
  readiness: SetupReadinessViewModel;
  onFocusIssue?: (issueId: string) => void;
}

export function SetupReadinessChecklist({ readiness, onFocusIssue }: SetupReadinessChecklistProps) {
  const getIcon = (condition: boolean) => condition ? "✅" : "⚠️";

  return (
    <section className="bg-card border border-border p-6 rounded-lg mb-8">
      <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Setup Readiness</h2>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">{getIcon(readiness.hasTournament)}</span>
          <span>Tournament created</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl">{getIcon(readiness.hasImportResult)}</span>
          <span>Import completed successfully</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl">{getIcon(readiness.hasAnyRound)}</span>
          <span>At least one round configured</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl">{getIcon(readiness.hasRoundsReadyForPlayers)}</span>
          <span>Rounds have mission and deployment data</span>
        </div>
        <div className="flex items-center gap-3 col-span-2 text-primary font-bold">
          <span className="text-xl">{getIcon(readiness.hasExactlyOneActiveRound)}</span>
          <span>Exactly ONE active round exists</span>
        </div>
      </div>

      {readiness.issues.length > 0 && (
        <div className="mt-6 p-4 border border-red-500/30 bg-red-500/10 rounded">
          <h4 className="text-red-500 font-bold mb-2 uppercase tracking-wide text-xs">Blocking Issues</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-500/90">
            {readiness.issues.map(issue => (
              <li key={issue.id} className="cursor-pointer hover:underline" onClick={() => onFocusIssue?.(issue.id)}>
                {issue.label}: {issue.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
