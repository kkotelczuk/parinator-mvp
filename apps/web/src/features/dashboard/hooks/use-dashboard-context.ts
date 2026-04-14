"use client";

import { useState, useEffect, useCallback } from "react";
import { getTeams, getTournaments, changeAuthContext } from "../api";
import { mapAvailableMembershipToOption, mapTournamentSummaryToCardViewModel } from "../mappers";
import type { 
  DashboardViewModel, 
  DashboardFiltersState, 
  DashboardAsyncState, 
  ChangeContextAction,
  ActiveContextViewModel
} from "../types";
import type { AuthContextResponseDto, AvailableMembershipDto, ApiErrorDto } from "@parinator/schema";

export interface UseDashboardContextOptions {
  initialMemberships: AvailableMembershipDto[];
  initialContext: AuthContextResponseDto | null;
}

function mapUnknownErrorToApiError(error: unknown, fallbackCode: string, fallbackMessage: string): ApiErrorDto["error"] {
  if (typeof error === "object" && error !== null && "error" in error) {
    const nestedError = (error as { error?: unknown }).error;
    if (typeof nestedError === "object" && nestedError !== null && "message" in nestedError) {
      const messageValue = (nestedError as { message?: unknown }).message;
      return {
        code: ((nestedError as { code?: string }).code ?? fallbackCode),
        message: typeof messageValue === "string" ? messageValue : fallbackMessage,
        details: ((nestedError as { details?: Record<string, unknown> }).details ?? {}),
      };
    }
  }
  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      details: {},
    };
  }
  return {
    code: fallbackCode,
    message: fallbackMessage,
    details: {},
  };
}

export function useDashboardContext({ initialMemberships, initialContext }: UseDashboardContextOptions) {
  const [filters, setFilters] = useState<DashboardFiltersState>({
    status: "all",
    page: 1,
    pageSize: 100,
    sort: "-createdAt"
  });

  const [asyncState, setAsyncState] = useState<DashboardAsyncState>({
    isLoading: true,
    error: null,
    isEmpty: false,
  });

  const [viewModel, setViewModel] = useState<DashboardViewModel>({
    activeContext: null,
    membershipOptions: [],
    activeOperations: [],
    tacticalArchive: [],
  });

  const loadData = useCallback(async (currentFilters: DashboardFiltersState) => {
    try {
      const activeTeamId = initialContext?.activeTeamId;
      const activeMembershipId = initialContext?.activeMembershipId;
      const role: "captain" | "player" = initialContext?.role || "player";
      
      const { data: teams } = await getTeams(1, 100, "createdAt");
      
      const membershipOptions = initialMemberships.map(m => {
         const team = teams.find(t => t.id === m.teamId);
         return mapAvailableMembershipToOption(m, team?.name || "Nieznana drużyna");
      });

      let activeOperations: DashboardViewModel["activeOperations"] = [];
      let tacticalArchive: DashboardViewModel["tacticalArchive"] = [];
      let activeContext: ActiveContextViewModel | null = null;

      if (activeTeamId && activeMembershipId) {
        const team = teams.find(t => t.id === activeTeamId);
        activeContext = {
          teamId: activeTeamId,
          membershipId: activeMembershipId,
          role,
          teamName: team?.name || "Nieznana drużyna"
        };
        
        let statusFilter: "active" | "closed" | undefined = undefined;
        if (currentFilters.status !== "all") {
           statusFilter = currentFilters.status;
        }

        const { data: tournaments } = await getTournaments(
           activeTeamId, 
           statusFilter,
           currentFilters.page,
           currentFilters.pageSize,
           currentFilters.sort
        );

        const vms = tournaments.map(t => mapTournamentSummaryToCardViewModel(t, role));
        
        // Segregation for view sections
        activeOperations = vms.filter(t => t.status === "active");
        tacticalArchive = vms.filter(t => t.status === "closed");
      }

      setViewModel({
        activeContext,
        membershipOptions,
        activeOperations,
        tacticalArchive,
      });

      setAsyncState({
        isLoading: false,
        error: null,
        isEmpty: activeOperations.length === 0 && tacticalArchive.length === 0,
      });

    } catch (err: unknown) {
       setAsyncState({
         isLoading: false,
         error: mapUnknownErrorToApiError(err, "FETCH_ERROR", "Wystąpił błąd podczas pobierania danych"),
         isEmpty: true
       });
    }
  }, [initialContext, initialMemberships]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData(filters);
    });
  }, [loadData, filters]);

  const changeContext = async (action: ChangeContextAction) => {
    try {
      setAsyncState(prev => ({ ...prev, isLoading: true, error: null }));
      await changeAuthContext(action);
      // Reload page to refresh all SSR contexts (like headers, user identity etc.)
      window.location.reload(); 
    } catch {
      const errorData: ApiErrorDto["error"] = {
        code: "CONTEXT_ERROR",
        message: "Nie udało się zmienić kontekstu",
        details: {}
      };
      setAsyncState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorData
      }));
    }
  };

  const changeFilters = (newFilters: Partial<DashboardFiltersState>) => {
    setAsyncState(prev => ({ ...prev, isLoading: true, error: null }));
    setFilters(prev => ({ 
        ...prev, 
        ...newFilters, 
        page: newFilters.status !== undefined && newFilters.status !== prev.status ? 1 : (newFilters.page ?? prev.page) 
    }));
  };

  const refresh = () => loadData(filters);

  return {
    viewModel,
    asyncState,
    filters,
    changeContext,
    changeFilters,
    refresh
  };
}
