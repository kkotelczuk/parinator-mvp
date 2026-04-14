import type { 
  AuthContextCommand, 
  AuthContextResponseDto, 
  PaginatedListDto, 
  TeamListItemDto, 
  TournamentSummaryDto,
} from "@parinator/schema";

function getAuthHeaders() {
  if (typeof document === 'undefined') return { "Content-Type": "application/json" };
  const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

export async function getTeams(
  page = 1, 
  pageSize = 100, 
  sort = "createdAt"
): Promise<PaginatedListDto<TeamListItemDto>> {
  const url = new URL("/api/v1/teams", window.location.origin);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", pageSize.toString());
  url.searchParams.set("sort", sort);
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }
  
  return response.json();
}

export async function getTournaments(
  teamId: string, 
  status?: "active" | "closed",
  page = 1, 
  pageSize = 100, 
  sort = "-createdAt"
): Promise<PaginatedListDto<TournamentSummaryDto>> {
  const url = new URL("/api/v1/tournaments", window.location.origin);
  url.searchParams.set("filter[teamId]", teamId);
  if (status) {
    url.searchParams.set("filter[status]", status);
  }
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", pageSize.toString());
  url.searchParams.set("sort", sort);
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch tournaments");
  }
  
  return response.json();
}

export async function changeAuthContext(
  data: AuthContextCommand
): Promise<AuthContextResponseDto> {
  const response = await fetch("/api/v1/auth/context", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to change context");
  }
  
  return response.json();
}
