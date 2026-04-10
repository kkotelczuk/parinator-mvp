# Parinator Monorepo

Monorepo oparte na Turborepo z:

- `apps/web` - Next.js (App Router, SSR), Redux Toolkit, RHF + Zod, Tailwind, RTL + Vitest, Playwright
- `apps/api` - NestJS + modul auth z klientem Supabase
- `packages/ui` - wspoldzielone komponenty UI
- `packages/config` - wspoldzielone konfiguracje ESLint/TS/Prettier
- `packages/schema` - wspoldzielone schematy Zod i typy TypeScript

## Wymagania

- Node.js 22+
- npm 10+

## Szybki start (jedna komenda)

```bash
npm install && npm run dev
```

Polecenie uruchamia frontend i backend rownolegle przez Turborepo.

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/health`

## Komendy

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Zmienne srodowiskowe

`apps/api/.env` (przyklad):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
```

## Cloudflare

- Frontend (`apps/web`) jest przygotowany pod Cloudflare przez `opennextjs-cloudflare` (`npm run build:cf --workspace=@parinator/web`) i `wrangler.toml`.
- Backend (`apps/api`) ma przygotowany `Dockerfile` do deploymentu kontenerowego (np. Cloudflare Workers/Platforms z obrazem kontenerowym).
