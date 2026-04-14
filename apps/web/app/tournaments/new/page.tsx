import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TournamentSetupView } from "../../../src/features/tournament-setup/components/TournamentSetupView";
import type { AuthContextResponseDto } from "@parinator/schema";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005";

async function getAuthContext() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("parinator_session")?.value || cookieStore.get("accessToken")?.value;
  
  if (!sessionCookie) return null;

  const headers = {
    "Content-Type": "application/json",
    "Cookie": cookieStore.toString(),
    "Authorization": `Bearer ${sessionCookie}`
  };

  try {
    const ctxRes = await fetch(`${API_BASE_URL}/api/v1/auth/context`, { headers, cache: 'no-store' });
    if (!ctxRes.ok) return null;
    return (await ctxRes.json()) as AuthContextResponseDto;
  } catch {
    return null;
  }
}

export default async function NewTournamentPage() {
  const context = await getAuthContext();
  
  if (!context) {
    redirect("/login");
  }
  
  if (context.role !== "captain") {
    redirect("/dashboard");
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <TournamentSetupView
        mode="create"
        initialTournament={null}
        initialRounds={[]}
        activeTeamId={context.activeTeamId}
        activeMembershipId={context.activeMembershipId}
      />
    </div>
  );
}
