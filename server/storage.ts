import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  exercises, workoutTemplates, workoutTemplateExercises, plannedSets,
  workoutSchedule, workoutSessions, sessionExercises, performedSets,
  supplements, supplementSchedule, supplementLogs, bodyWeightLogs,
  type Exercise, type InsertExercise,
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
} from "@shared/schema";

export interface IStorage {
  // Exercises
  getExercises(userId: string): Promise<Exercise[]>;
  getExercise(userId: string, id: string): Promise<Exercise | undefined>;
  createExercise(data: InsertExercise): Promise<Exercise>;
  updateExercise(userId: string, id: string, data: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(userId: string, id: string): Promise<void>;
  
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
  
  // Planned Sets
  addPlannedSet(data: InsertPlannedSet): Promise<PlannedSet>;
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
  
  // Body Weight
  getWeightLogs(userId: string): Promise<BodyWeightLog[]>;
  logWeight(data: InsertBodyWeightLog): Promise<BodyWeightLog>;
}

export class DatabaseStorage implements IStorage {
  // Exercises
  async getExercises(userId: string): Promise<Exercise[]> {
    return await db.select().from(exercises).where(eq(exercises.userId, userId)).orderBy(exercises.name);
  }

  async getExercise(userId: string, id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
    return exercise;
  }

  async createExercise(data: InsertExercise): Promise<Exercise> {
    const [exercise] = await db.insert(exercises).values(data).returning();
    return exercise;
  }

  async updateExercise(userId: string, id: string, data: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const [exercise] = await db.update(exercises)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(exercises.id, id), eq(exercises.userId, userId)))
      .returning();
    return exercise;
  }

  async deleteExercise(userId: string, id: string): Promise<void> {
    await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
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

    return { ...template, exercises: exercisesWithDetails };
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

  // Planned Sets
  async addPlannedSet(data: InsertPlannedSet): Promise<PlannedSet> {
    const [set] = await db.insert(plannedSets).values(data).returning();
    return set;
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

    return { ...session, templateName, exercises: exercisesWithDetails };
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

  // Body Weight
  async getWeightLogs(userId: string): Promise<BodyWeightLog[]> {
    return await db.select().from(bodyWeightLogs).where(eq(bodyWeightLogs.userId, userId)).orderBy(desc(bodyWeightLogs.loggedAt));
  }

  async logWeight(data: InsertBodyWeightLog): Promise<BodyWeightLog> {
    const [log] = await db.insert(bodyWeightLogs).values(data).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
