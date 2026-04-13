import { z } from "zod";
import type { Json } from "./database.types";

export type * from "./types";
export type { Database } from "./database.types";

const queryBooleanSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value): boolean => (typeof value === "string" ? value === "true" : value));
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const jsonPayloadSchema = z.custom<Json>((value): boolean => {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}, "payload must be valid JSON.");

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

// ---------------------------------------------------------------------------
// 2.4 Tournaments and setup
// ---------------------------------------------------------------------------

const importSourceEnum = z.enum(["champions_hub", "best_coast_pairings", "manual_fallback"]);
const tournamentStatusEnum = z.enum(["active", "closed"]);

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, "Name must not be empty").max(120, "Name must be at most 120 characters"),
  teamId: z.uuid("teamId must be a valid UUID."),
  teamSize: z.number().int().min(5, "Team size must be at least 5"),
  sourceType: importSourceEnum.optional(),
  sourceUrl: z.string().url("sourceUrl must be a valid URL").optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const patchTournamentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name must not be empty")
      .max(120, "Name must be at most 120 characters")
      .optional(),
    status: tournamentStatusEnum.optional(),
  })
  .refine((data): boolean => data.name !== undefined || data.status !== undefined, {
    message: "At least one field must be provided.",
  });

export type PatchTournamentInput = z.infer<typeof patchTournamentSchema>;

export const tournamentsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).default("-createdAt"),
  status: tournamentStatusEnum.optional(),
  teamId: z.uuid("teamId must be a valid UUID.").optional(),
});

export const closeTournamentSchema = z.object({
  closedAt: z.string().datetime().optional(),
});

export type CloseTournamentInput = z.infer<typeof closeTournamentSchema>;

export const rosterMemberSchema = z.object({
  membershipId: z.uuid("membershipId must be a valid UUID."),
  slotNo: z.number().int().min(1, "slotNo must be at least 1"),
  role: z.enum(["captain", "player"]),
  isPlaying: z.boolean(),
});

export const putTournamentRosterSchema = z.object({
  members: z.array(rosterMemberSchema).min(1, "At least one roster member is required."),
});

export type PutTournamentRosterInput = z.infer<typeof putTournamentRosterSchema>;

export const rosterListQuerySchema = z.object({
  sort: z.enum(["slotNo", "-slotNo", "role", "-role"]).default("slotNo"),
  role: z.enum(["captain", "player"]).optional(),
  isPlaying: queryBooleanSchema.optional(),
});

// ---------------------------------------------------------------------------
// 2.5 Join codes and joining flow
// ---------------------------------------------------------------------------

export const generateJoinCodeSchema = z.object({
  ttlMinutes: z
    .number()
    .int("ttlMinutes must be an integer")
    .min(1, "ttlMinutes must be at least 1")
    .max(10080, "ttlMinutes must be at most 10080 (7 days)"),
});

export type GenerateJoinCodeInput = z.infer<typeof generateJoinCodeSchema>;

export const redeemJoinCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[0-9]{6}$/, "Code must be exactly 6 digits"),
});

// ---------------------------------------------------------------------------
// 2.6 Rounds and round configuration
// ---------------------------------------------------------------------------

const roundStatusEnum = z.enum(["editable", "locked"]);

export const roundsListQuerySchema = paginationQuerySchema.extend({
  sort: z
    .enum(["roundNumber", "-roundNumber", "sortOrder", "-sortOrder", "createdAt", "-createdAt"])
    .default("-createdAt"),
  status: roundStatusEnum.optional(),
  isActive: queryBooleanSchema.optional(),
});

export const createRoundSchema = z.object({
  roundNumber: z.number().int().min(1, "roundNumber must be at least 1").max(200, "roundNumber must be at most 200"),
  displayName: z
    .string()
    .trim()
    .min(1, "displayName must not be empty")
    .max(200, "displayName must be at most 200 characters"),
  mission: z.string().trim().min(1, "mission must not be empty"),
  deployment: z.string().trim().min(1, "deployment must not be empty"),
  opponentTeamName: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(false),
  sortOrder: z.number().int().min(1, "sortOrder must be at least 1").max(200, "sortOrder must be at most 200"),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;

export const patchRoundSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "displayName must not be empty")
      .max(200, "displayName must be at most 200 characters")
      .optional(),
    mission: z.string().trim().min(1, "mission must not be empty").optional(),
    deployment: z.string().trim().min(1, "deployment must not be empty").optional(),
    opponentTeamName: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z
      .number()
      .int()
      .min(1, "sortOrder must be at least 1")
      .max(200, "sortOrder must be at most 200")
      .optional(),
  })
  .refine(
    (data): boolean =>
      data.displayName !== undefined ||
      data.mission !== undefined ||
      data.deployment !== undefined ||
      data.opponentTeamName !== undefined ||
      data.isActive !== undefined ||
      data.sortOrder !== undefined,
    { message: "At least one field must be provided." },
  );

export type PatchRoundInput = z.infer<typeof patchRoundSchema>;

export const reorderRoundSchema = z.object({
  sortOrder: z.number().int().min(1, "sortOrder must be at least 1").max(200, "sortOrder must be at most 200"),
});

// ---------------------------------------------------------------------------
// 2.7 Opponents and tables
// ---------------------------------------------------------------------------

export const opponentsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).default("name"),
  name: z.string().trim().min(1, "name must not be empty").optional(),
});

export const createOpponentSchema = z.object({
  name: z.string().trim().min(1, "name must not be empty").max(200, "name must be at most 200 characters"),
  faction: z
    .string()
    .trim()
    .max(200, "faction must be at most 200 characters")
    .nullable()
    .optional(),
  listText: z.string().trim().nullable().optional(),
  externalRef: z
    .string()
    .trim()
    .max(200, "externalRef must be at most 200 characters")
    .nullable()
    .optional(),
  listOpenedRequired: z.boolean().default(true),
});

export type CreateOpponentInput = z.infer<typeof createOpponentSchema>;

export const patchOpponentSchema = z
  .object({
    faction: z
      .string()
      .trim()
      .max(200, "faction must be at most 200 characters")
      .nullable()
      .optional(),
    listText: z.string().trim().nullable().optional(),
  })
  .refine((data): boolean => data.faction !== undefined || data.listText !== undefined, {
    message: "At least one field must be provided.",
  });

export type PatchOpponentInput = z.infer<typeof patchOpponentSchema>;

export const tablesListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["tableNo", "-tableNo", "createdAt", "-createdAt"]).default("tableNo"),
  tableNo: z.coerce.number().int().min(1, "tableNo must be at least 1").optional(),
});

const roundTableInputSchema = z.object({
  tableNo: z.number().int().min(1, "tableNo must be at least 1"),
  tableName: z.string().trim().nullable().optional(),
  imageAssetId: z.uuid("imageAssetId must be a valid UUID.").nullable().optional(),
});

export const putRoundTablesSchema = z.object({
  tables: z.array(roundTableInputSchema),
});

export type PutRoundTablesInput = z.infer<typeof putRoundTablesSchema>;

// ---------------------------------------------------------------------------
// 2.8 Table assets
// ---------------------------------------------------------------------------

export const tableAssetsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["label", "-label", "createdAt", "-createdAt"]).default("label"),
  label: z.string().trim().min(1, "label must not be empty").optional(),
});

export const createTableAssetSchema = z.object({
  label: z.string().trim().min(1, "label must not be empty"),
  imageUrl: z.string().url("imageUrl must be a valid URL."),
  sourceUrl: z.string().url("sourceUrl must be a valid URL."),
  sourceAttribution: z.string().trim().min(1, "sourceAttribution must not be empty"),
});

export type CreateTableAssetInput = z.infer<typeof createTableAssetSchema>;

export const patchTableAssetSchema = z
  .object({
    label: z.string().trim().min(1, "label must not be empty").optional(),
  })
  .refine((data): boolean => data.label !== undefined, {
    message: "At least one field must be provided.",
  });

export type PatchTableAssetInput = z.infer<typeof patchTableAssetSchema>;

// ---------------------------------------------------------------------------
// 2.9 Player estimations and preferences
// ---------------------------------------------------------------------------

const estimationScoreSchema = z.number().int().min(0, "Score must be between 0 and 20").max(20, "Score must be between 0 and 20");

export const estimationsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["createdAt", "-createdAt", "updatedAt", "-updatedAt"]).default("-createdAt"),
  playerMembershipId: z.uuid("playerMembershipId must be a valid UUID.").optional(),
  opponentPlayerId: z.uuid("opponentPlayerId must be a valid UUID.").optional(),
});

export const upsertMatchupEstimationSchema = z
  .object({
    listOpenedAt: z.string().datetime("listOpenedAt must be a valid ISO datetime."),
    hasFirstTurnImpact: z.boolean(),
    scoreSingle: estimationScoreSchema.nullable(),
    scoreGoFirst: estimationScoreSchema.nullable(),
    scoreGoSecond: estimationScoreSchema.nullable(),
    comment: z
      .string()
      .trim()
      .max(200, "comment must be at most 200 characters")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx): void => {
    if (data.hasFirstTurnImpact) {
      if (data.scoreSingle !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoreSingle"],
          message: "scoreSingle must be null when hasFirstTurnImpact is true.",
        });
      }
      if (data.scoreGoFirst === null || data.scoreGoSecond === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoreGoFirst"],
          message: "scoreGoFirst and scoreGoSecond are required when hasFirstTurnImpact is true.",
        });
      }
      return;
    }
    if (data.scoreSingle === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scoreSingle"],
        message: "scoreSingle is required when hasFirstTurnImpact is false.",
      });
    }
    if (data.scoreGoFirst !== null || data.scoreGoSecond !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scoreGoFirst"],
        message: "scoreGoFirst and scoreGoSecond must be null when hasFirstTurnImpact is false.",
      });
    }
  });

export type UpsertMatchupEstimationInput = z.infer<typeof upsertMatchupEstimationSchema>;

export const tablePreferencesListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["createdAt", "-createdAt", "updatedAt", "-updatedAt"]).default("-createdAt"),
  playerMembershipId: z.uuid("playerMembershipId must be a valid UUID.").optional(),
  roundTableId: z.uuid("roundTableId must be a valid UUID.").optional(),
});

export const upsertTablePreferenceSchema = z.object({
  preference: z.enum(["preferred", "not_preferred"]),
});

export type UpsertTablePreferenceInput = z.infer<typeof upsertTablePreferenceSchema>;

// ---------------------------------------------------------------------------
// 2.10 Pairing matrix and cell modal
// ---------------------------------------------------------------------------

export const roundMatrixQuerySchema = z.object({
  view: z.enum(["captain", "player"]).default("captain"),
});

export type RoundMatrixQueryInput = z.infer<typeof roundMatrixQuerySchema>;

export const matrixCellsListQuerySchema = paginationQuerySchema.extend({
  sort: z
    .enum(["playerMembershipId", "-playerMembershipId", "opponentPlayerId", "-opponentPlayerId"])
    .default("playerMembershipId"),
  playerMembershipId: z.uuid("playerMembershipId must be a valid UUID.").optional(),
  opponentPlayerId: z.uuid("opponentPlayerId must be a valid UUID.").optional(),
});

export type MatrixCellsListQueryInput = z.infer<typeof matrixCellsListQuerySchema>;

// ---------------------------------------------------------------------------
// 2.11 Pairing simulator and live flow
// ---------------------------------------------------------------------------

const pairingModeSchema = z.enum(["simulation", "live"]);
const simulationRatingSchema = z.enum(["better", "worse", "neutral"]);

export const pairingRunsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["createdAt", "-createdAt", "sortOrder", "-sortOrder", "finalizedAt", "-finalizedAt"]).default("-createdAt"),
  mode: pairingModeSchema.optional(),
  isFinal: queryBooleanSchema.optional(),
  simulationRating: simulationRatingSchema.optional(),
});

export const createPairingRunSchema = z.object({
  mode: pairingModeSchema,
  name: z.string().trim().min(1, "name must not be empty").max(200, "name must be at most 200 characters").nullable().optional(),
  simulationRating: simulationRatingSchema.nullable().optional(),
  sortOrder: z.number().int().min(1, "sortOrder must be at least 1").max(999, "sortOrder must be at most 999").nullable().optional(),
});

export type CreatePairingRunInput = z.infer<typeof createPairingRunSchema>;

export const patchPairingRunSchema = z
  .object({
    name: z.string().trim().min(1, "name must not be empty").max(200, "name must be at most 200 characters").nullable().optional(),
    simulationRating: simulationRatingSchema.nullable().optional(),
    sortOrder: z.number().int().min(1, "sortOrder must be at least 1").max(999, "sortOrder must be at most 999").nullable().optional(),
  })
  .refine(
    (data): boolean => data.name !== undefined || data.simulationRating !== undefined || data.sortOrder !== undefined,
    { message: "At least one field must be provided." },
  );

export type PatchPairingRunInput = z.infer<typeof patchPairingRunSchema>;

export const pairingStepsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["stepNo", "-stepNo", "createdAt", "-createdAt"]).default("stepNo"),
});

const pairingStepInputSchema = z.object({
  stepNo: z.number().int().min(1, "stepNo must be at least 1"),
  phaseKey: z.string().trim().min(1, "phaseKey must not be empty").max(100, "phaseKey must be at most 100 characters"),
  payload: jsonPayloadSchema,
});

export const putPairingStepsSchema = z.object({
  steps: z.array(pairingStepInputSchema),
});

export type PutPairingStepsInput = z.infer<typeof putPairingStepsSchema>;

export const pairingAssignmentsListQuerySchema = paginationQuerySchema.extend({
  sort: z
    .enum(["playerMembershipId", "-playerMembershipId", "opponentPlayerId", "-opponentPlayerId", "createdAt", "-createdAt"])
    .default("playerMembershipId"),
  playerMembershipId: z.uuid("playerMembershipId must be a valid UUID.").optional(),
  opponentPlayerId: z.uuid("opponentPlayerId must be a valid UUID.").optional(),
});

const pairingAssignmentInputSchema = z.object({
  playerMembershipId: z.uuid("playerMembershipId must be a valid UUID."),
  opponentPlayerId: z.uuid("opponentPlayerId must be a valid UUID."),
  roundTableId: z.uuid("roundTableId must be a valid UUID.").nullable().optional(),
  estimationId: z.uuid("estimationId must be a valid UUID.").nullable().optional(),
});

export const putPairingAssignmentsSchema = z.object({
  assignments: z.array(pairingAssignmentInputSchema),
});

export type PutPairingAssignmentsInput = z.infer<typeof putPairingAssignmentsSchema>;

export const patchPairingAssignmentResultSchema = z.object({
  gameResult: z.number().int().min(0, "gameResult must be between 0 and 20").max(20, "gameResult must be between 0 and 20"),
});

export type PatchPairingAssignmentResultInput = z.infer<typeof patchPairingAssignmentResultSchema>;

// ---------------------------------------------------------------------------
// 2.12 Estimator view
// ---------------------------------------------------------------------------

export const estimatorSessionsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
});

export type EstimatorSessionsListQueryInput = z.infer<typeof estimatorSessionsListQuerySchema>;

export const estimatorEventsListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(["eventOrder", "-eventOrder", "clickedAt", "-clickedAt"]).default("eventOrder"),
});

export type EstimatorEventsListQueryInput = z.infer<typeof estimatorEventsListQuerySchema>;

export const appendEstimatorEventSchema = z.object({
  actorMembershipId: z.uuid("actorMembershipId must be a valid UUID."),
  tileLabel: z.string().trim().min(1, "tileLabel must not be empty").max(200, "tileLabel must be at most 200 characters"),
  tileValue: z.number().int().min(0, "tileValue must be between 0 and 20").max(20, "tileValue must be between 0 and 20"),
  eventOrder: z.number().int().min(1, "eventOrder must be at least 1"),
  clickedAt: z.string().datetime("clickedAt must be a valid ISO datetime.").optional(),
});

export type AppendEstimatorEventInput = z.infer<typeof appendEstimatorEventSchema>;
