# Product Requirements Document (PRD) — Outwork (Workout Tracker)

## Project Overview
- **Project Name:** Outwork — Workout

## Purpose
Outwork is a mobile-first web app that helps me plan and track workouts so I can get in better shape, get stronger, and improve my running stamina.

## Background
I want an app that does exactly what I need—no extra complexity. I should be able to:
- Create workouts composed of exercises with planned targets (sets, reps, target weight and/or target time).
- Execute workouts in the gym by recording actual performance after each set (actual weight, reps, time as applicable).
- Add comments/notes to workouts and optionally attach images.
- Schedule workouts for specific days so I can plan ahead.
- Track supplements I’m taking (dose and schedule) and maintain consistency.
- Track body weight for weight-loss or recomposition goals.

### Key Concept: Planned vs Performed
- **Planned Workout:** the template/plan (targets) and schedule.
- **Performed Workout (Workout Session):** the actual logged instance generated when I do the workout, capturing actual sets, reps, weights, notes, and attachments.

## Goals and Objectives
- Consistently track workouts without friction.
- See progression over time (weight, reps, and volume).
- Plan workouts in advance and execute them smoothly in the gym.
- Stay motivated and accountable.
- Maintain consistency across workouts and supplement intake.

## Scope
### In Scope (MVP)
- Log exercises, sets, reps, weight, rest time, and time (when applicable).
- View workout history.
- Create new exercises.
- Create workouts by combining exercises.
- Maintain an **Exercise Bank** for reuse.
- Schedule workouts on specific days.
- Track supplements (create, schedule, and log intake).
- Enter and update body weight for weight-related goals.
- Simple progression views (e.g., “what did I lift last time?”, trends over time).

### Out of Scope
- Nutrition tracking.
- Social feeds / leaderboards.
- AI coaching.
- Wearable integrations.
- Class-based workouts.

## User Stories
- **As an** intermediate to advanced fitness enthusiast, **I want** to plan workouts in advance **so that** I have a clear goal and plan when I get to the gym.
- **As an** intermediate to advanced fitness enthusiast, **I want** to track my exercises during my workout **so that** I can measure performance over time.
- **As an** intermediate to advanced fitness enthusiast, **I want** to create exercises and use them to build workouts **so that** I can tailor training to my preferences.
- **As an** intermediate to advanced fitness enthusiast, **I want** to set up and track supplements **so that** I can see how they relate to performance and maintain consistency.
- **As an** intermediate to advanced fitness enthusiast, **I want** to see my workout data and performance trends **so that** I can confirm I’m progressing toward my goals.

## Requirements
### Functional Requirements (MVP)
- **Exercise Bank**
  - Create exercise
  - Edit exercise
  - Copy exercise
  - Delete exercise
- **Workout Builder**
  - Create workout (template)
  - Edit workout (template)
  - Copy workout (template)
  - Delete workout (template)
  - Add exercises to a workout
  - Add/edit planned sets (target reps/weight/time, rest time)
- **Workout Scheduling & Execution**
  - Schedule workout on a day
  - Start a scheduled workout (creates a performed workout/session)
  - Track workout (record actual sets: weight, reps, time as applicable)
  - Save workout session
  - Add notes/comments to a session
  - Attach images (optional)
  - View workout history (sessions)
- **Supplements**
  - Add supplement
  - Edit supplement
  - Delete supplement
  - Schedule supplement intake
  - Track supplement intake (log)
  - View supplement history
- **Progress**
  - View progression (basic views such as last time, trends, volume over time)
- **Body Weight**
  - Enter and update body weight
  - View weight history (basic)

### Data Captured Per Set (MVP)
- Weight (lbs) — if applicable
- Reps — if applicable
- Time (duration) — if applicable
- Rest time
- Optional: warmup vs working set flag

## Success Metrics
- I log **X** workouts per week.
- I haven’t missed logging a workout in **Y** weeks.
- I can instantly answer “what did I lift last time?” for a given exercise.

## Timeline
- Build a simple MVP using AI-assisted tools in **1–2 weeks**.

## Stakeholders
- Jeff (Me) — Product, Engineering, and Primary User

## Notes / Constraints
- Web app
- Tech stack: React + Supabase
- Prioritize mobile experience
- Privacy-first (no social features)
