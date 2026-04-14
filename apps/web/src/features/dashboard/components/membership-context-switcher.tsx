"use client";

import React, { useId } from "react";
import type { MembershipOptionViewModel } from "../types";

export interface MembershipContextSwitcherProps {
  value: string;
  options: MembershipOptionViewModel[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function MembershipContextSwitcher({ 
  value, 
  options, 
  disabled = false, 
  onChange 
}: MembershipContextSwitcherProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1 w-full relative z-10">
      <label htmlFor={id} className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block ml-1">
        Active Context
      </label>
      <div className="relative group">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full sm:w-64 h-10 appearance-none rounded-none border-b-2 border-slate-700 bg-transparent px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors uppercase tracking-wider relative z-20 cursor-pointer"
        >
          <option value="" disabled className="bg-[#121212] text-slate-500">SELECT CONTEXT</option>
          {options.map((option) => (
            <option key={option.optionId} value={option.optionId} className="bg-[#121212] text-white">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-green-500 group-hover:text-green-400 transition-colors z-10">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
