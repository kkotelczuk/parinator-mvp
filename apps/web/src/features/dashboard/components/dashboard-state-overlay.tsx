"use client";

import React from "react";
import type { DashboardAsyncState } from "../types";

export interface DashboardStateOverlayProps {
  state: DashboardAsyncState;
  onRetry: () => void;
  children: React.ReactNode;
}

export function DashboardStateOverlay({ state, onRetry, children }: DashboardStateOverlayProps) {
  if (state.isLoading && state.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-green-500 text-xs font-mono tracking-widest uppercase animate-pulse">Initializing Data Streams...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="border border-red-500/30 bg-red-500/10 text-red-500 p-4 rounded-full mb-6 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 uppercase tracking-wide">Connection Failure</h2>
        <p className="text-sm font-mono text-slate-500 max-w-md mx-auto mb-8 uppercase">
          {state.error.message || "Failed to establish secure link to Parinator Mainframe."}
        </p>
        <button 
          onClick={onRetry}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold uppercase tracking-widest py-3 px-8 rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {state.isLoading && (
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-900 overflow-hidden z-10 rounded">
           <div className="h-full bg-green-500 animate-[progress_1.5s_ease-in-out_infinite] w-1/3 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
        </div>
      )}
      <div className={`transition-opacity duration-300 ${state.isLoading ? 'opacity-50 pointer-events-none grayscale-[50%]' : 'opacity-100'}`}>
         {children}
      </div>
    </div>
  );
}
