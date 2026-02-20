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

## Change Management & Release Process

All changes to this codebase — whether new features or bug fixes — must follow this process before any code is merged into `origin/main`.

### Feature & Bug Documentation (Required Before Implementation)

Before writing any code, a Notion page **must** exist for the change. This page must document:

- **Summary** — A clear, concise description of the planned change
- **Context & Rationale** — Why this change is needed and what problem it solves
- **Expected Benefit or Impact** — What improves as a result (user experience, performance, reliability, etc.)
- **Technical Approach** — The implementation plan, including any architectural decisions or affected files (if applicable)
- **Test Validation Cases** — Specific unit, integration, and manual QA steps that confirm the change works correctly and does not introduce regressions

The Notion page must be linked to the relevant Linear issue(s) before implementation begins.

### Linear Integration

- **All commits must reference the relevant Linear issue ID** in the commit message using the format:
  ```
  ABC-123: Short description of the change
  ```
  This enables Linear to automatically sync commit activity and update issue status.
- When work begins on an issue, update its status to the appropriate in-progress state.
- When work is complete and merged, move the issue to the correct completed state.
- Linear issues must remain up to date throughout the lifecycle of the change.

### Pre-Production Release Process

Before any code is pushed to `origin/main`, a **Release Bundle** must be prepared. The Release Bundle is a dedicated Notion page that includes:

- **Summary of all changes** included in the release
- **List of Linear issue IDs** addressed by the release
- **Links to Notion documentation pages** for each included change
- **Migration steps or deployment considerations** (database migrations, environment variable changes, etc.)
- **Rollback considerations** — how to revert the release if a critical issue is discovered post-deploy

The release must also be logged on the central **Releases Tracker** Notion page, which:

- Lists all releases in chronological order
- Links to each release's dedicated Notion page
- Includes the Linear issue IDs bundled in each release

### Required Before Merge

**No code may be merged into `origin/main` unless all of the following are true:**

- A Notion documentation page exists for every change included in the merge
- All relevant Linear issues are linked to the Notion page(s) and reflect the correct status
- A Release Bundle Notion page has been created for the release
- The release has been added to the central Releases Tracker Notion page

## Pull Request & Branching Workflow (Linear-Driven Development)

All development in this repository follows a Linear-first, branch-per-issue model. Every piece of work must be traceable from a Linear issue through a branch, to a pull request, and into `origin/main`.

### 1. Issue-Driven Development (Linear First)

- All development work **must originate from a Linear issue**. No code should be written without an associated Linear issue ID.
- If work is discovered that is not yet tracked, **create a Linear issue before starting development**.
- There are no exceptions to this rule. Untracked work will not be merged.

### 2. Branching Rules

Each Linear issue must be developed on its own dedicated Git branch. Branch names must follow this convention:

```
feature/{LINEAR-ID}-{short-description}
bugfix/{LINEAR-ID}-{short-description}
chore/{LINEAR-ID}-{short-description}
```

**Example:**
```
feature/ABC-123-user-auth-flow
```

**Combining multiple issues into a single branch is only permitted when:**
- The issues are tightly related and must be developed and tested together
- The relationship is clearly documented in both Linear and the PR description

When issues are combined, **all Linear IDs must be referenced** in:
- The branch name (where reasonable)
- The PR description
- All commit messages

### 3. Pull Request Requirements

No code may be merged into `origin/main` without an open Pull Request that satisfies all requirements below.

#### A. Opening the Pull Request

- **Target branch:** `main`
- **PR title** must include the Linear issue ID(s)
- **PR description** must include:
  - Summary of changes
  - Context and reason for the change
  - Linked Linear issue(s)
  - Test validation steps
  - Screenshots (required for any UI-related changes)

#### B. Linear Integration

- All commit messages must include the relevant Linear ID(s) using the format `ABC-123: Short description`
- The PR must explicitly reference the Linear issue(s)
- Linear issue status must be kept current:
  - Move to **"In Progress"** when development begins
  - Move to **"In Review"** when the PR is opened
  - Move to **"Done"** only after the PR is merged

### 4. Review & Validation

- All PRs must pass automated checks before merge
- **Direct pushes to `main` are not allowed** under any circumstances
- A self-review of all changes is required before requesting review from others
- If review feedback is provided, all updates must be pushed to the same branch — do not open a new PR

### 5. Merge Policy

- **Preferred merge method: Squash and merge** (unless a different method is explicitly specified for the branch)
- The squash commit message must:
  - Include all relevant Linear IDs
  - Provide a concise, accurate summary of the changes introduced

### 6. Production Safety

- A **Release Bundle** (as defined in the Change Management & Release Process section) must be created before merging any PR intended for production
- The PR description must link to:
  - The relevant Notion documentation page for each change
  - The Release Bundle Notion page (if applicable)
