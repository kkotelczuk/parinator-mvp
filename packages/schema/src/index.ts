import { z } from "zod";

export * from "./types";
export type { Database } from "./database.types";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must have at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const patchUserMeSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name must not be empty")
    .max(100, "Display name must be at most 100 characters"),
});

export type PatchUserMeInput = z.infer<typeof patchUserMeSchema>;
