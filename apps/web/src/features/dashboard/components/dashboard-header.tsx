"use client";

import React from "react";
import type { 
  ActiveContextViewModel, 
  MembershipOptionViewModel, 
  ChangeContextAction 
} from "../types";
import { MembershipContextSwitcher } from "./membership-context-switcher";

export interface DashboardHeaderProps {
  activeContext: ActiveContextViewModel | null;
  membershipOptions: MembershipOptionViewModel[];
  onContextChange: (payload: ChangeContextAction) => void;
  isPending: boolean;
}

export function DashboardHeader({
  activeContext,
  membershipOptions,
  onContextChange,
  isPending,
}: DashboardHeaderProps) {
  const currentOptionId = activeContext 
    ? `${activeContext.teamId}_${activeContext.membershipId}` 
    : "";

  const handleContextChange = (optionId: string) => {
    const selected = membershipOptions.find(o => o.optionId === optionId);
    if (selected) {
      onContextChange({
        teamId: selected.teamId,
        membershipId: selected.membershipId
      });
    }
  };

  return (
    <header className="bg-[#121212] border-b border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-6 bg-green-500 rounded-sm inline-block shadow-[0_0_10px_rgba(34,197,94,0.4)]"></span>
              Operative Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-wide uppercase mt-1 md:mt-0">
              Command & Control Center
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t border-slate-800 md:border-0 relative">
            {activeContext && (
              <div className="absolute -top-7 right-0 text-[10px] font-mono font-bold tracking-widest uppercase sm:relative sm:top-0">
                <span className={`px-3 py-1.5 rounded-full border shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
                  activeContext.role === 'captain' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  [{activeContext.role === 'captain' ? 'CAPTAIN' : 'PLAYER'}]
                </span>
              </div>
            )}
            
            <MembershipContextSwitcher 
              value={currentOptionId}
              options={membershipOptions}
              disabled={isPending || membershipOptions.length === 0}
              onChange={handleContextChange}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
