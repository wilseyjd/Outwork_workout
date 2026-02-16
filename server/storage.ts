import { db } from "./db";
import { eq, desc, and, gte, lte, sql, or, inArray, not } from "drizzle-orm";
import {
  exercises, hiddenSystemExercises, workoutTemplates, workoutTemplateExercises, plannedSets,
  workoutSchedule, workoutSessions, sessionExercises, performedSets,
  supplements, supplementSchedule, supplementLogs, bodyWeightLogs,
  circuits, circuitExercises, hiddenSystemCircuits,
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
  endSession(userId: string, id: string, notes?: string): Promise<WorkoutSession | undefined>;

  // Session Exercises
  addSessionExercise(data: InsertSessionExercise): Promise<SessionExercise>;

  // Performed Sets
  addPerformedSet(data: InsertPerformedSet): Promise<PerformedSet>;

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
  getExerciseAnalytics(userId: string, exerciseId: string): Promise<{
    date: string;
    maxWeight: number | null;
    totalEffort: number | null;
    bestTime: number | null;
    totalSets: number;
  }[]>;
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

    for (let round = 1; round <= totalRounds; round++) {
      for (const ce of circuitExerciseRows) {
        const [te] = await db.insert(workoutTemplateExercises).values({
          userId,
          templateId,
          exerciseId: ce.exerciseId,
          position,
          circuitId,
          circuitRound: round,
          circuitRounds: totalRounds,
          notes: ce.notes,
        }).returning();
        results.push(te);
        position++;

        // Auto-create a planned set for every circuit exercise, using defaults if available
        const setValues: any = {
          userId,
          templateExerciseId: te.id,
          setNumber: 1,
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

    const currentRounds = existingTes[0].circuitRounds || 1;

    // Get the unique exercises in the circuit (from round 1)
    const round1Exercises = existingTes.filter(te => te.circuitRound === 1);
    const exercisesPerRound = round1Exercises.length;

    if (newRounds > currentRounds) {
      // Add more rounds - fetch circuit exercise defaults for auto-creating planned sets
      const circuitExerciseDefaults = await db.select({
        exerciseId: circuitExercises.exerciseId,
        defaultReps: circuitExercises.defaultReps,
        defaultWeight: circuitExercises.defaultWeight,
        defaultTimeSeconds: circuitExercises.defaultTimeSeconds,
      }).from(circuitExercises)
        .where(eq(circuitExercises.circuitId, circuitId))
        .orderBy(circuitExercises.position);
      const defaultsByExerciseId = new Map(circuitExerciseDefaults.map(ce => [ce.exerciseId, ce]));

      const lastPosition = Math.max(...existingTes.map(te => te.position));
      let position = lastPosition + 1;

      for (let round = currentRounds + 1; round <= newRounds; round++) {
        for (const r1 of round1Exercises) {
          const [newTe] = await db.insert(workoutTemplateExercises).values({
            userId,
            templateId,
            exerciseId: r1.exerciseId,
            position,
            circuitId,
            circuitRound: round,
            circuitRounds: newRounds,
            notes: r1.notes,
          }).returning();
          position++;

          // Auto-create planned set for new round, using circuit exercise defaults if available
          const ce = defaultsByExerciseId.get(r1.exerciseId);
          const setValues: any = {
            userId,
            templateExerciseId: newTe.id,
            setNumber: 1,
          };
          if (ce?.defaultReps) setValues.targetReps = ce.defaultReps;
          if (ce?.defaultWeight) setValues.targetWeight = ce.defaultWeight;
          if (ce?.defaultTimeSeconds) setValues.targetTimeSeconds = ce.defaultTimeSeconds;

          await db.insert(plannedSets).values(setValues);
        }
      }
    } else if (newRounds < currentRounds) {
      // Remove excess rounds
      const toRemove = existingTes.filter(te => (te.circuitRound || 0) > newRounds);
      for (const te of toRemove) {
        await db.delete(plannedSets).where(eq(plannedSets.templateExerciseId, te.id));
        await db.delete(workoutTemplateExercises).where(eq(workoutTemplateExercises.id, te.id));
      }
    }

    // Update circuitRounds on all remaining rows
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
  async getExerciseAnalytics(userId: string, exerciseId: string): Promise<{
    date: string;
    maxWeight: number | null;
    totalEffort: number | null;
    bestTime: number | null;
    totalSets: number;
  }[]> {
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
      .where(and(
        eq(performedSets.userId, userId),
        eq(sessionExercises.exerciseId, exerciseId),
        eq(performedSets.isWarmup, false)
      ))
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
}

export const storage = new DatabaseStorage();
