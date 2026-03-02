import { db } from "./db";
import { eq, desc, and, gte, lte, sql, or, inArray, not } from "drizzle-orm";
import type { TrainingHistorySummary, PlanResponse } from "./ai/types";
import {
  exercises, hiddenSystemExercises, workoutTemplates, workoutTemplateExercises, plannedSets,
  workoutSchedule, workoutSessions, sessionExercises, performedSets,
  supplements, supplementSchedule, supplementLogs, bodyWeightLogs,
  circuits, circuitExercises, hiddenSystemCircuits,
  trainingGoals, trainingGoalTemplates,
  type Exercise, type InsertExercise,
  type Circuit, type InsertCircuit,
  type CircuitExercise, type InsertCircuitExercise,
  type WorkoutTemplate, type InsertWorkoutTemplate,
  type WorkoutTemplateExercise, type InsertWorkoutTemplateExercise,
  type PlannedSet, type InsertPlannedSet,
  type WorkoutScheduleItem, type InsertWorkoutSchedule,
  type WorkoutSession, type InsertWorkoutSession,
  type SessionExercise, type InsertSessionExercise,
  type PerformedSet, type InsertPerformedSet,
  type Supplement, type InsertSupplement,
  type SupplementScheduleItem, type InsertSupplementSchedule,
  type SupplementLog, type InsertSupplementLog,
  type BodyWeightLog, type InsertBodyWeightLog,
} from "../shared/schema";

export interface AcceptPlanWizardInputs {
  primaryGoal: string;
  goalCategory?: string;
  secondaryGoals?: string[];
  targetDate?: string;
  timelineDescription?: string;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  equipmentType: string;
  avoidances?: string;
  additionalContext?: string;
}

export interface AcceptPlanResult {
  trainingGoalId: string;
  conflictCount: number;
  templateCount: number;
  scheduleCount: number;
  newExercises: string[];
}

export interface ActiveTrainingGoal {
  id: string;
  primaryGoal: string;
  goalCategory: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetDate: string | null;
  timelineDescription: string | null;
  daysPerWeek: number | null;
  sessionDurationMinutes: number | null;
  generatedPlan: PlanResponse | null;
  currentWeek: number;
  totalWeeks: number;
}

export interface IStorage {
  // Circuits
  getCircuits(userId: string): Promise<any[]>;
  getCircuit(userId: string, id: string): Promise<any | undefined>;
  createCircuit(data: InsertCircuit): Promise<Circuit>;
  updateCircuit(userId: string, id: string, data: Partial<InsertCircuit>): Promise<Circuit | undefined>;
  deleteCircuit(userId: string, id: string): Promise<void>;
  copyCircuit(userId: string, id: string): Promise<Circuit>;
  hideSystemCircuit(userId: string, circuitId: string): Promise<void>;

  // Circuit Exercises
  addCircuitExercise(data: InsertCircuitExercise): Promise<CircuitExercise>;
  removeCircuitExercise(userId: string, circuitId: string, id: string): Promise<void>;
  reorderCircuitExercises(userId: string, circuitId: string, exerciseIds: string[]): Promise<void>;
  updateCircuitExercise(userId: string, id: string, data: Partial<InsertCircuitExercise>): Promise<CircuitExercise | undefined>;

  // Template-Circuit Integration
  addCircuitToTemplate(userId: string, templateId: string, circuitId: string, startPosition: number, rounds?: number): Promise<WorkoutTemplateExercise[]>;
  removeCircuitFromTemplate(userId: string, templateId: string, circuitId: string): Promise<void>;
  updateCircuitRoundsInTemplate(userId: string, templateId: string, circuitId: string, newRounds: number): Promise<void>;

  // Exercises
  getExercises(userId: string): Promise<Exercise[]>;
  getExercise(userId: string, id: string): Promise<Exercise | undefined>;
  createExercise(data: InsertExercise): Promise<Exercise>;
  updateExercise(userId: string, id: string, data: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(userId: string, id: string): Promise<void>;
  hideSystemExercise(userId: string, exerciseId: string): Promise<void>;

  // Workout Templates
  getTemplates(userId: string): Promise<any[]>;
  getTemplate(userId: string, id: string): Promise<any | undefined>;
  createTemplate(data: InsertWorkoutTemplate): Promise<WorkoutTemplate>;
  updateTemplate(userId: string, id: string, data: Partial<InsertWorkoutTemplate>): Promise<WorkoutTemplate | undefined>;
  deleteTemplate(userId: string, id: string): Promise<void>;
  copyTemplate(userId: string, id: string): Promise<WorkoutTemplate>;

  // Template Exercises
  addTemplateExercise(data: InsertWorkoutTemplateExercise): Promise<WorkoutTemplateExercise>;
  removeTemplateExercise(userId: string, templateId: string, id: string): Promise<void>;
  reorderTemplateExercises(userId: string, templateId: string, exerciseIds: string[]): Promise<void>;

  // Planned Sets
  addPlannedSet(data: InsertPlannedSet): Promise<PlannedSet>;
  updatePlannedSet(userId: string, id: string, data: Partial<InsertPlannedSet>): Promise<PlannedSet | undefined>;
  reorderPlannedSets(userId: string, templateExerciseId: string, setIds: string[]): Promise<void>;
  deletePlannedSet(userId: string, id: string): Promise<void>;

  // Schedule
  getScheduleForDate(userId: string, date: string): Promise<any[]>;
  getScheduleForWeek(userId: string, startDate: string): Promise<any[]>;
  getScheduleForRange(userId: string, startDate: string, endDate: string): Promise<any[]>;
  createSchedule(data: InsertWorkoutSchedule): Promise<WorkoutScheduleItem>;
  updateScheduleStatus(userId: string, id: string, status: string): Promise<void>;

  // Sessions
  getSessions(userId: string): Promise<any[]>;
  getSession(userId: string, id: string): Promise<any | undefined>;
  getActiveSession(userId: string): Promise<any | undefined>;
  startSession(userId: string, scheduleId: string): Promise<WorkoutSession>;
  createAdhocSession(userId: string): Promise<WorkoutSession>;
  startSessionFromTemplate(userId: string, templateId: string): Promise<WorkoutSession>;
  endSession(userId: string, id: string, notes?: string): Promise<WorkoutSession | undefined>;

  // Session Exercises
  addSessionExercise(data: InsertSessionExercise): Promise<SessionExercise>;

  // Performed Sets
  addPerformedSet(data: InsertPerformedSet): Promise<PerformedSet>;
  updatePerformedSet(userId: string, setId: string, data: { actualReps?: number; actualWeight?: string; actualTimeSeconds?: number; actualDistance?: string; restSeconds?: number; isWarmup?: boolean }): Promise<PerformedSet | undefined>;
  deletePerformedSet(userId: string, setId: string): Promise<void>;

  // Exercise History
  getExerciseHistory(userId: string, exerciseId: string): Promise<any[]>;

  // Last Performance
  getLastPerformance(userId: string, exerciseIds: string[]): Promise<Record<string, PerformedSet[]>>;

  // Supplements
  getSupplements(userId: string): Promise<Supplement[]>;
  getSupplement(userId: string, id: string): Promise<Supplement | undefined>;
  createSupplement(data: InsertSupplement): Promise<Supplement>;
  updateSupplement(userId: string, id: string, data: Partial<InsertSupplement>): Promise<Supplement | undefined>;
  deleteSupplement(userId: string, id: string): Promise<void>;

  // Supplement Logs
  getSupplementLogs(userId: string): Promise<SupplementLog[]>;
  getTodaySupplementLogs(userId: string): Promise<SupplementLog[]>;
  logSupplementIntake(data: InsertSupplementLog): Promise<SupplementLog>;
  updateSupplementLog(userId: string, id: string, data: { dose?: string; takenAt?: Date; notes?: string | null }): Promise<SupplementLog | undefined>;
  deleteSupplementLog(userId: string, id: string): Promise<void>;

  // Body Weight
  getWeightLogs(userId: string): Promise<BodyWeightLog[]>;
  logWeight(data: InsertBodyWeightLog): Promise<BodyWeightLog>;

  // Export
  getSessionsForExport(userId: string): Promise<any[]>;

  // Performed Exercises (exercises with workout history)
  getPerformedExercises(userId: string): Promise<Exercise[]>;

  // Analytics
  getExerciseAnalytics(userId: string, exerciseId: string, since?: Date): Promise<{
    date: string;
    maxWeight: number | null;
    totalEffort: number | null;
    bestTime: number | null;
    totalSets: number;
  }[]>;
  getAnalyticsOverview(userId: string): Promise<{
    workoutsThisWeek: number;
    workoutsThisMonth: number;
    currentStreak: number;
    avgSessionsPerWeek: number;
    weeklyVolume: { week: string; volume: number }[];
  }>;
  getTrainingVolume(userId: string, since?: Date): Promise<{ date: string; volume: number }[]>;
  getPersonalRecords(userId: string): Promise<{
    date: string;
    exerciseId: string;
    exerciseName: string;
    metric: "weight" | "time";
    value: number;
  }[]>;
  getVolumeByCategory(userId: string, since?: Date): Promise<{ category: string; volume: number }[]>;
  getSessionDurations(userId: string, since?: Date): Promise<{ date: string; durationMin: number }[]>;
  getTrainingHistorySummary(userId: string): Promise<TrainingHistorySummary>;
  acceptTrainingPlan(userId: string, opts: { wizardInputs: AcceptPlanWizardInputs; plan: PlanResponse }): Promise<AcceptPlanResult>;
  getActiveTrainingGoal(userId: string): Promise<ActiveTrainingGoal | null>;
  cancelActiveTrainingPlan(userId: string, opts: { removeFutureWorkouts: boolean }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Exercises
  async getExercises(userId: string): Promise<Exercise[]> {
    // Get user's hidden system exercises
    const hidden = await db.select()
      .from(hiddenSystemExercises)
      .where(eq(hiddenSystemExercises.userId, userId));
    const hiddenIds = hidden.map(h => h.exerciseId);

    // Get user's personal exercises + system exercises that aren't hidden
    const query = db.select().from(exercises).where(
      or(
        eq(exercises.userId, userId),
        and(
          eq(exercises.isSystem, true),
          hiddenIds.length > 0 ? not(inArray(exercises.id, hiddenIds)) : sql`true`
        )
      )
    ).orderBy(exercises.name);

    return await query;
  }

  async getExercise(userId: string, id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select()
      .from(exercises)
      .where(
        and(
          eq(exercises.id, id),
          or(eq(exercises.userId, userId), eq(exercises.isSystem, true))
        )
      );
    return exercise;
  }

  async createExercise(data: InsertExercise): Promise<Exercise> {
    const [exercise] = await db.insert(exercises).values(data).returning();
    return exercise;
  }

  async updateExercise(userId: string, id: string, data: Partial<InsertExercise>): Promise<Exercise | undefined> {
    // Ensure we only update exercises owned by the user (not system exercises)
    const [exercise] = await db.update(exercises)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(exercises.id, id), eq(exercises.userId, userId), eq(exercises.isSystem, false)))
      .returning();
    return exercise;
  }

  async deleteExercise(userId: string, id: string): Promise<void> {
    // Only delete exercises owned by the user
    await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, userId), eq(exercises.isSystem, false)));
  }

  async hideSystemExercise(userId: string, exerciseId: string): Promise<void> {
    await db.insert(hiddenSystemExercises).values({ userId, exerciseId });
  }

  // Circuits
  async getCircuits(userId: string): Promise<any[]> {
    const hidden = await db.select()
      .from(hiddenSystemCircuits)
      .where(eq(hiddenSystemCircuits.userId, userId));
    const hiddenIds = hidden.map(h => h.circuitId);

    const allCircuits = await db.select().from(circuits).where(
      or(
        eq(circuits.userId, userId),
        and(
          eq(circuits.isSystem, true),
          hiddenIds.length > 0 ? not(inArray(circuits.id, hiddenIds)) : sql`true`
        )
      )
    ).orderBy(circuits.name);

    return Promise.all(allCircuits.map(async (circuit) => {
      const exList = await db.select().from(circuitExercises)
        .where(eq(circuitExercises.circuitId, circuit.id));
      return { ...circuit, exerciseCount: exList.length };
    }));
  }

  async getCircuit(userId: string, id: string): Promise<any | undefined> {
    const [circuit] = await db.select().from(circuits)
      .where(
        and(
          eq(circuits.id, id),
          or(eq(circuits.userId, userId), eq(circuits.isSystem, true))
        )
      );
    if (!circuit) return undefined;

    const cExercises = await db.select().from(circuitExercises)
      .where(eq(circuitExercises.circuitId, id))
      .orderBy(circuitExercises.position);

    const exercisesWithDetails = await Promise.all(cExercises.map(async (ce) => {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, ce.exerciseId));
      return { ...ce, exercise };
    }));

    return { ...circuit, exercises: exercisesWithDetails };
  }

  async createCircuit(data: InsertCircuit): Promise<Circuit> {
    const [circuit] = await db.insert(circuits).values(data).returning();
    return circuit;
  }

  async updateCircuit(userId: string, id: string, data: Partial<InsertCircuit>): Promise<Circuit | undefined> {
    const [circuit] = await db.update(circuits)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(circuits.id, id), eq(circuits.userId, userId), eq(circuits.isSystem, false)))
      .returning();
    return circuit;
  }

  async deleteCircuit(userId: string, id: string): Promise<void> {
    await db.delete(circuitExercises).where(eq(circuitExercises.circuitId, id));
    await db.delete(circuits).where(and(eq(circuits.id, id), eq(circuits.userId, userId), eq(circuits.isSystem, false)));
  }

  async copyCircuit(userId: string, id: string): Promise<Circuit> {
    const original = await this.getCircuit(userId, id);
    if (!original) throw new Error("Circuit not found");

    const [newCircuit] = await db.insert(circuits).values({
      userId,
      name: `${original.name} (Copy)`,
      rounds: original.rounds,
      category: original.category,
      restBetweenExercisesSeconds: original.restBetweenExercisesSeconds,
      restBetweenRoundsSeconds: original.restBetweenRoundsSeconds,
      notes: original.notes,
    }).returning();

    for (const ce of original.exercises || []) {
      await db.insert(circuitExercises).values({
        userId,
        circuitId: newCircuit.id,
        exerciseId: ce.exerciseId,
        position: ce.position,
        restAfterSeconds: ce.restAfterSeconds,
        notes: ce.notes,
      });
    }

    return newCircuit;
  }

  async hideSystemCircuit(userId: string, circuitId: string): Promise<void> {
    await db.insert(hiddenSystemCircuits).values({ userId, circuitId });
  }

  // Circuit Exercises
  async addCircuitExercise(data: InsertCircuitExercise): Promise<CircuitExercise> {
    const [ce] = await db.insert(circuitExercises).values(data).returning();
    return ce;
  }

  async removeCircuitExercise(userId: string, circuitId: string, id: string): Promise<void> {
    await db.delete(circuitExercises).where(
      and(eq(circuitExercises.id, id), eq(circuitExercises.userId, userId))
    );
  }

  async reorderCircuitExercises(userId: string, circuitId: string, exerciseIds: string[]): Promise<void> {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.update(circuitExercises)
        .set({ position: i + 1 })
        .where(
          and(
            eq(circuitExercises.id, exerciseIds[i]),
            eq(circuitExercises.userId, userId),
            eq(circuitExercises.circuitId, circuitId)
          )
        );
    }
  }

  async updateCircuitExercise(userId: string, id: string, data: Partial<InsertCircuitExercise>): Promise<CircuitExercise | undefined> {
    const [ce] = await db.update(circuitExercises)
      .set(data)
      .where(and(eq(circuitExercises.id, id), eq(circuitExercises.userId, userId)))
      .returning();
    return ce;
  }

  // Template-Circuit Integration
  async addCircuitToTemplate(userId: string, templateId: string, circuitId: string, startPosition: number, rounds?: number): Promise<WorkoutTemplateExercise[]> {
    const circuit = await this.getCircuit(userId, circuitId);
    if (!circuit) throw new Error("Circuit not found");

    // Query circuit exercises directly to ensure we get all fields including defaults
    const circuitExerciseRows = await db.select({
      exerciseId: circuitExercises.exerciseId,
      position: circuitExercises.position,
      notes: circuitExercises.notes,
      defaultReps: circuitExercises.defaultReps,
      defaultWeight: circuitExercises.defaultWeight,
      defaultTimeSeconds: circuitExercises.defaultTimeSeconds,
    }).from(circuitExercises)
      .where(eq(circuitExercises.circuitId, circuitId))
      .orderBy(circuitExercises.position);

    console.log("[addCircuitToTemplate] Circuit exercises with defaults:", JSON.stringify(circuitExerciseRows));

    const totalRounds = rounds || circuit.rounds;
    const results: WorkoutTemplateExercise[] = [];
    let position = startPosition;

    for (const ce of circuitExerciseRows) {
      const [te] = await db.insert(workoutTemplateExercises).values({
        userId,
        templateId,
        exerciseId: ce.exerciseId,
        position,
        circuitId,
        circuitRound: null,
        circuitRounds: totalRounds,
        notes: ce.notes,
      }).returning();
      results.push(te);
      position++;

      // Create one planned set per round, using defaults from circuit exercise
      for (let round = 1; round <= totalRounds; round++) {
        const setValues: any = {
          userId,
          templateExerciseId: te.id,
          setNumber: round,
        };
        if (ce.defaultReps) setValues.targetReps = ce.defaultReps;
        if (ce.defaultWeight) setValues.targetWeight = ce.defaultWeight;
        if (ce.defaultTimeSeconds) setValues.targetTimeSeconds = ce.defaultTimeSeconds;

        await db.insert(plannedSets).values(setValues);
      }
    }

    return results;
  }

  async removeCircuitFromTemplate(userId: string, templateId: string, circuitId: string): Promise<void> {
    const tes = await db.select().from(workoutTemplateExercises)
      .where(and(
        eq(workoutTemplateExercises.templateId, templateId),
        eq(workoutTemplateExercises.circuitId, circuitId),
        eq(workoutTemplateExercises.userId, userId)
      ));

    for (const te of tes) {
      await db.delete(plannedSets).where(eq(plannedSets.templateExerciseId, te.id));
    }

    await db.delete(workoutTemplateExercises).where(and(
      eq(workoutTemplateExercises.templateId, templateId),
      eq(workoutTemplateExercises.circuitId, circuitId),
      eq(workoutTemplateExercises.userId, userId)
    ));
  }

  async updateCircuitRoundsInTemplate(userId: string, templateId: string, circuitId: string, newRounds: number): Promise<void> {
    const existingTes = await db.select().from(workoutTemplateExercises)
      .where(and(
        eq(workoutTemplateExercises.templateId, templateId),
        eq(workoutTemplateExercises.circuitId, circuitId),
        eq(workoutTemplateExercises.userId, userId)
      ))
      .orderBy(workoutTemplateExercises.position);

    if (existingTes.length === 0) return;

    // Fetch circuit exercise defaults for creating new planned sets
    const circuitExerciseDefaults = await db.select({
      exerciseId: circuitExercises.exerciseId,
      defaultReps: circuitExercises.defaultReps,
      defaultWeight: circuitExercises.defaultWeight,
      defaultTimeSeconds: circuitExercises.defaultTimeSeconds,
    }).from(circuitExercises)
      .where(eq(circuitExercises.circuitId, circuitId))
      .orderBy(circuitExercises.position);
    const defaultsByExerciseId = new Map(circuitExerciseDefaults.map(ce => [ce.exerciseId, ce]));

    for (const te of existingTes) {
      const existingSets = await db.select().from(plannedSets)
        .where(eq(plannedSets.templateExerciseId, te.id))
        .orderBy(plannedSets.setNumber);
      const currentCount = existingSets.length;

      if (newRounds > currentCount) {
        // Add new planned sets
        const ce = defaultsByExerciseId.get(te.exerciseId);
        for (let s = currentCount + 1; s <= newRounds; s++) {
          const setValues: any = {
            userId,
            templateExerciseId: te.id,
            setNumber: s,
          };
          if (ce?.defaultReps) setValues.targetReps = ce.defaultReps;
          if (ce?.defaultWeight) setValues.targetWeight = ce.defaultWeight;
          if (ce?.defaultTimeSeconds) setValues.targetTimeSeconds = ce.defaultTimeSeconds;

          await db.insert(plannedSets).values(setValues);
        }
      } else if (newRounds < currentCount) {
        // Remove excess planned sets
        for (const set of existingSets.filter(s => s.setNumber > newRounds)) {
          await db.delete(plannedSets).where(eq(plannedSets.id, set.id));
        }
      }
    }

    // Update circuitRounds on all template exercises
    await db.update(workoutTemplateExercises)
      .set({ circuitRounds: newRounds })
      .where(and(
        eq(workoutTemplateExercises.templateId, templateId),
        eq(workoutTemplateExercises.circuitId, circuitId),
        eq(workoutTemplateExercises.userId, userId)
      ));
  }

  // Workout Templates
  async getTemplates(userId: string): Promise<any[]> {
    const templates = await db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).orderBy(desc(workoutTemplates.createdAt));

    const templatesWithCounts = await Promise.all(templates.map(async (template) => {
      const exercisesList = await db.select().from(workoutTemplateExercises).where(eq(workoutTemplateExercises.templateId, template.id));
      return { ...template, exerciseCount: exercisesList.length };
    }));

    return templatesWithCounts;
  }

  async getTemplate(userId: string, id: string): Promise<any | undefined> {
    const [template] = await db.select().from(workoutTemplates).where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
    if (!template) return undefined;

    const templateExercises = await db.select().from(workoutTemplateExercises).where(eq(workoutTemplateExercises.templateId, id)).orderBy(workoutTemplateExercises.position);

    const exercisesWithDetails = await Promise.all(templateExercises.map(async (te) => {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, te.exerciseId));
      const sets = await db.select().from(plannedSets).where(eq(plannedSets.templateExerciseId, te.id)).orderBy(plannedSets.setNumber);
      return { ...te, exercise, plannedSets: sets };
    }));

    // Resolve circuit names for any circuit-grouped exercises
    const circuitIds = [...new Set(exercisesWithDetails.filter(e => e.circuitId).map(e => e.circuitId!))];
    const circuitMap: Record<string, Circuit> = {};
    for (const cid of circuitIds) {
      const [c] = await db.select().from(circuits).where(eq(circuits.id, cid));
      if (c) circuitMap[cid] = c;
    }

    return { ...template, exercises: exercisesWithDetails, circuits: circuitMap };
  }

  async createTemplate(data: InsertWorkoutTemplate): Promise<WorkoutTemplate> {
    const [template] = await db.insert(workoutTemplates).values(data).returning();
    return template;
  }

  async updateTemplate(userId: string, id: string, data: Partial<InsertWorkoutTemplate>): Promise<WorkoutTemplate | undefined> {
    const [template] = await db.update(workoutTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)))
      .returning();
    return template;
  }

  async deleteTemplate(userId: string, id: string): Promise<void> {
    await db.delete(plannedSets).where(
      sql`${plannedSets.templateExerciseId} IN (SELECT id FROM workout_template_exercises WHERE template_id = ${id})`
    );
    await db.delete(workoutTemplateExercises).where(eq(workoutTemplateExercises.templateId, id));
    await db.delete(workoutTemplates).where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
  }

  async copyTemplate(userId: string, id: string): Promise<WorkoutTemplate> {
    const original = await this.getTemplate(userId, id);
    if (!original) throw new Error("Template not found");

    const [newTemplate] = await db.insert(workoutTemplates).values({
      userId,
      name: `${original.name} (Copy)`,
      notes: original.notes,
    }).returning();

    for (const te of original.exercises || []) {
      const [newTe] = await db.insert(workoutTemplateExercises).values({
        userId,
        templateId: newTemplate.id,
        exerciseId: te.exerciseId,
        position: te.position,
        circuitId: te.circuitId,
        circuitRound: te.circuitRound,
        circuitRounds: te.circuitRounds,
        notes: te.notes,
      }).returning();

      for (const set of te.plannedSets || []) {
        await db.insert(plannedSets).values({
          userId,
          templateExerciseId: newTe.id,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          targetTimeSeconds: set.targetTimeSeconds,
          restSeconds: set.restSeconds,
          isWarmup: set.isWarmup,
        });
      }
    }

    return newTemplate;
  }

  // Template Exercises
  async addTemplateExercise(data: InsertWorkoutTemplateExercise): Promise<WorkoutTemplateExercise> {
    const [te] = await db.insert(workoutTemplateExercises).values(data).returning();
    return te;
  }

  async removeTemplateExercise(userId: string, templateId: string, id: string): Promise<void> {
    await db.delete(plannedSets).where(eq(plannedSets.templateExerciseId, id));
    await db.delete(workoutTemplateExercises).where(and(eq(workoutTemplateExercises.id, id), eq(workoutTemplateExercises.userId, userId)));
  }

  async reorderTemplateExercises(userId: string, templateId: string, exerciseIds: string[]): Promise<void> {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.update(workoutTemplateExercises)
        .set({ position: i + 1 })
        .where(
          and(
            eq(workoutTemplateExercises.id, exerciseIds[i]),
            eq(workoutTemplateExercises.userId, userId),
            eq(workoutTemplateExercises.templateId, templateId)
          )
        );
    }
  }

  // Planned Sets
  async addPlannedSet(data: InsertPlannedSet): Promise<PlannedSet> {
    const [set] = await db.insert(plannedSets).values(data).returning();
    return set;
  }

  async updatePlannedSet(userId: string, id: string, data: Partial<InsertPlannedSet>): Promise<PlannedSet | undefined> {
    const [set] = await db.update(plannedSets)
      .set(data)
      .where(and(eq(plannedSets.id, id), eq(plannedSets.userId, userId)))
      .returning();
    return set;
  }

  async reorderPlannedSets(userId: string, templateExerciseId: string, setIds: string[]): Promise<void> {
    for (let i = 0; i < setIds.length; i++) {
      await db.update(plannedSets)
        .set({ setNumber: i + 1 })
        .where(
          and(
            eq(plannedSets.id, setIds[i]),
            eq(plannedSets.userId, userId),
            eq(plannedSets.templateExerciseId, templateExerciseId)
          )
        );
    }
  }

  async deletePlannedSet(userId: string, id: string): Promise<void> {
    await db.delete(plannedSets).where(and(eq(plannedSets.id, id), eq(plannedSets.userId, userId)));
  }

  // Schedule
  async getScheduleForDate(userId: string, date: string): Promise<any[]> {
    const schedules = await db.select().from(workoutSchedule).where(and(eq(workoutSchedule.userId, userId), eq(workoutSchedule.scheduledDate, date)));

    return Promise.all(schedules.map(async (s) => {
      const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, s.templateId));
      return { ...s, template };
    }));
  }

  async getScheduleForWeek(userId: string, startDate: string): Promise<any[]> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const schedules = await db.select().from(workoutSchedule).where(
      and(
        eq(workoutSchedule.userId, userId),
        gte(workoutSchedule.scheduledDate, startDate),
        lte(workoutSchedule.scheduledDate, endDate.toISOString().split('T')[0])
      )
    );

    return Promise.all(schedules.map(async (s) => {
      const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, s.templateId));
      return { ...s, template };
    }));
  }

  async getScheduleForRange(userId: string, startDate: string, endDate: string): Promise<any[]> {
    const schedules = await db.select().from(workoutSchedule).where(
      and(
        eq(workoutSchedule.userId, userId),
        gte(workoutSchedule.scheduledDate, startDate),
        lte(workoutSchedule.scheduledDate, endDate)
      )
    );

    return Promise.all(schedules.map(async (s) => {
      const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, s.templateId));
      return { ...s, template };
    }));
  }

  async createSchedule(data: InsertWorkoutSchedule): Promise<WorkoutScheduleItem> {
    const [schedule] = await db.insert(workoutSchedule).values(data).returning();
    return schedule;
  }

  async updateScheduleStatus(userId: string, id: string, status: string): Promise<void> {
    await db.update(workoutSchedule).set({ status: status as any }).where(and(eq(workoutSchedule.id, id), eq(workoutSchedule.userId, userId)));
  }

  // Sessions
  async getSessions(userId: string): Promise<any[]> {
    const sessions = await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.startedAt));

    return Promise.all(sessions.map(async (session) => {
      let template = null;
      if (session.templateId) {
        const [t] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, session.templateId));
        template = t;
      }
      const exercisesList = await db.select().from(sessionExercises).where(eq(sessionExercises.sessionId, session.id));
      const sets = await db.select().from(performedSets).where(
        sql`${performedSets.sessionExerciseId} IN (SELECT id FROM session_exercises WHERE session_id = ${session.id})`
      );

      return {
        ...session,
        template,
        exerciseCount: exercisesList.length,
        setCount: sets.length,
      };
    }));
  }

  async getSession(userId: string, id: string): Promise<any | undefined> {
    const [session] = await db.select().from(workoutSessions).where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
    if (!session) return undefined;

    let templateName = null;
    if (session.templateId) {
      const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, session.templateId));
      templateName = template?.name;
    }

    const sessionExs = await db.select().from(sessionExercises).where(eq(sessionExercises.sessionId, id)).orderBy(sessionExercises.position);

    const exercisesWithDetails = await Promise.all(sessionExs.map(async (se) => {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, se.exerciseId));
      const sets = await db.select().from(performedSets).where(eq(performedSets.sessionExerciseId, se.id)).orderBy(performedSets.setNumber);

      let plannedSetsList: PlannedSet[] = [];
      if (session.templateId) {
        const [templateExercise] = await db.select().from(workoutTemplateExercises)
          .where(and(eq(workoutTemplateExercises.templateId, session.templateId), eq(workoutTemplateExercises.exerciseId, se.exerciseId)));
        if (templateExercise) {
          plannedSetsList = await db.select().from(plannedSets).where(eq(plannedSets.templateExerciseId, templateExercise.id)).orderBy(plannedSets.setNumber);
        }
      }

      return { ...se, exercise, performedSets: sets, plannedSets: plannedSetsList };
    }));

    // Resolve circuit names
    const circuitIds = [...new Set(exercisesWithDetails.filter(e => e.circuitId).map(e => e.circuitId!))];
    const circuitNames: Record<string, string> = {};
    for (const cid of circuitIds) {
      const [c] = await db.select().from(circuits).where(eq(circuits.id, cid));
      if (c) circuitNames[cid] = c.name;
    }

    return { ...session, templateName, exercises: exercisesWithDetails, circuitNames };
  }

  async getActiveSession(userId: string): Promise<any | undefined> {
    const [session] = await db.select().from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`${workoutSessions.endedAt} IS NULL`))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);

    if (!session) return null;

    let template = null;
    if (session.templateId) {
      const [t] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, session.templateId));
      template = t;
    }

    return { ...session, template };
  }

  async startSession(userId: string, scheduleId: string): Promise<WorkoutSession> {
    const [schedule] = await db.select().from(workoutSchedule).where(and(eq(workoutSchedule.id, scheduleId), eq(workoutSchedule.userId, userId)));
    if (!schedule) throw new Error("Schedule not found");

    const [session] = await db.insert(workoutSessions).values({
      userId,
      templateId: schedule.templateId,
      scheduleId,
      startedAt: new Date(),
    }).returning();

    const templateExs = await db.select().from(workoutTemplateExercises).where(eq(workoutTemplateExercises.templateId, schedule.templateId)).orderBy(workoutTemplateExercises.position);

    for (const te of templateExs) {
      await db.insert(sessionExercises).values({
        userId,
        sessionId: session.id,
        exerciseId: te.exerciseId,
        position: te.position,
        circuitId: te.circuitId,
        circuitRound: te.circuitRound,
        circuitRounds: te.circuitRounds,
        notes: te.notes,
      });
    }

    return session;
  }

  async createAdhocSession(userId: string): Promise<WorkoutSession> {
    const [session] = await db.insert(workoutSessions).values({
      userId,
      startedAt: new Date(),
    }).returning();
    return session;
  }

  async startSessionFromTemplate(userId: string, templateId: string): Promise<WorkoutSession> {
    const [session] = await db.insert(workoutSessions).values({
      userId,
      templateId,
      startedAt: new Date(),
    }).returning();

    const templateExs = await db.select().from(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.templateId, templateId))
      .orderBy(workoutTemplateExercises.position);

    for (const te of templateExs) {
      await db.insert(sessionExercises).values({
        userId,
        sessionId: session.id,
        exerciseId: te.exerciseId,
        position: te.position,
        circuitId: te.circuitId,
        circuitRound: te.circuitRound,
        circuitRounds: te.circuitRounds,
        notes: te.notes,
      });
    }

    return session;
  }

  async endSession(userId: string, id: string, notes?: string): Promise<WorkoutSession | undefined> {
    const [session] = await db.update(workoutSessions)
      .set({ endedAt: new Date(), notes })
      .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)))
      .returning();

    if (session?.scheduleId) {
      await this.updateScheduleStatus(userId, session.scheduleId, "completed");
    }

    return session;
  }

  // Session Exercises
  async addSessionExercise(data: InsertSessionExercise): Promise<SessionExercise> {
    const [se] = await db.insert(sessionExercises).values(data).returning();
    return se;
  }

  // Performed Sets
  async addPerformedSet(data: InsertPerformedSet): Promise<PerformedSet> {
    const [set] = await db.insert(performedSets).values(data).returning();
    return set;
  }

  async updatePerformedSet(userId: string, setId: string, data: { actualReps?: number; actualWeight?: string; actualTimeSeconds?: number; actualDistance?: string; restSeconds?: number; isWarmup?: boolean }): Promise<PerformedSet | undefined> {
    const [set] = await db.update(performedSets)
      .set(data)
      .where(and(eq(performedSets.id, setId), eq(performedSets.userId, userId)))
      .returning();
    return set;
  }

  async deletePerformedSet(userId: string, setId: string): Promise<void> {
    await db.delete(performedSets).where(and(eq(performedSets.id, setId), eq(performedSets.userId, userId)));
  }

  // Exercise History
  async getExerciseHistory(userId: string, exerciseId: string): Promise<any[]> {
    const history = await db.select()
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .where(and(
        eq(sessionExercises.exerciseId, exerciseId),
        eq(performedSets.userId, userId)
      ))
      .orderBy(desc(performedSets.createdAt));

    return history.map(row => ({
      ...row.performed_sets,
      session: row.workout_sessions,
    }));
  }

  // Last Performance - find most recent completed session for each exercise
  async getLastPerformance(userId: string, exerciseIds: string[]): Promise<Record<string, PerformedSet[]>> {
    if (exerciseIds.length === 0) return {};

    // Query 1: Find the most recent completed session-exercise for each exerciseId
    // Using a lateral join pattern via subquery
    const latestSessionExercises = await db.select({
      sessionExerciseId: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .where(and(
        eq(sessionExercises.userId, userId),
        inArray(sessionExercises.exerciseId, exerciseIds),
        sql`${workoutSessions.endedAt} IS NOT NULL`
      ))
      .orderBy(desc(workoutSessions.startedAt));

    // Group by exerciseId, take the first (most recent) session-exercise per exercise
    const latestByExercise = new Map<string, string>();
    for (const row of latestSessionExercises) {
      if (!latestByExercise.has(row.exerciseId)) {
        latestByExercise.set(row.exerciseId, row.sessionExerciseId);
      }
    }

    if (latestByExercise.size === 0) return {};

    const sessionExerciseIds = Array.from(latestByExercise.values());

    // Query 2: Fetch all performed sets for those session-exercise IDs
    const sets = await db.select()
      .from(performedSets)
      .where(inArray(performedSets.sessionExerciseId, sessionExerciseIds))
      .orderBy(performedSets.setNumber);

    // Build the result map: exerciseId → sets
    const sessionExerciseToExercise = new Map<string, string>();
    latestByExercise.forEach((seId, exerciseId) => {
      sessionExerciseToExercise.set(seId, exerciseId);
    });

    const result: Record<string, PerformedSet[]> = {};
    for (const set of sets) {
      const exerciseId = sessionExerciseToExercise.get(set.sessionExerciseId);
      if (exerciseId) {
        if (!result[exerciseId]) result[exerciseId] = [];
        result[exerciseId].push(set);
      }
    }

    return result;
  }

  // Supplements
  async getSupplements(userId: string): Promise<Supplement[]> {
    return await db.select().from(supplements).where(eq(supplements.userId, userId)).orderBy(supplements.name);
  }

  async getSupplement(userId: string, id: string): Promise<Supplement | undefined> {
    const [supplement] = await db.select().from(supplements).where(and(eq(supplements.id, id), eq(supplements.userId, userId)));
    return supplement;
  }

  async createSupplement(data: InsertSupplement): Promise<Supplement> {
    const [supplement] = await db.insert(supplements).values(data).returning();
    return supplement;
  }

  async updateSupplement(userId: string, id: string, data: Partial<InsertSupplement>): Promise<Supplement | undefined> {
    const [supplement] = await db.update(supplements)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(supplements.id, id), eq(supplements.userId, userId)))
      .returning();
    return supplement;
  }

  async deleteSupplement(userId: string, id: string): Promise<void> {
    await db.delete(supplementLogs).where(eq(supplementLogs.supplementId, id));
    await db.delete(supplementSchedule).where(eq(supplementSchedule.supplementId, id));
    await db.delete(supplements).where(and(eq(supplements.id, id), eq(supplements.userId, userId)));
  }

  // Supplement Logs
  async getSupplementLogs(userId: string): Promise<SupplementLog[]> {
    return await db.select().from(supplementLogs).where(eq(supplementLogs.userId, userId)).orderBy(desc(supplementLogs.takenAt));
  }

  async getTodaySupplementLogs(userId: string): Promise<SupplementLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select().from(supplementLogs).where(
      and(
        eq(supplementLogs.userId, userId),
        gte(supplementLogs.takenAt, today),
        lte(supplementLogs.takenAt, tomorrow)
      )
    ).orderBy(desc(supplementLogs.takenAt));
  }

  async logSupplementIntake(data: InsertSupplementLog): Promise<SupplementLog> {
    const [log] = await db.insert(supplementLogs).values(data).returning();
    return log;
  }

  async updateSupplementLog(userId: string, id: string, data: { dose?: string; takenAt?: Date; notes?: string | null }): Promise<SupplementLog | undefined> {
    const [log] = await db.update(supplementLogs)
      .set(data)
      .where(and(eq(supplementLogs.id, id), eq(supplementLogs.userId, userId)))
      .returning();
    return log;
  }

  async deleteSupplementLog(userId: string, id: string): Promise<void> {
    await db.delete(supplementLogs).where(and(eq(supplementLogs.id, id), eq(supplementLogs.userId, userId)));
  }

  // Body Weight
  async getWeightLogs(userId: string): Promise<BodyWeightLog[]> {
    return await db.select().from(bodyWeightLogs).where(eq(bodyWeightLogs.userId, userId)).orderBy(desc(bodyWeightLogs.loggedAt));
  }

  async logWeight(data: InsertBodyWeightLog): Promise<BodyWeightLog> {
    const [log] = await db.insert(bodyWeightLogs).values(data).returning();
    return log;
  }

  // Export
  async getSessionsForExport(userId: string): Promise<any[]> {
    const allSessions = await db.select().from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt));

    const sessionsWithDetails = await Promise.all(allSessions.map(async (session) => {
      let templateName = null;
      if (session.templateId) {
        const [template] = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, session.templateId));
        templateName = template?.name;
      }

      const sessionExs = await db.select().from(sessionExercises)
        .where(eq(sessionExercises.sessionId, session.id))
        .orderBy(sessionExercises.position);

      const exercisesWithDetails = await Promise.all(sessionExs.map(async (se) => {
        const [exercise] = await db.select().from(exercises).where(eq(exercises.id, se.exerciseId));
        const sets = await db.select().from(performedSets)
          .where(eq(performedSets.sessionExerciseId, se.id))
          .orderBy(performedSets.setNumber);

        let plannedSetsList: PlannedSet[] = [];
        if (session.templateId) {
          const [templateExercise] = await db.select().from(workoutTemplateExercises)
            .where(and(
              eq(workoutTemplateExercises.templateId, session.templateId),
              eq(workoutTemplateExercises.exerciseId, se.exerciseId)
            ));
          if (templateExercise) {
            plannedSetsList = await db.select().from(plannedSets)
              .where(eq(plannedSets.templateExerciseId, templateExercise.id))
              .orderBy(plannedSets.setNumber);
          }
        }

        return {
          exerciseName: exercise?.name || "Unknown",
          performedSets: sets,
          plannedSets: plannedSetsList
        };
      }));

      return {
        ...session,
        templateName,
        exercises: exercisesWithDetails
      };
    }));

    return sessionsWithDetails;
  }

  // Performed Exercises
  async getPerformedExercises(userId: string): Promise<Exercise[]> {
    const result = await db.selectDistinct({
      id: exercises.id,
      userId: exercises.userId,
      name: exercises.name,
      category: exercises.category,
      notes: exercises.notes,
      isSystem: exercises.isSystem,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
    })
      .from(sessionExercises)
      .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
      .innerJoin(performedSets, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .where(eq(sessionExercises.userId, userId))
      .orderBy(exercises.name);

    return result as Exercise[];
  }

  // Analytics
  async getExerciseAnalytics(userId: string, exerciseId: string, since?: Date): Promise<{
    date: string;
    maxWeight: number | null;
    totalEffort: number | null;
    bestTime: number | null;
    totalSets: number;
  }[]> {
    const conditions = [
      eq(performedSets.userId, userId),
      eq(sessionExercises.exerciseId, exerciseId),
      eq(performedSets.isWarmup, false),
    ];
    if (since) conditions.push(gte(workoutSessions.startedAt, since));

    const results = await db.select({
      date: sql<string>`DATE(${workoutSessions.startedAt})`.as('date'),
      maxWeight: sql<number>`MAX(${performedSets.actualWeight}::numeric)`.as('max_weight'),
      totalEffort: sql<number>`SUM(COALESCE(${performedSets.actualReps}, 0) * COALESCE(${performedSets.actualWeight}::numeric, 0))`.as('total_effort'),
      bestTime: sql<number>`MIN(${performedSets.actualTimeSeconds})`.as('best_time'),
      totalSets: sql<number>`COUNT(${performedSets.id})`.as('total_sets'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .where(and(...conditions))
      .groupBy(sql`DATE(${workoutSessions.startedAt})`)
      .orderBy(sql`DATE(${workoutSessions.startedAt})`);

    return results.map(r => ({
      date: r.date,
      maxWeight: r.maxWeight ? Number(r.maxWeight) : null,
      totalEffort: r.totalEffort ? Number(r.totalEffort) : null,
      bestTime: r.bestTime ? Number(r.bestTime) : null,
      totalSets: Number(r.totalSets),
    }));
  }

  async getAnalyticsOverview(userId: string): Promise<{
    workoutsThisWeek: number;
    workoutsThisMonth: number;
    currentStreak: number;
    avgSessionsPerWeek: number;
    weeklyVolume: { week: string; volume: number }[];
  }> {
    const now = new Date();

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 8 weeks ago (for volume trend + avg calculation)
    const eightWeeksAgo = new Date(startOfWeek);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const [thisWeekRows, thisMonthRows] = await Promise.all([
      db.select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, startOfWeek),
          sql`${workoutSessions.endedAt} IS NOT NULL`
        )),
      db.select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, startOfMonth),
          sql`${workoutSessions.endedAt} IS NOT NULL`
        )),
    ]);

    // Weekly session counts (all time, for streak; descending)
    const sessionsByWeek = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${workoutSessions.startedAt})`.as('week'),
      count: sql<number>`COUNT(${workoutSessions.id})`.as('count'),
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.endedAt} IS NOT NULL`
      ))
      .groupBy(sql`DATE_TRUNC('week', ${workoutSessions.startedAt})`)
      .orderBy(desc(sql`DATE_TRUNC('week', ${workoutSessions.startedAt})`));

    // Streak: consecutive weeks from current going back
    let streak = 0;
    let checkMs = startOfWeek.getTime();
    for (const row of sessionsByWeek) {
      const rowMs = new Date(row.week).getTime();
      const diffWeeks = Math.round((checkMs - rowMs) / (7 * 24 * 60 * 60 * 1000));
      if (diffWeeks === 0) {
        streak++;
        checkMs -= 7 * 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }

    // Avg sessions/week over last 8 weeks
    const recentWeeks = sessionsByWeek.filter(w => new Date(w.week) >= eightWeeksAgo);
    const avgSessionsPerWeek = Math.round(
      (recentWeeks.reduce((sum, w) => sum + Number(w.count), 0) / 8) * 10
    ) / 10;

    // Weekly volume (last 8 weeks)
    const volumeRows = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${workoutSessions.startedAt})`.as('week'),
      volume: sql<number>`SUM(COALESCE(${performedSets.actualReps}, 0) * COALESCE(${performedSets.actualWeight}::numeric, 0))`.as('volume'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .where(and(
        eq(performedSets.userId, userId),
        gte(workoutSessions.startedAt, eightWeeksAgo),
        eq(performedSets.isWarmup, false)
      ))
      .groupBy(sql`DATE_TRUNC('week', ${workoutSessions.startedAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${workoutSessions.startedAt})`);

    return {
      workoutsThisWeek: thisWeekRows.length,
      workoutsThisMonth: thisMonthRows.length,
      currentStreak: streak,
      avgSessionsPerWeek,
      weeklyVolume: volumeRows.map(r => ({
        week: r.week.substring(0, 10), // YYYY-MM-DD
        volume: Number(r.volume) || 0,
      })),
    };
  }

  async getTrainingVolume(userId: string, since?: Date): Promise<{ date: string; volume: number }[]> {
    const conditions = [
      eq(performedSets.userId, userId),
      eq(performedSets.isWarmup, false),
    ];
    if (since) conditions.push(gte(workoutSessions.startedAt, since));

    const results = await db.select({
      date: sql<string>`DATE(${workoutSessions.startedAt})`.as('date'),
      volume: sql<number>`SUM(COALESCE(${performedSets.actualReps}, 0) * COALESCE(${performedSets.actualWeight}::numeric, 0))`.as('volume'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .where(and(...conditions))
      .groupBy(sql`DATE(${workoutSessions.startedAt})`)
      .orderBy(sql`DATE(${workoutSessions.startedAt})`);

    return results.map(r => ({
      date: r.date,
      volume: Number(r.volume) || 0,
    }));
  }

  async getPersonalRecords(userId: string): Promise<{
    date: string;
    exerciseId: string;
    exerciseName: string;
    metric: "weight" | "time";
    value: number;
  }[]> {
    // Get best weight and best time per exercise per day (aggregate to avoid counting
    // multiple sets in the same session as separate PRs)
    const dailyBests = await db.select({
      date: sql<string>`DATE(${workoutSessions.startedAt})`.as('date'),
      exerciseId: sessionExercises.exerciseId,
      exerciseName: exercises.name,
      bestWeight: sql<number>`MAX(${performedSets.actualWeight}::numeric)`.as('best_weight'),
      bestTime: sql<number | null>`MIN(${performedSets.actualTimeSeconds})`.as('best_time'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
      .where(and(
        eq(performedSets.userId, userId),
        eq(performedSets.isWarmup, false)
      ))
      .groupBy(
        sql`DATE(${workoutSessions.startedAt})`,
        sessionExercises.exerciseId,
        exercises.name
      )
      .orderBy(sql`DATE(${workoutSessions.startedAt})`);

    // Scan forward per exercise to find PR events
    const bests: Record<string, { weight: number; time: number | null }> = {};
    const prs: { date: string; exerciseId: string; exerciseName: string; metric: "weight" | "time"; value: number }[] = [];

    for (const row of dailyBests) {
      const key = row.exerciseId;
      if (!bests[key]) bests[key] = { weight: 0, time: null };
      const best = bests[key];

      const weight = Number(row.bestWeight) || 0;
      const time = row.bestTime !== null ? Number(row.bestTime) : null;

      if (weight > best.weight) {
        best.weight = weight;
        prs.push({ date: row.date, exerciseId: row.exerciseId, exerciseName: row.exerciseName, metric: "weight", value: weight });
      }
      if (time !== null && (best.time === null || time < best.time)) {
        best.time = time;
        prs.push({ date: row.date, exerciseId: row.exerciseId, exerciseName: row.exerciseName, metric: "time", value: time });
      }
    }

    // Return newest first
    return prs.reverse();
  }

  async getVolumeByCategory(userId: string, since?: Date): Promise<{ category: string; volume: number }[]> {
    const conditions = [
      eq(performedSets.userId, userId),
      eq(performedSets.isWarmup, false),
    ];
    if (since) conditions.push(gte(workoutSessions.startedAt, since));

    const results = await db.select({
      category: exercises.category,
      volume: sql<number>`SUM(COALESCE(${performedSets.actualReps}, 0) * COALESCE(${performedSets.actualWeight}::numeric, 0))`.as('volume'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
      .where(and(...conditions))
      .groupBy(exercises.category)
      .orderBy(desc(sql`SUM(COALESCE(${performedSets.actualReps}, 0) * COALESCE(${performedSets.actualWeight}::numeric, 0))`));

    return results
      .filter(r => Number(r.volume) > 0)
      .map(r => ({
        category: r.category || "Other",
        volume: Number(r.volume) || 0,
      }));
  }

  async getSessionDurations(userId: string, since?: Date): Promise<{ date: string; durationMin: number }[]> {
    const conditions = [
      eq(workoutSessions.userId, userId),
      sql`${workoutSessions.endedAt} IS NOT NULL`,
    ];
    if (since) conditions.push(gte(workoutSessions.startedAt, since));

    const results = await db.select({
      date: sql<string>`DATE(${workoutSessions.startedAt})`.as('date'),
      durationSec: sql<number>`EXTRACT(EPOCH FROM (${workoutSessions.endedAt} - ${workoutSessions.startedAt}))`.as('duration_sec'),
    })
      .from(workoutSessions)
      .where(and(...conditions))
      .orderBy(sql`DATE(${workoutSessions.startedAt})`);

    return results
      .filter(r => Number(r.durationSec) > 0)
      .map(r => ({
        date: r.date,
        durationMin: Math.round(Number(r.durationSec) / 60),
      }));
  }

  async getTrainingHistorySummary(userId: string): Promise<TrainingHistorySummary> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [countRow] = await db.select({
      count: sql<number>`COUNT(*)`.as('count'),
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, ninetyDaysAgo),
        sql`${workoutSessions.endedAt} IS NOT NULL`
      ));

    const topExercisesRows = await db.select({
      name: exercises.name,
      totalSets: sql<number>`COUNT(${performedSets.id})`.as('total_sets'),
    })
      .from(performedSets)
      .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id))
      .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
      .where(and(
        eq(performedSets.userId, userId),
        gte(workoutSessions.startedAt, ninetyDaysAgo),
        eq(performedSets.isWarmup, false)
      ))
      .groupBy(exercises.name)
      .orderBy(desc(sql`COUNT(${performedSets.id})`))
      .limit(10);

    const allPrs = await this.getPersonalRecords(userId);
    const recentPRs = allPrs.slice(0, 10).map(pr => ({
      exercise: pr.exerciseName,
      ...(pr.metric === 'weight' ? { weight: pr.value } : { timeSeconds: pr.value }),
    }));

    return {
      workoutsLast90Days: Number(countRow?.count) || 0,
      topExercises: topExercisesRows.map(r => ({ name: r.name, totalSets: Number(r.totalSets) })),
      recentPRs,
    };
  }

  async acceptTrainingPlan(
    userId: string,
    opts: { wizardInputs: AcceptPlanWizardInputs; plan: PlanResponse }
  ): Promise<AcceptPlanResult> {
    const { wizardInputs, plan } = opts;

    // Compute week start: next Sunday from today (or today if today is Sunday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysUntilSunday);

    // Map dayOfWeek string → offset from Sunday
    const DAY_OFFSETS: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    // Compute all schedule dates from the plan
    const scheduleEntries = plan.scheduleMap.map(entry => {
      const offset = DAY_OFFSETS[entry.dayOfWeek.toLowerCase()] ?? 0;
      const d = new Date(weekStart);
      d.setDate(d.getDate() + (entry.weekNumber - 1) * 7 + offset);
      return { templateName: entry.templateName, date: d.toISOString().split('T')[0] };
    });

    const planStartDate = scheduleEntries.reduce((min, e) => e.date < min ? e.date : min, scheduleEntries[0].date);
    const planEndDate = scheduleEntries.reduce((max, e) => e.date > max ? e.date : max, scheduleEntries[0].date);

    // Count existing schedule entries in the plan date range (conflicts)
    const existingInRange = await db.select({ id: workoutSchedule.id })
      .from(workoutSchedule)
      .where(and(
        eq(workoutSchedule.userId, userId),
        gte(workoutSchedule.scheduledDate, planStartDate),
        lte(workoutSchedule.scheduledDate, planEndDate)
      ));
    const conflictCount = existingInRange.length;

    // Get user's exercise library for name matching
    const userExercises = await this.getExercises(userId);

    // Match each unique exercise name to the user's library
    const allExerciseNamesRaw = plan.workoutTemplates.flatMap(t => t.exercises.map(e => e.exerciseName));
    const allExerciseNames = allExerciseNamesRaw.filter((n, i) => allExerciseNamesRaw.indexOf(n) === i);
    const exerciseIdMap = new Map<string, string>(); // exerciseName → exerciseId
    const newExerciseNames: string[] = [];

    for (const name of allExerciseNames) {
      const normalized = name.trim().toLowerCase();
      const match =
        userExercises.find(e => e.name.trim().toLowerCase() === normalized) ??
        userExercises.find(e => {
          const en = e.name.trim().toLowerCase();
          return en.includes(normalized) || normalized.includes(en);
        });
      if (match) {
        exerciseIdMap.set(name, match.id);
      } else {
        newExerciseNames.push(name);
      }
    }

    // Get last performance for already-matched exercises to seed weights
    const matchedIds = Array.from(exerciseIdMap.values());
    const lastPerf = matchedIds.length > 0 ? await this.getLastPerformance(userId, matchedIds) : {};

    // Compute median working-set weight per exercise
    const historyWeightMap = new Map<string, number | null>();
    for (const [exerciseId, sets] of Object.entries(lastPerf)) {
      const workingWeights = sets
        .filter(s => !s.isWarmup && s.actualWeight != null)
        .map(s => Number(s.actualWeight))
        .sort((a, b) => a - b);
      if (workingWeights.length > 0) {
        const mid = Math.floor(workingWeights.length / 2);
        const median = workingWeights.length % 2 !== 0
          ? workingWeights[mid]
          : (workingWeights[mid - 1] + workingWeights[mid]) / 2;
        historyWeightMap.set(exerciseId, median);
      } else {
        historyWeightMap.set(exerciseId, null);
      }
    }

    const templateNamesInPlan = new Set(plan.workoutTemplates.map(t => t.name));
    const scheduleCount = scheduleEntries.filter(e => templateNamesInPlan.has(e.templateName)).length;

    let trainingGoalId = '';

    await db.transaction(async (tx) => {
      // Cancel any existing active plan
      const [existingGoal] = await tx.select({ id: trainingGoals.id })
        .from(trainingGoals)
        .where(and(eq(trainingGoals.userId, userId), eq(trainingGoals.status, "active")))
        .limit(1);
      if (existingGoal) {
        await tx.update(trainingGoals)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(trainingGoals.id, existingGoal.id));
      }

      // Create new (unmatched) exercises
      for (const name of newExerciseNames) {
        const lower = name.toLowerCase();
        let trackingType: 'weight_reps' | 'time' | 'distance_time' = 'weight_reps';
        if (/\b(run|jog|sprint|row|cycle|bike|swim)\b/.test(lower)) trackingType = 'distance_time';
        else if (/\b(plank|hold|hang|wall sit|dead hang)\b/.test(lower)) trackingType = 'time';

        const defaultTracking =
          trackingType === 'time' ? { weight: false, reps: false, time: true, distance: false } :
          trackingType === 'distance_time' ? { weight: false, reps: false, time: true, distance: true } :
          { weight: true, reps: true, time: false, distance: false };

        const titleCased = name.replace(/\b\w/g, c => c.toUpperCase());
        const [newEx] = await tx.insert(exercises).values({
          userId,
          name: titleCased,
          isSystem: false,
          defaultTracking,
        }).returning();
        exerciseIdMap.set(name, newEx.id);
      }

      // Insert training goal record
      const [goal] = await tx.insert(trainingGoals).values({
        userId,
        status: 'active',
        primaryGoal: wizardInputs.primaryGoal,
        goalCategory: wizardInputs.goalCategory,
        secondaryGoals: wizardInputs.secondaryGoals,
        targetDate: wizardInputs.targetDate,
        timelineDescription: wizardInputs.timelineDescription,
        daysPerWeek: wizardInputs.daysPerWeek,
        sessionDurationMinutes: wizardInputs.sessionDurationMinutes,
        equipmentType: wizardInputs.equipmentType,
        avoidances: wizardInputs.avoidances,
        additionalContext: wizardInputs.additionalContext,
        generatedPlan: plan as unknown,
        startDate: planStartDate,
        endDate: planEndDate,
      }).returning();
      trainingGoalId = goal.id;

      // Create workout templates, template exercises, planned sets
      const templateIdMap = new Map<string, string>();
      for (const templateSpec of plan.workoutTemplates) {
        const [template] = await tx.insert(workoutTemplates).values({
          userId,
          name: templateSpec.name,
        }).returning();
        templateIdMap.set(templateSpec.name, template.id);

        for (let exIdx = 0; exIdx < templateSpec.exercises.length; exIdx++) {
          const exSpec = templateSpec.exercises[exIdx];
          const exerciseId = exerciseIdMap.get(exSpec.exerciseName)!;

          const [te] = await tx.insert(workoutTemplateExercises).values({
            userId,
            templateId: template.id,
            exerciseId,
            position: exIdx + 1,
          }).returning();

          const historyWeight = historyWeightMap.get(exerciseId) ?? null;

          for (let setIdx = 0; setIdx < exSpec.sets.length; setIdx++) {
            const setSpec = exSpec.sets[setIdx];
            let targetWeight: string | null = null;
            if (historyWeight != null && historyWeight > 0) {
              targetWeight = String(Math.round(historyWeight));
            } else if (setSpec.weight != null && setSpec.weight > 0) {
              targetWeight = String(setSpec.weight);
            }

            await tx.insert(plannedSets).values({
              userId,
              templateExerciseId: te.id,
              setNumber: setIdx + 1,
              targetReps: setSpec.reps ?? null,
              targetWeight,
              restSeconds: setSpec.rest ?? null,
              isWarmup: setSpec.warmup ?? false,
            });
          }
        }

        // Link template to training goal
        await tx.insert(trainingGoalTemplates).values({
          trainingGoalId: goal.id,
          templateId: template.id,
        });

        // Schedule entries for this template
        for (const entry of scheduleEntries.filter(e => e.templateName === templateSpec.name)) {
          await tx.insert(workoutSchedule).values({
            userId,
            templateId: template.id,
            scheduledDate: entry.date,
            trainingGoalId: goal.id,
          });
        }
      }
    });

    return {
      trainingGoalId,
      conflictCount,
      templateCount: plan.workoutTemplates.length,
      scheduleCount,
      newExercises: newExerciseNames,
    };
  }

  async getActiveTrainingGoal(userId: string): Promise<ActiveTrainingGoal | null> {
    const [goal] = await db.select()
      .from(trainingGoals)
      .where(and(eq(trainingGoals.userId, userId), eq(trainingGoals.status, "active")))
      .limit(1);

    if (!goal) return null;

    const plan = goal.generatedPlan as PlanResponse | null;
    const totalWeeks = plan?.overallStructure?.totalWeeks ?? 0;

    let currentWeek = 1;
    if (goal.startDate) {
      const start = new Date(goal.startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      currentWeek = Math.max(1, Math.min(diffWeeks + 1, totalWeeks || 1));
    }

    return {
      id: goal.id,
      primaryGoal: goal.primaryGoal,
      goalCategory: goal.goalCategory,
      status: goal.status,
      startDate: goal.startDate,
      endDate: goal.endDate,
      targetDate: goal.targetDate,
      timelineDescription: goal.timelineDescription,
      daysPerWeek: goal.daysPerWeek,
      sessionDurationMinutes: goal.sessionDurationMinutes,
      generatedPlan: plan,
      currentWeek,
      totalWeeks,
    };
  }

  async cancelActiveTrainingPlan(userId: string, opts: { removeFutureWorkouts: boolean }): Promise<void> {
    const [goal] = await db.select({ id: trainingGoals.id })
      .from(trainingGoals)
      .where(and(eq(trainingGoals.userId, userId), eq(trainingGoals.status, "active")))
      .limit(1);

    if (!goal) return;

    if (opts.removeFutureWorkouts) {
      const today = new Date().toISOString().split('T')[0];
      await db.delete(workoutSchedule)
        .where(and(
          eq(workoutSchedule.userId, userId),
          eq(workoutSchedule.trainingGoalId, goal.id),
          gte(workoutSchedule.scheduledDate, today),
          eq(workoutSchedule.status, "planned"),
        ));
    }

    await db.update(trainingGoals)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(trainingGoals.id, goal.id));
  }
}

export const storage = new DatabaseStorage();
