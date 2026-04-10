# Project Technology Stack & Architecture Specification

## 1. Core Overview

This document defines the technology stack, architecture, and deployment strategy for a new full-stack web application. AI agents must strictly adhere to these libraries and frameworks when generating code, configurations, or suggesting architectural patterns.

### MVP Delivery Profile (Pilot-First)

- **Default MVP Architecture:** Next.js + Supabase first.
- **Complexity Strategy:** Start lean, then add architectural layers only after pilot validation.
- **Backend Expansion Rule:** Introduce NestJS only when required by integration complexity, performance, or domain growth.

## 2. Frontend Ecosystem (SSR & Client)

- **Core Framework:** React 19+
- **Meta-Framework:** Next.js (App Router preferred, utilizing Server-Side Rendering - SSR)
- **Language:** TypeScript (Strict mode enabled)
- **State Management (Default):** Local component state + React Context + query cache patterns.
  - _Context:_ This is the default for MVP speed and low maintenance.
- **State Management (Scale-Up Option):** Redux Toolkit (RTK)
  - _Context:_ Introduce only when shared state complexity becomes difficult to manage with local/context patterns.
- **Form Handling:** React Hook Form
- **Schema Validation:** Zod
  - _Context:_ Use Zod for both form validation schemas and API response type safety.
- **Styling:** Tailwind CSS
  - _Context:_ Use utility classes directly in components. Avoid custom CSS files unless absolutely necessary.

## 3. Backend Ecosystem & BaaS

- **Primary Backend for MVP:** Next.js Route Handlers + Supabase (including server-side logic and policies).
  - _Context:_ Keep one backend surface in MVP to optimize delivery speed.
- **Backend Framework (Scale-Up Option):** NestJS
  - _Context:_ Add when custom business workflows, integration orchestration, or service boundaries justify a dedicated backend layer.
- **Backend-as-a-Service / Database:** Supabase
  - _Context:_ PostgreSQL database, Authentication, and Row Level Security (RLS). Integrate with both Next.js (via Supabase SSR client) and NestJS (via Supabase JS/Admin client).
- **Background Workloads (Import/Scraping):** Server-side async jobs with retries and fallback.
  - _Context:_ Implement scraping/import as asynchronous server tasks; avoid over-engineered orchestration in MVP.

## 4. Testing Strategy

- **Unit & Integration Testing (Frontend):** React Testing Library (RTL) + Jest (or Vitest)
  - _Focus:_ Component rendering, user interactions, and hook logic.
- **End-to-End (E2E) Testing:** Playwright
  - _Focus:_ Critical user journeys, full-stack integration, and cross-browser testing.

## 5. CI/CD & Infrastructure

- **Continuous Integration / Continuous Deployment:** GitHub Actions
  - _Pipelines:_ Linting, Type Checking, Running RTL Tests, Running Playwright E2E Tests, Build, and Deployment steps.
- **Deployment & Edge Architecture:** Cloudflare
  - _Frontend Hosting:_ Cloudflare Pages (optimized for Next.js SSR / Edge runtimes).
  - _DNS/CDN:_ Cloudflare.

## 6. AI Agent Guidelines & Rules

- **Type Safety:** Ensure end-to-end type safety between Next.js, NestJS, and Supabase using TypeScript interfaces and Zod schemas.
- **Component Architecture:** Prefer Server Components in Next.js where possible. Use Client Components (`"use client"`) only when interactivity, hooks, or Redux state are required.
- **Security:** Never expose Supabase Service Role Keys on the frontend. Use RLS policies strictly.
- **Offline Pairing Mode:** Implement captain offline mode with local persistence (for example IndexedDB) and explicit sync flow after reconnect.
