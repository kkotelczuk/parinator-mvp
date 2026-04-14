import type { AvailableMembershipDto, TournamentSummaryDto } from "@parinator/schema";
import type { MembershipOptionViewModel, TournamentCardViewModel } from "./types";

export function mapAvailableMembershipToOption(
  dto: AvailableMembershipDto,
  teamName: string,
): MembershipOptionViewModel {
  return {
    optionId: `${dto.teamId}_${dto.membershipId}`,
    label: `${teamName} - ${dto.role === 'captain' ? 'Kapitan' : 'Gracz'}`,
    teamId: dto.teamId,
    membershipId: dto.membershipId,
    role: dto.role, // Assuming role is either "captain" | "player" in DB
    isPlaying: dto.isPlaying,
  };
}

export function mapTournamentSummaryToCardViewModel(
  dto: TournamentSummaryDto,
  role: "captain" | "player"
): TournamentCardViewModel {
  // If player, they can only view. If closed, it's also read only.
  const isReadOnly = role === "player" || dto.status === "closed";
  
  let primaryActionLabel = "Zobacz szczegóły";
  if (dto.status === "active") {
    if (!isReadOnly) {
      primaryActionLabel = dto.setupLockedAt ? "Zarządzaj rundami" : "Skonfiguruj turniej";
    } else {
      primaryActionLabel = "Przeglądaj na żywo";
    }
  } else if (dto.status === "closed") {
    primaryActionLabel = "Otwórz archiwum";
  }

  return {
    id: dto.id,
    name: dto.name,
    status: dto.status as "active" | "closed",
    teamSize: dto.teamSize,
    setupLockedAt: dto.setupLockedAt,
    primaryActionLabel,
    isReadOnly,
  };
}
