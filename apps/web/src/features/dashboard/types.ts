import type { ApiErrorDto } from "@parinator/schema";

export type TournamentStatusFilter = "all" | "active" | "closed";

export interface DashboardFiltersState {
  status: TournamentStatusFilter;
  page: number;
  pageSize: number;
  sort: "name" | "-name" | "createdAt" | "-createdAt";
}

export interface MembershipOptionViewModel {
  optionId: string;
  label: string;
  teamId: string;
  membershipId: string;
  role: "captain" | "player";
  isPlaying: boolean;
}

export interface ActiveContextViewModel {
  teamId: string;
  teamName: string; // From the teams response
  membershipId: string;
  role: "captain" | "player";
}

export interface TournamentCardViewModel {
  id: string;
  name: string;
  status: "active" | "closed";
  teamSize: number;
  setupLockedAt: string | null;
  primaryActionLabel: string;
  isReadOnly: boolean;
}

export interface DashboardViewModel {
  activeContext: ActiveContextViewModel | null;
  membershipOptions: MembershipOptionViewModel[];
  activeOperations: TournamentCardViewModel[];
  tacticalArchive: TournamentCardViewModel[];
}

export interface ChangeContextAction {
  teamId: string;
  membershipId: string;
}

export interface DashboardAsyncState {
  isLoading: boolean;
  error: ApiErrorDto["error"] | null;
  isEmpty: boolean;
}
