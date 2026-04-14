import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserMeDto, AuthContextResponseDto, AvailableMembershipDto } from "@parinator/schema";
import { TeamTournamentDashboardView } from "../../src/features/dashboard/components/team-tournament-dashboard-view";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005";

async function getDashboardInitialData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("parinator_session")?.value || cookieStore.get("accessToken")?.value;
  
  if (!sessionCookie) {
    return null;
  }

  const headers = {
    "Content-Type": "application/json",
    "Cookie": cookieStore.toString(),
    "Authorization": `Bearer ${sessionCookie}`
  };

  try {
    // 1. Fetch User Data
    const userRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, { headers, cache: 'no-store' });
    if (!userRes.ok) return null; // Unauthenticated
    const user = (await userRes.json()) as UserMeDto;

    // 2. Fetch Memberships (Assuming it's available via a specific endpoint or combined)
    // For MVP, we might need an endpoint like /api/v1/users/me/memberships or similar.
    // We'll mock the endpoint call structure here.
    const memRes = await fetch(`${API_BASE_URL}/api/v1/users/me/memberships`, { headers, cache: 'no-store' });
    const memberships = memRes.ok ? ((await memRes.json()) as AvailableMembershipDto[]) : [];

    // 3. Fetch Active Context (Assuming GET /api/v1/auth/context or current session context)
    const ctxRes = await fetch(`${API_BASE_URL}/api/v1/auth/context`, { headers, cache: 'no-store' });
    const context = ctxRes.ok ? ((await ctxRes.json()) as AuthContextResponseDto) : null;

    return { user, memberships, context };
  } catch (error) {
    console.error("Failed to fetch dashboard data (SSR)", error);
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardInitialData();
  
  // Brak sesji -> redirect do /login
  if (!data) {
    redirect("/login");
  }

  return (
    <TeamTournamentDashboardView 
      initialUser={data.user}
      initialContext={data.context}
      initialMemberships={data.memberships}
    />
  );
}
