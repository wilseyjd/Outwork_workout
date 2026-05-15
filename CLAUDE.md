# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Express + Vite on port 5000) |
| `npm run build` | Production build (client → dist/public/, server → dist/index.cjs) |
| `npm start` | Run production build |
| `npm run check` | TypeScript type checking (no tests exist) |
| `npm run db:push` | Push Drizzle schema changes to PostgreSQL |
| `npm run db:seed` | Seed system exercises from exercises-seed.csv |

## Environment Variables

Required in `.env`: `DATABASE_URL` (PostgreSQL connection string), `SESSION_SECRET`

## Architecture

Single-repo app with three directories sharing TypeScript types:

- **client/** — React 18 SPA built with Vite. Uses Wouter for routing, TanStack React Query for server state, shadcn/ui (New York style) for components, Tailwind CSS for styling.
- **server/** — Express 5 API. All database access goes through `storage.ts` (the data access layer). Auth is session-based with `connect-pg-simple` backing sessions in PostgreSQL.
- **shared/** — Drizzle ORM schema (`schema.ts`) and auth models. Imported by both client and server via `@shared/*` path alias.

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Configured in both `tsconfig.json` and `vite.config.ts`.

### How Dev Server Works

In development, `tsx server/index.ts` runs Express which integrates Vite's dev server as middleware — everything serves from port 5000. In production, the client is pre-built to static files served by Express.

### Build Process

`script/build.ts` handles the production build:
- Client: Vite builds to `dist/public/`
- Server: esbuild bundles to `dist/index.cjs` (CommonJS, minified)
- Vercel: When `VERCEL` env is set, outputs to `.vercel/output/` using Build Output API v3

### Database

PostgreSQL with Drizzle ORM. 17 tables defined in `shared/schema.ts`. All IDs are UUIDs. Migrations live in `migrations/` and are managed by drizzle-kit.

Key tables: `users`, `exercises`, `circuits`, `circuit_exercises`, `workout_templates`, `workout_template_exercises`, `planned_sets`, `workout_schedule`, `workout_sessions`, `session_exercises`, `performed_sets`, `supplements`, `supplement_schedule`, `supplement_logs`, `body_weight_logs`.

### API Structure

All routes in `server/routes.ts`. Base path `/api/*`. All non-auth routes require authentication via `isAuthenticated` middleware. Input validation uses Zod schemas. Key route groups: `/api/auth/*`, `/api/exercises/*`, `/api/circuits/*`, `/api/templates/*`, `/api/schedule/*`, `/api/sessions/*`, `/api/supplements/*`, `/api/weight/*`, `/api/analytics/*`.

### Client Patterns

- One page component per route in `client/src/pages/`
- shadcn/ui components in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/` (`useAuth`, `useToast`, `useMobile`)
- TanStack Query configured with infinite stale time and no automatic refetching — cache invalidation is manual
- Dark/light theming via `next-themes` with CSS variables (orange accent color)
- Mobile-first design with bottom navigation

### Deployment

Deployed to Vercel as a serverless function (`server/vercel.ts`) + static assets. Routing: `/api/*` → serverless function, everything else → SPA fallback. Also configured for Replit deployment.
