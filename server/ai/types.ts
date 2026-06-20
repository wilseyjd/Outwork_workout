import { z } from "zod";

// --------------------------------------------------------------------------
// Input types
// --------------------------------------------------------------------------

export interface TrainingHistorySummary {
  workoutsLast90Days: number;
  topExercises: Array<{ name: string; totalSets: number }>;
  recentPRs: Array<{ exercise: string; weight?: number; reps?: number; timeSeconds?: number }>;
}

export interface ExerciseLibraryEntry {
  name: string;
  category?: string | null;
  trackingType: "weight_reps" | "time" | "distance_time" | "distance_only";
}

export interface PlanInput {
  primaryGoal: string;
  secondaryGoals?: string[];
  goalCategory?: string;
  targetDate?: string;           // ISO date string, e.g. "2026-09-01"
  timelineDescription?: string;  // e.g. "6-9 months"
  daysPerWeek: number;
  sessionDurationMinutes: number;
  equipmentType: string;         // "full_gym" | "home" | "bodyweight"
  avoidances?: string;
  additionalContext?: string;
  // Enriched server-side from the user's DB records
  exerciseLibrary: ExerciseLibraryEntry[];
  trainingHistory: TrainingHistorySummary;
}

// --------------------------------------------------------------------------
// Output schema (Zod) — what the AI must return
// --------------------------------------------------------------------------

export const plannedSetSchema = z.object({
  reps: z.number().int().positive().optional(),
  weight: z.number().min(0).optional(),
  rest: z.number().int().min(0).optional(),
  warmup: z.boolean().optional(),
});

export const planResponseSchema = z.object({
  goalSummary: z.string().min(1),
  planRationale: z.string().min(1),
  critiques: z.array(z.string()),
  assumptions: z.array(z.string()),
  overallStructure: z.object({
    totalWeeks: z.number().int().min(1).max(52),
    workoutsPerWeek: z.number().int().min(1).max(7),
    estimatedSessionMinutes: z.number().int().positive(),
    phases: z.array(z.object({
      name: z.string(),
      weeks: z.string(), // e.g. "1-4"
      focus: z.string(),
    })),
  }),
  weeklyStructure: z.array(z.object({
    dayOfWeek: z.string(),
    workoutType: z.string(),
    focus: z.string(),
  })),
  workoutTemplates: z.array(z.object({
    name: z.string().min(1),
    exercises: z.array(z.object({
      exerciseName: z.string().min(1),
      sets: z.array(plannedSetSchema).min(1),
    })).min(1),
  })).min(1),
  scheduleMap: z.array(z.object({
    weekNumber: z.number().int().positive(),
    dayOfWeek: z.string(),
    templateName: z.string().min(1),
  })).min(1),
});

export type PlanResponse = z.infer<typeof planResponseSchema>;
