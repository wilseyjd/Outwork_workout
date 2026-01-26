# Outwork - Workout Tracker

## Overview
Outwork is a mobile-first web application for workout tracking. It helps lifters track their training progress, plan workouts, log sessions, track supplements, and monitor body weight.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
- **Styling**: Tailwind CSS + shadcn/ui components

## Project Structure
```
client/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn components
│   │   ├── app-layout.tsx
│   │   ├── app-header.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── theme-provider.tsx
│   │   ├── loading-skeleton.tsx
│   │   └── empty-state.tsx
│   ├── pages/            # Route pages
│   │   ├── landing.tsx   # Public landing page
│   │   ├── today.tsx     # Today's workouts
│   │   ├── plan.tsx      # Templates & scheduling
│   │   ├── history.tsx   # Past sessions
│   │   ├── supplements.tsx
│   │   ├── settings.tsx
│   │   ├── exercises.tsx
│   │   ├── template-detail.tsx
│   │   ├── exercise-detail.tsx
│   │   ├── session.tsx   # Active workout
│   │   └── session-view.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── queryClient.ts
│   ├── App.tsx
│   └── index.css
server/
├── index.ts              # Express server entry
├── routes.ts             # API routes
├── storage.ts            # Database operations
├── db.ts                 # Database connection
└── replit_integrations/  # Auth integration
shared/
└── schema.ts             # Drizzle schema + types
```

## Database Schema
- **exercises**: User's exercise library
- **workout_templates**: Workout template definitions
- **workout_template_exercises**: Exercises in templates
- **planned_sets**: Target sets for template exercises
- **workout_schedule**: Scheduled workouts by date
- **workout_sessions**: Active/completed workout sessions
- **session_exercises**: Exercises in a session
- **performed_sets**: Logged sets with actual data
- **supplements**: User's supplement list
- **supplement_schedule**: When to take supplements
- **supplement_logs**: Intake history
- **body_weight_logs**: Weight tracking

## Key Features
1. **Exercise Bank**: Create/manage personal exercise library
2. **Workout Templates**: Build structured workout plans with target sets
3. **Scheduling**: Plan workouts on a weekly calendar
4. **Session Logging**: Track actual performance during workouts
5. **Exercise History**: See "what I lifted last time"
6. **Supplement Tracking**: Log daily supplement intake
7. **Body Weight**: Track weight over time

## Design Decisions
- Mobile-first UI with bottom navigation
- Orange accent color (#f97316 / HSL 24 95% 53%)
- Dark/light theme support
- Touch-friendly interactions
- Serif fonts for headings, sans-serif for body

## API Endpoints
All endpoints require authentication except `/api/auth/*`

### Exercises
- GET `/api/exercises` - List all
- POST `/api/exercises` - Create
- PATCH `/api/exercises/:id` - Update
- DELETE `/api/exercises/:id` - Delete

### Templates
- GET `/api/templates` - List all
- GET `/api/templates/:id` - Get with exercises
- POST `/api/templates` - Create
- POST `/api/templates/:id/exercises` - Add exercise
- POST `/api/templates/:id/exercises/:eid/sets` - Add planned set

### Sessions
- GET `/api/sessions` - List history
- GET `/api/sessions/active` - Get current session
- POST `/api/sessions/start/:scheduleId` - Start from schedule
- POST `/api/sessions/adhoc` - Start ad-hoc
- POST `/api/sessions/:id/exercises/:eid/sets` - Log set
- POST `/api/sessions/:id/end` - Complete workout

### Supplements
- GET/POST `/api/supplements`
- GET `/api/supplements/logs/today`
- POST `/api/supplements/logs`

### Body Weight
- GET/POST `/api/weight`

## Development
```bash
npm run dev      # Start dev server
npm run db:push  # Push schema changes
```
