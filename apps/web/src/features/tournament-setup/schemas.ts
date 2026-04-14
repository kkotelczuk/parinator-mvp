import { z } from "zod";

export const importSourceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
  teamSize: z.coerce.number().int().min(5, "Team size must be at least 5"),
  sourceType: z.enum(["champions_hub", "best_coast_pairings"]),
  sourceUrl: z.string().url("Must be a valid URL").min(1, "URL is required"),
});

export const importFallbackFormSchema = z.object({
  sourceUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  rawText: z.string().trim().min(1, "Raw text is required"),
});

export const tournamentMetadataFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
});

export const roundFormSchema = z.object({
  roundId: z.string().optional(),
  roundNumber: z.coerce.number().int().positive("Round number must be positive"),
  displayName: z.string().min(1, "Display name is required"),
  mission: z.string().min(1, "Mission is required"),
  deployment: z.string().min(1, "Deployment is required"),
  opponentTeamName: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int(),
});
