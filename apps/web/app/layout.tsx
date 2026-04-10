import type { Metadata } from "next";
import { StoreProvider } from "@/src/store/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parinator",
  description: "Monorepo starter: Next.js + NestJS + Supabase + Cloudflare",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
