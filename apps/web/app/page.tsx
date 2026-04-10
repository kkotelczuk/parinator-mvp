import { LoginForm } from "@/src/features/auth/login-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">Parinator Login</h1>
      <p className="text-center text-sm text-slate-600">
        Formularz wykorzystuje React Hook Form + Zod i laczy sie z mockiem Supabase.
      </p>
      <LoginForm />
    </main>
  );
}
