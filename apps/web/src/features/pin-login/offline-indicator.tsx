"use client";

import React from "react";
import { useNetworkStatus } from "@/src/hooks/use-network-status";

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600/90 backdrop-blur-sm text-white text-center py-2 px-4 z-50 flex items-center justify-center gap-2 font-medium text-sm shadow-[0_4px_12px_rgba(220,38,38,0.3)] border-b border-red-500 animate-in slide-in-from-top duration-300">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
      <span>OFFLINE STATUS - Wymagane połączenie z siecią do autoryzacji</span>
    </div>
  );
}
