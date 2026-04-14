import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentMetadataFormSchema } from "../schemas";
import type { TournamentMetadataFormValues } from "../types";
import type { TournamentDto } from "@parinator/schema";

interface TournamentMetadataSectionProps {
  tournament: TournamentDto;
  isSaving: boolean;
  isLocked: boolean;
  onSave: (values: TournamentMetadataFormValues) => Promise<void>;
}

export function TournamentMetadataSection({
  tournament,
  isSaving,
  isLocked,
  onSave,
}: TournamentMetadataSectionProps) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<TournamentMetadataFormValues>({
    resolver: zodResolver(tournamentMetadataFormSchema),
    defaultValues: {
      name: tournament.name,
    }
  });

  useEffect(() => {
    reset({ name: tournament.name });
  }, [tournament.name, reset]);

  return (
    <section className="bg-card border border-border p-6 rounded-lg mb-8">
      <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Tournament Setup</h2>
      <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4 max-w-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tournament Name</label>
          <div className="flex gap-2">
            <input 
              {...register("name")}
              disabled={isLocked || isSaving}
              className="flex-1 bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {isDirty && !isLocked && (
              <button 
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary uppercase text-xs font-bold rounded transition"
              >
                Save
              </button>
            )}
          </div>
          {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Size</label>
          <input 
            value={tournament.teamSize}
            disabled
            className="w-1/3 bg-background/50 border border-border/50 px-3 py-2 rounded text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="flex gap-4 mt-2">
          {tournament.sourceType && (
            <div className="flex flex-col">
               <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Source Type</span>
               <span className="text-sm">{tournament.sourceType}</span>
            </div>
          )}
          {tournament.sourceUrl && (
            <div className="flex flex-col">
               <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Source URL</span>
               <a href={tournament.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline max-w-[300px] truncate">
                 {tournament.sourceUrl}
               </a>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
