import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roundFormSchema } from "../schemas";
import type { RoundDraftViewModel, RoundFormValues } from "../types";

interface RoundEditorCardProps {
  round: RoundDraftViewModel | null;
  isLocked: boolean;
  onSave: (values: RoundFormValues) => Promise<void>;
  onActivate: (roundId: string) => Promise<void>;
}

type RoundFormInputValues = Omit<RoundFormValues, "roundNumber" | "sortOrder"> & {
  roundNumber: unknown;
  sortOrder: unknown;
};

export function RoundEditorCard({ round, isLocked, onSave, onActivate }: RoundEditorCardProps) {
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<
    RoundFormInputValues,
    undefined,
    RoundFormValues
  >({
    resolver: zodResolver(roundFormSchema),
    defaultValues: {
      roundId: round?.id,
      roundNumber: round?.roundNumber || 0,
      displayName: round?.displayName || "",
      mission: round?.mission || "",
      deployment: round?.deployment || "",
      opponentTeamName: round?.opponentTeamName || "",
      isActive: round?.isActive || false,
      sortOrder: round?.sortOrder || 0,
    }
  });

  useEffect(() => {
    if (round) {
      reset({
        roundId: round.id,
        roundNumber: round.roundNumber,
        displayName: round.displayName,
        mission: round.mission,
        deployment: round.deployment,
        opponentTeamName: round.opponentTeamName,
        isActive: round.isActive,
        sortOrder: round.sortOrder,
      });
    }
  }, [round, reset]);

  if (!round) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-lg p-12 text-muted-foreground">
        Select a round from the left to edit or add a new one.
      </div>
    );
  }

  return (
    <form className="flex-1 flex flex-col gap-5 p-6 bg-card border border-border rounded-lg" onSubmit={handleSubmit(onSave)}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold uppercase tracking-wide">
            {round.displayName || `Round ${round.roundNumber}`}
          </h3>
          <p className="text-sm text-muted-foreground">Configure tactical data for this round.</p>
        </div>
        {!round.isActive && !isLocked && (
          <button 
            type="button" 
            disabled={isSubmitting}
            onClick={() => onActivate(round.id)}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/50 text-xs font-bold uppercase rounded hover:bg-primary/30"
          >
            Set Active
          </button>
        )}
        {round.isActive && (
          <span className="bg-primary px-3 py-1 text-primary-foreground font-bold uppercase text-xs rounded shadow">
            Active Round
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Round Number</label>
          <input 
            type="number"
            {...register("roundNumber")}
            disabled={isLocked || isSubmitting}
            className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {errors.roundNumber && <span className="text-xs text-red-500">{errors.roundNumber.message}</span>}
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Name</label>
          <input 
            {...register("displayName")}
            disabled={isLocked || isSubmitting}
            className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {errors.displayName && <span className="text-xs text-red-500">{errors.displayName.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mission</label>
          <input 
            {...register("mission")}
            disabled={isLocked || isSubmitting}
            className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {errors.mission && <span className="text-xs text-red-500">{errors.mission.message}</span>}
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deployment</label>
          <input 
            {...register("deployment")}
            disabled={isLocked || isSubmitting}
            className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {errors.deployment && <span className="text-xs text-red-500">{errors.deployment.message}</span>}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opponent Team Name (Optional)</label>
        <input 
          {...register("opponentTeamName")}
          disabled={isLocked || isSubmitting}
          className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.opponentTeamName && <span className="text-xs text-red-500">{errors.opponentTeamName.message}</span>}
        <span className="text-[10px] text-yellow-500/80">Changing the opponent team name may cause reset of estimated scores.</span>
      </div>

      {isDirty && !isLocked && (
        <div className="flex justify-end pt-2 border-t border-border/50">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wide text-sm rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Round"}
          </button>
        </div>
      )}
    </form>
  );
}
