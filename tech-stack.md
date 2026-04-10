# Project Technology Stack & Architecture Specification

## 1. Core Overview

This document defines the technology stack, architecture, and deployment strategy for a new full-stack web application. AI agents must strictly adhere to these libraries and frameworks when generating code, configurations, or suggesting architectural patterns.

## 2. Frontend Ecosystem (SSR & Client)

- **Core Framework:** React 19+
- **Meta-Framework:** Next.js (App Router preferred, utilizing Server-Side Rendering - SSR)
- **Language:** TypeScript (Strict mode enabled)
- **State Management (Global):** Redux Toolkit (RTK)
  - _Context:_ Use for complex, shared global client state.
- **Form Handling:** React Hook Form
- **Schema Validation:** Zod
  - _Context:_ Use Zod for both form validation schemas and API response type safety.
- **Styling:** Tailwind CSS
  - _Context:_ Use utility classes directly in components. Avoid custom CSS files unless absolutely necessary.

## 3. Backend Ecosystem & BaaS

- **Primary Backend Framework:** NestJS
  - _Context:_ Use for custom business logic, complex API endpoints, microservices, and secure server-to-server integrations.
- **Backend-as-a-Service / Database:** Supabase
  - _Context:_ PostgreSQL database, Authentication, and Row Level Security (RLS). Integrate with both Next.js (via Supabase SSR client) and NestJS (via Supabase JS/Admin client).

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
