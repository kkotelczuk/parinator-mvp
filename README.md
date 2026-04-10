# Parinator Monorepo

This Turborepo-based monorepo includes:

- `apps/web` - Next.js (App Router, SSR), Redux Toolkit, RHF + Zod, Tailwind, RTL + Vitest, Playwright
- `apps/api` - NestJS with an auth module and Supabase client integration
- `packages/ui` - shared UI components
- `packages/config` - shared ESLint/TS/Prettier configuration
- `packages/schema` - shared Zod schemas and TypeScript types

## Requirements

- Node.js 22+
- npm 10+

## Quick Start (One Command)

```bash
npm install && npm run dev
```

This command starts frontend and backend in parallel via Turborepo.

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/health`

## Commands

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Environment Variables

`apps/api/.env` (example):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
```

## Cloudflare

- Frontend (`apps/web`) is prepared for Cloudflare via OpenNext (`npm run build:cf --workspace=@parinator/web`) and `wrangler.toml`.
- Backend (`apps/api`) includes a ready-to-use `Dockerfile` for container-based deployment (for example Cloudflare Workers/Platforms with a container image).
