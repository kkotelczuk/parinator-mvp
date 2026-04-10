import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must have at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
