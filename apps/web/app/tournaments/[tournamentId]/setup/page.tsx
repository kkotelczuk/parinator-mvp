import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TournamentSetupView } from "../../../../src/features/tournament-setup/components/TournamentSetupView";
import type { AuthContextResponseDto, TournamentDetailDto, RoundSummaryDto, PaginatedListDto } from "@parinator/schema";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005";

async function getAuthAndTournament(tournamentId: string) {
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
    const context = (await ctxRes.json()) as AuthContextResponseDto;

    const tourRes = await fetch(`${API_BASE_URL}/api/v1/tournaments/${tournamentId}`, { headers, cache: 'no-store' });
    if (!tourRes.ok) {
      if (tourRes.status === 404 || tourRes.status === 403) return { context, tournament: null, rounds: [] };
      return null;
    }
    const tournament = (await tourRes.json()) as TournamentDetailDto;

    const roundsRes = await fetch(`${API_BASE_URL}/api/v1/tournaments/${tournamentId}/rounds`, { headers, cache: 'no-store' });
    const roundsList = roundsRes.ok ? ((await roundsRes.json()) as PaginatedListDto<RoundSummaryDto>) : { data: [], pagination: { total: 0, page: 1, pageSize: 100, totalPages: 1 } };

    return { context, tournament, rounds: roundsList.data };
  } catch {
    return null;
  }
}

export default async function EditTournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const resolvedParams = await params;
  const data = await getAuthAndTournament(resolvedParams.tournamentId);
  
  if (!data) {
    redirect("/login");
  }
  
  if (data.context.role !== "captain") {
    redirect("/dashboard");
  }

  if (!data.tournament) {
    redirect("/dashboard"); // Redirect to dashboard if tournament not found
  }

  // Ensure tournament belongs to active team
  if (data.tournament.teamId !== data.context.activeTeamId) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <TournamentSetupView
        mode="edit"
        initialTournament={data.tournament}
        initialRounds={data.rounds}
        activeTeamId={data.context.activeTeamId}
        activeMembershipId={data.context.activeMembershipId}
      />
    </div>
  );
}
