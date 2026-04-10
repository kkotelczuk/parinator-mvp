"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@parinator/schema";
import { Button } from "@parinator/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signInWithPassword } from "@/src/lib/supabase-auth-mock";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { loginSuccess } from "@/src/store/store";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const lastLoginEmail = useAppSelector((state) => state.auth.lastLoginEmail);
  const [submitMessage, setSubmitMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await signInWithPassword(data);
    dispatch(loginSuccess(result.user.email));
    setSubmitMessage(`Zalogowano jako ${result.user.email}`);
  });

  return (
    <form className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="jan@example.com"
          {...register("email")}
        />
        {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Haslo
        </label>
        <input
          id="password"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Minimum 8 znakow"
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Logowanie..." : "Zaloguj"}
      </Button>

      {submitMessage ? <p className="text-sm text-emerald-700">{submitMessage}</p> : null}
      {lastLoginEmail ? (
        <p className="text-xs text-slate-600">Ostatni login w store: {lastLoginEmail}</p>
      ) : null}
    </form>
  );
}
