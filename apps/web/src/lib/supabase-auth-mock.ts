import type { LoginInput } from "@parinator/schema";

export async function signInWithPassword(input: LoginInput) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    user: {
      id: "mock-user-id",
      email: input.email,
    },
    session: {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    },
  };
}
