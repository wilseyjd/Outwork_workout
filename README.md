# Outwork

A workout tracking web application for planning workouts, logging exercises, tracking supplements, and monitoring fitness progress over time.

## What is Outwork?

Outwork is a personal fitness journal designed for lifters. It provides a clean, mobile-friendly interface to:

- **Build an exercise library** with custom tracking preferences (weight, reps, time, distance)
- **Create workout templates** with target sets, reps, and weights
- **Log workouts in real-time** and compare against your plan
- **Group exercises into circuits** for supersets and circuit-style training
- **Schedule workouts** for the week and track consistency
- **Track supplements** with daily/weekly schedules and intake logging
- **Log body weight** to monitor progress over time
- **View analytics** with charts showing volume, strength trends, and workout frequency
- **Export your data** for backup or external analysis

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), TanStack React Query, Wouter (routing), Recharts

**Backend:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, express-session

**Auth:** Email/password with bcrypt hashing, PostgreSQL-backed sessions

## Project Structure

```
Outwork_workout/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Reusable UI components (shadcn/ui + custom)
│       ├── hooks/           # Custom React hooks (auth, toast, mobile)
│       ├── lib/             # Utilities (React Query client, helpers)
│       ├── pages/           # Page components (one per route)
│       ├── App.tsx          # Root component with routing
│       └── main.tsx         # Entry point
├── server/                  # Express backend
│   ├── index.ts             # Server entry point
│   ├── auth.ts              # Authentication (signup, login, sessions)
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Database queries (Drizzle ORM)
│   ├── db.ts                # Database connection
│   └── seed-exercises.ts    # Exercise seeding script
├── shared/                  # Shared between client and server
│   ├── schema.ts            # Drizzle table definitions + Zod validation
│   └── models/
│       └── auth.ts          # User and session table definitions
├── migrations/              # Database migrations (drizzle-kit)
├── drizzle.config.ts        # Drizzle ORM configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── package.json
```

The app is a monorepo where the client and server share TypeScript types through the `shared/` directory. In development, Vite's dev server is integrated into Express. In production, the client is built to static files and served by Express alongside the API — all on a single port.

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

### 1. Clone the repository

```bash
git clone https://github.com/wilseyjd/Outwork_workout.git
cd Outwork_workout
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database
SESSION_SECRET=any-random-secret-string
```

### 4. Set up the database

Push the schema to your PostgreSQL database:

```bash
npm run db:push
```

Optionally seed the exercise library with a starter set of exercises:

```bash
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:5000](http://localhost:5000).

### Production build

```bash
npm run build
npm start
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build client and server for production |
| `npm start` | Run the production build |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:seed` | Seed the exercise library from CSV |

## License

MIT
