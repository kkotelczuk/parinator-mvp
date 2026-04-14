import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { importSourceFormSchema } from "../schemas";
import type { ImportSourceFormValues } from "../types";

interface ImportSourceFormProps {
  defaultValues: Partial<ImportSourceFormValues>;
  isSubmitting: boolean;
  isLocked: boolean;
  onSubmit: (values: ImportSourceFormValues) => Promise<void>;
  onOpenFallback: () => void;
}

type ImportSourceFormInputValues = Omit<ImportSourceFormValues, "teamSize"> & {
  teamSize: unknown;
};

export function ImportSourceForm({
  defaultValues,
  isSubmitting,
  isLocked,
  onSubmit,
  onOpenFallback,
}: ImportSourceFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<
    ImportSourceFormInputValues,
    undefined,
    ImportSourceFormValues
  >({
    resolver: zodResolver(importSourceFormSchema),
    defaultValues: {
      name: "",
      teamSize: 5,
      sourceType: "champions_hub",
      sourceUrl: "",
      ...defaultValues,
    },
  });

  return (
    <form className="max-w-xl flex flex-col gap-5 p-6 bg-card border border-border/50 rounded-lg" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
         <h2 className="text-lg font-semibold">ROSTER INTEGRATION</h2>
         <p className="text-xs text-muted-foreground uppercase opacity-80">Primary Data Source</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider">Tournament Name</label>
        <input 
          {...register("name")}
          disabled={isLocked || isSubmitting}
          className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="E.g., WTC 2024"
        />
        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider">Team Size</label>
        <input 
          type="number"
          {...register("teamSize")}
          disabled={isLocked || isSubmitting || !!defaultValues.name /* if editing, name might be set, team size immutable after lock, logic says immutable mostly */}
          className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.teamSize && <span className="text-xs text-red-500">{errors.teamSize.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider">Platform URL (ChampionsHub / BCP)</label>
        <div className="flex gap-2">
          <input 
            {...register("sourceUrl")}
            disabled={isLocked || isSubmitting}
            className="flex-1 bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none placeholder:opacity-50"
            placeholder="https://championshub.app/tournament/..."
          />
        </div>
        {errors.sourceUrl && <span className="text-xs text-red-500">{errors.sourceUrl.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider">Source Type</label>
        <Controller
          name="sourceType"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              disabled={isLocked || isSubmitting}
              className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="champions_hub">Champions Hub</option>
              <option value="best_coast_pairings">Best Coast Pairings</option>
            </select>
          )}
        />
        {errors.sourceType && <span className="text-xs text-red-500">{errors.sourceType.message}</span>}
      </div>

      <div className="pt-2 flex flex-col gap-2">
        <button 
          type="submit"
          disabled={isLocked || isSubmitting}
          className="w-full bg-primary/20 hover:bg-primary/30 text-primary uppercase font-bold text-sm tracking-wider py-3 rounded border border-primary/50 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Scraping Roster..." : "Scrape Roster"}
        </button>
        
        <button 
          type="button"
          onClick={onOpenFallback}
          disabled={isLocked || isSubmitting}
          className="w-full bg-transparent hover:bg-muted text-muted-foreground uppercase font-bold text-xs tracking-wider py-2 rounded border border-border transition-colors disabled:opacity-50"
        >
          Use pasted text instead
        </button>
      </div>
    </form>
  );
}
