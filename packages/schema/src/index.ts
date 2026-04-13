import { z } from "zod";

export type * from "./types";
export type { Database } from "./database.types";

const queryBooleanSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value): boolean => (typeof value === "string" ? value === "true" : value));
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

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

export const uuidParamSchema = z.uuid("Must be a valid UUID.");

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Name must not be empty").max(120, "Name must be at most 120 characters"),
});

export const teamsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).default("-createdAt"),
  activeOnly: queryBooleanSchema.optional(),
});

export const createMembershipSchema = z.object({
  userId: z.uuid("userId must be a valid UUID."),
  role: z.enum(["captain", "player"]),
  isPlaying: z.boolean(),
});

export const membershipsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["role", "-role", "joinedAt", "-joinedAt", "leftAt", "-leftAt"]).default("-joinedAt"),
  role: z.enum(["captain", "player"]).optional(),
  active: queryBooleanSchema.optional(),
});

export const patchMembershipSchema = z
  .object({
    role: z.enum(["captain", "player"]).optional(),
    isPlaying: z.boolean().optional(),
    leftAt: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data): boolean => data.role !== undefined || data.isPlaying !== undefined || data.leftAt !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );
