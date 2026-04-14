"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@parinator/schema";
import { useLogin } from "./use-pin-login";

export function AuthPinForm() {
  const router = useRouter();
  const { executeLogin, isLoading, error } = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle errors coming from the API hook
  useEffect(() => {
    if (error) {
      if (error.code === "VALIDATION_ERROR") {
        setError("password", { type: "server", message: error.message });
      }
    }
  }, [error, setError]);

  const onSubmit = handleSubmit(async (data) => {
    const result = await executeLogin(data);
    
    if (result) {
      router.push("/dashboard");
    }
  });

  // Determine form-wide errors based on the API error code
  let formErrorMessage = null;
  if (error && error.code !== "VALIDATION_ERROR") {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
      case "401":
        formErrorMessage = "Nieprawidłowy email lub hasło.";
        break;
      case "ACCOUNT_INACTIVE":
      case "403":
        formErrorMessage = "Twoje konto oczekuje na aktywację.";
        break;
      case "TOO_MANY_ATTEMPTS":
      case "429":
        formErrorMessage = "Zbyt wiele prób. Spróbuj powonie za chwilę.";
        break;
      default:
        formErrorMessage = "Wystąpił błąd serwera lub problem z połączeniem.";
    }
  }

  const isFormDisabled = isSubmitting || isLoading || error?.code === "TOO_MANY_ATTEMPTS";

  return (
    <form 
      onSubmit={onSubmit} 
      className="w-full max-w-sm space-y-8 p-6 bg-[#121212] rounded-xl border border-slate-800 shadow-2xl relative"
    >
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Enter Credentials</h2>
        <div className="w-12 h-1 bg-green-500 mx-auto rounded-full mt-2"></div>
      </div>

      {formErrorMessage && (
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-medium animate-in fade-in">
          {formErrorMessage}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <input
            id="email"
            type="email"
            placeholder="OPERATIVE EMAIL"
            autoComplete="email"
            disabled={isFormDisabled}
            className="w-full bg-transparent border-b-2 border-slate-700 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors uppercase tracking-wider text-sm"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-2 text-xs text-red-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            id="password"
            type="password"
            placeholder="ACCESS PASSWORD"
            autoComplete="current-password"
            disabled={isFormDisabled}
            className="w-full bg-transparent border-b-2 border-slate-700 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors uppercase tracking-wider text-sm"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-2 text-xs text-red-500 font-medium">{errors.password.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isFormDisabled}
        className="w-full py-4 bg-green-500 hover:bg-green-400 text-slate-950 font-bold uppercase tracking-widest rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
      >
        {isSubmitting || isLoading ? (
          <span className="animate-pulse">Authorizing...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Unlock Command
          </>
        )}
      </button>

      <div className="pt-6 mt-6 border-t border-slate-800 text-center">
         <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em]">Authorized Personnel Only</p>
      </div>
    </form>
  );
}
