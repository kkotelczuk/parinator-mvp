import React from "react";
import { AuthPinForm } from "@/src/features/pin-login/auth-pin-form";
import { OfflineIndicator } from "@/src/features/pin-login/offline-indicator";

export default function PinLoginView() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(34,197,94,0.1),rgba(255,255,255,0))] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <OfflineIndicator />
      
      {/* Background decorations for "tactical" feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
        <div className="absolute top-1/4 left-1/4 w-[2px] h-[2px] bg-green-500 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-[2px] h-[2px] bg-green-500 rounded-full animate-ping delay-700"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
      </div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-1 bg-green-500 mx-auto mb-6 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase drop-shadow-lg">Parinator</h1>
          <p className="text-xs tracking-[0.3em] text-green-500 font-medium">Tactical Team Pairing Command</p>
        </div>

        <AuthPinForm />
        
        {/* Status indicators */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800 px-4 py-2 rounded bg-slate-900/50">
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]"></span>
             <span>Pilot Mode Active</span>
           </div>
           <span className="text-slate-700">|</span>
           <span>v0.1.0</span>
        </div>
      </div>
    </main>
  );
}
