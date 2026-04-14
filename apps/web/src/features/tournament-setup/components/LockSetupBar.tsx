import React from "react";
import type { SetupReadinessViewModel, SetupBlockingIssue } from "../types";

interface LockSetupBarProps {
  tournamentId: string;
  canLock: boolean;
  isSubmitting: boolean;
  isLocked: boolean;
  blockingIssues: SetupBlockingIssue[];
  onLock: () => Promise<void>;
}

export function LockSetupBar({
  tournamentId,
  canLock,
  isSubmitting,
  isLocked,
  blockingIssues,
  onLock
}: LockSetupBarProps) {
  if (isLocked) {
    return (
      <div className="bg-primary/10 border border-primary p-6 rounded-lg flex justify-between items-center mt-8">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wide text-primary">Setup is Locked</h2>
          <p className="text-sm text-primary/80 mt-1">This tournament setup has been finalized. Proceed to roster management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border p-6 rounded-lg flex flex-col items-end mt-8 shadow-sm">
      <div className="mb-4 text-right">
        <h2 className="text-lg font-bold uppercase mb-1">Finalize Setup</h2>
        <p className="text-sm text-muted-foreground w-1/2 ml-auto">
          Locking the setup prevents further structural changes to the tournament, such as team size or adding new rounds. This action is irreversible.
        </p>
      </div>

      <button
        onClick={onLock}
        disabled={!canLock || isSubmitting}
        className="px-8 py-4 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
      >
        {isSubmitting ? "Locking..." : "Lock Setup"}
      </button>

      {!canLock && blockingIssues.length === 0 && (
        <span className="text-xs text-yellow-500 mt-2 font-bold uppercase tracking-wider">
          Resolve outstanding issues above to proceed.
        </span>
      )}
    </div>
  );
}
