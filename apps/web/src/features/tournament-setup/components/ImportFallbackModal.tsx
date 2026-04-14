import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { importFallbackFormSchema } from "../schemas";
import type { ImportFallbackFormValues } from "../types";

interface ImportFallbackModalProps {
  isOpen: boolean;
  defaultSourceUrl: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ImportFallbackFormValues) => Promise<void>;
}

export function ImportFallbackModal({ 
  isOpen, defaultSourceUrl, isSubmitting, onClose, onSubmit 
}: ImportFallbackModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ImportFallbackFormValues>({
    resolver: zodResolver(importFallbackFormSchema),
    defaultValues: {
      sourceUrl: defaultSourceUrl,
      rawText: "",
    }
  });

  // Keep it sync if default URL changes while modal is closed
  useEffect(() => {
    if (isOpen) {
      reset({ sourceUrl: defaultSourceUrl, rawText: "" });
    }
  }, [isOpen, defaultSourceUrl, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl border border-border rounded-xl shadow-lg flex flex-col">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase">Manual Override</h2>
            <p className="text-xs text-muted-foreground uppercase opacity-80 mt-1">Data Injection Fallback</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider">Source URL (Optional)</label>
            <input 
              {...register("sourceUrl")}
              disabled={isSubmitting}
              className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="https://..."
            />
            {errors.sourceUrl && <span className="text-xs text-red-500">{errors.sourceUrl.message}</span>}
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-bold uppercase tracking-wider">Paste Raw Roster Data</label>
            <textarea 
              {...register("rawText")}
              disabled={isSubmitting}
              className="bg-background border border-border px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none min-h-[200px] resize-y font-mono text-sm leading-relaxed"
              placeholder="Paste player names, factions, and army lists here..."
            />
            {errors.rawText && <span className="text-xs text-red-500">{errors.rawText.message}</span>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-sm font-bold uppercase tracking-wider rounded-md transition disabled:opacity-50"
            >
              Parse Manual Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
