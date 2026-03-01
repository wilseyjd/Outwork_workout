import type { PlanInput } from "./types";

export const SYSTEM_PROMPT = `You are an expert certified personal trainer and strength & conditioning coach.
Your job is to create a structured, periodized training plan based on the user's goals, constraints, and history.

Rules:
- Be honest and direct. If a goal is unrealistic for the timeline, say so in "critiques" and adjust the plan accordingly.
- Apply progressive overload: each phase should build on the last.
- Respect the user's available days/week and session duration. Never schedule more days than specified.
- Use exercises from the user's existing library when possible. You may introduce new exercises if needed.
- Pre-populated weight/rep values should be realistic starting points — not maxes. Use the user's history as a guide.
- The scheduleMap must cover every week of the plan (1 through totalWeeks). Each entry maps a week number + day of week to a template name that exists in workoutTemplates.
- Template names in scheduleMap must exactly match names in workoutTemplates.
- Respond ONLY with a single valid JSON object. No markdown, no code fences, no explanation outside the JSON.`;

export function buildPlanPrompt(input: PlanInput): string {
  const lines: string[] = [];

  lines.push("=== USER GOAL ===");
  lines.push(`Primary goal: ${input.primaryGoal}`);
  if (input.goalCategory) lines.push(`Category: ${input.goalCategory}`);
  if (input.secondaryGoals?.length) {
    lines.push(`Secondary goals: ${input.secondaryGoals.join("; ")}`);
  }

  lines.push("\n=== TIMELINE ===");
  if (input.targetDate) lines.push(`Target date: ${input.targetDate}`);
  if (input.timelineDescription) lines.push(`Timeline: ${input.timelineDescription}`);
  if (!input.targetDate && !input.timelineDescription) lines.push("No specific timeline provided.");

  lines.push("\n=== CONSTRAINTS ===");
  lines.push(`Days available per week: ${input.daysPerWeek}`);
  lines.push(`Session duration: ${input.sessionDurationMinutes} minutes`);
  lines.push(`Equipment: ${formatEquipment(input.equipmentType)}`);
  if (input.avoidances) lines.push(`Exercises/movements to avoid: ${input.avoidances}`);
  if (input.additionalContext) lines.push(`Additional context: ${input.additionalContext}`);

  lines.push("\n=== USER'S EXERCISE LIBRARY ===");
  if (input.exerciseLibrary.length > 0) {
    lines.push("The following exercises are already in the user's library (prefer these by name when possible):");
    for (const ex of input.exerciseLibrary) {
      const cat = ex.category ? ` [${ex.category}]` : "";
      lines.push(`  - ${ex.name}${cat} (tracks: ${formatTracking(ex.trackingType)})`);
    }
  } else {
    lines.push("No exercises in library yet. Create appropriate exercises from scratch.");
  }

  lines.push("\n=== TRAINING HISTORY (last 90 days) ===");
  const h = input.trainingHistory;
  lines.push(`Total workouts: ${h.workoutsLast90Days}`);
  if (h.topExercises.length > 0) {
    lines.push("Most trained exercises:");
    for (const ex of h.topExercises.slice(0, 10)) {
      lines.push(`  - ${ex.name}: ${ex.totalSets} sets`);
    }
  }
  if (h.recentPRs.length > 0) {
    lines.push("Recent personal records:");
    for (const pr of h.recentPRs.slice(0, 10)) {
      const detail = pr.weight ? `${pr.weight} lbs × ${pr.reps} reps`
        : pr.timeSeconds ? `${pr.timeSeconds}s`
        : `${pr.reps} reps`;
      lines.push(`  - ${pr.exercise}: ${detail}`);
    }
  }
  if (h.workoutsLast90Days === 0) {
    lines.push("No recent workout history. Treat this user as a beginner unless stated otherwise.");
  }

  lines.push("\n=== OUTPUT SCHEMA ===");
  lines.push(`Return a JSON object with exactly these fields:
{
  "goalSummary": "1-2 sentence plain-language restatement of the goal",
  "planRationale": "2-3 sentences explaining why this plan will work",
  "critiques": ["string — any red flags or adjustments made to the user's stated goal/timeline"],
  "assumptions": ["string — assumptions you made (equipment, experience level, etc.)"],
  "overallStructure": {
    "totalWeeks": number,
    "workoutsPerWeek": number,
    "estimatedSessionMinutes": number,
    "phases": [{ "name": "string", "weeks": "1-4", "focus": "string" }]
  },
  "weeklyStructure": [
    { "dayOfWeek": "Monday", "workoutType": "string", "focus": "string" }
  ],
  "workoutTemplates": [
    {
      "name": "Training Plan: <descriptive name>",
      "exercises": [
        {
          "exerciseName": "string",
          "sets": [{ "reps": number, "weight": number, "rest": number, "warmup": boolean }]
        }
      ]
    }
  ],
  "scheduleMap": [
    { "weekNumber": 1, "dayOfWeek": "Monday", "templateName": "Training Plan: <name>" }
  ]
}`);

  return lines.join("\n");
}

function formatEquipment(type: string): string {
  const map: Record<string, string> = {
    full_gym: "Full gym (barbells, dumbbells, cables, machines)",
    home: "Home gym (dumbbells, resistance bands, limited equipment)",
    bodyweight: "Bodyweight only (no equipment)",
  };
  return map[type] ?? type;
}

function formatTracking(type: string): string {
  const map: Record<string, string> = {
    weight_reps: "weight + reps",
    time: "time only",
    distance_time: "distance + time",
    distance_only: "distance only",
  };
  return map[type] ?? type;
}
