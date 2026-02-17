import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getUserId } from "./auth";
import { z, ZodSchema } from "zod";
import {
  insertExerciseSchema,
  insertCircuitSchema,
  insertCircuitExerciseSchema,
  insertWorkoutTemplateSchema,
  insertWorkoutTemplateExerciseSchema,
  insertPlannedSetSchema,
  insertWorkoutScheduleSchema,
  insertSupplementSchema,
  insertSupplementLogSchema,
  insertBodyWeightLogSchema,
  insertPerformedSetSchema,
} from "../shared/schema";

// Validation helper
function validateBody<T>(schema: ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
  }
  return { success: true, data: result.data };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  // ============================================
  // EXERCISES
  // ============================================

  app.get("/api/exercises", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const exercises = await storage.getExercises(userId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.get("/api/exercises/performed", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const exercises = await storage.getPerformedExercises(userId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching performed exercises:", error);
      res.status(500).json({ message: "Failed to fetch performed exercises" });
    }
  });

  app.get("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const exercise = await storage.getExercise(userId, req.params.id as string);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });

  app.get("/api/exercises/:id/history", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const history = await storage.getExerciseHistory(userId, req.params.id as string);
      res.json(history);
    } catch (error) {
      console.error("Error fetching exercise history:", error);
      res.status(500).json({ message: "Failed to fetch exercise history" });
    }
  });

  app.post("/api/exercises", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validation = validateBody(insertExerciseSchema.omit({ userId: true }), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const exercise = await storage.createExercise({ ...validation.data, userId });
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ message: "Failed to create exercise" });
    }
  });

  app.patch("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getExercise(userId, req.params.id as string);

      if (!existing) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      if (existing.isSystem) {
        return res.status(403).json({ message: "System exercises cannot be modified" });
      }

      const exercise = await storage.updateExercise(userId, req.params.id as string, req.body);
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ message: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getExercise(userId, req.params.id as string);

      if (!existing) {
        return res.status(204).send();
      }

      if (existing.isSystem) {
        await storage.hideSystemExercise(userId, req.params.id as string);
      } else {
        await storage.deleteExercise(userId, req.params.id as string);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  app.post("/api/exercises/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const original = await storage.getExercise(userId, req.params.id as string);
      if (!original) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      const copy = await storage.createExercise({
        userId,
        name: `${original.name} (Copy)`,
        category: original.category || undefined,
        notes: original.notes || undefined,
      });
      res.status(201).json(copy);
    } catch (error) {
      console.error("Error copying exercise:", error);
      res.status(500).json({ message: "Failed to copy exercise" });
    }
  });

  // ============================================
  // CIRCUITS
  // ============================================

  app.get("/api/circuits", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const circuits = await storage.getCircuits(userId);
      res.json(circuits);
    } catch (error) {
      console.error("Error fetching circuits:", error);
      res.status(500).json({ message: "Failed to fetch circuits" });
    }
  });

  app.get("/api/circuits/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const circuit = await storage.getCircuit(userId, req.params.id as string);
      if (!circuit) {
        return res.status(404).json({ message: "Circuit not found" });
      }
      res.json(circuit);
    } catch (error) {
      console.error("Error fetching circuit:", error);
      res.status(500).json({ message: "Failed to fetch circuit" });
    }
  });

  app.post("/api/circuits", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validation = validateBody(insertCircuitSchema.omit({ userId: true }), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const circuit = await storage.createCircuit({ ...validation.data, userId });
      res.status(201).json(circuit);
    } catch (error) {
      console.error("Error creating circuit:", error);
      res.status(500).json({ message: "Failed to create circuit" });
    }
  });

  app.patch("/api/circuits/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getCircuit(userId, req.params.id as string);
      if (!existing) {
        return res.status(404).json({ message: "Circuit not found" });
      }
      if (existing.isSystem) {
        return res.status(403).json({ message: "System circuits cannot be modified" });
      }
      const circuit = await storage.updateCircuit(userId, req.params.id as string, req.body);
      res.json(circuit);
    } catch (error) {
      console.error("Error updating circuit:", error);
      res.status(500).json({ message: "Failed to update circuit" });
    }
  });

  app.delete("/api/circuits/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getCircuit(userId, req.params.id as string);
      if (!existing) {
        return res.status(204).send();
      }
      if (existing.isSystem) {
        await storage.hideSystemCircuit(userId, req.params.id as string);
      } else {
        await storage.deleteCircuit(userId, req.params.id as string);
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting circuit:", error);
      res.status(500).json({ message: "Failed to delete circuit" });
    }
  });

  app.post("/api/circuits/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const circuit = await storage.copyCircuit(userId, req.params.id as string);
      res.status(201).json(circuit);
    } catch (error) {
      console.error("Error copying circuit:", error);
      res.status(500).json({ message: "Failed to copy circuit" });
    }
  });

  // Circuit Exercises
  app.post("/api/circuits/:circuitId/exercises", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const circuitExercise = await storage.addCircuitExercise({
        ...req.body,
        userId,
        circuitId: req.params.circuitId as string,
      });
      res.status(201).json(circuitExercise);
    } catch (error) {
      console.error("Error adding circuit exercise:", error);
      res.status(500).json({ message: "Failed to add exercise to circuit" });
    }
  });

  app.delete("/api/circuits/:circuitId/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.removeCircuitExercise(userId, req.params.circuitId as string, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing circuit exercise:", error);
      res.status(500).json({ message: "Failed to remove exercise from circuit" });
    }
  });

  app.patch("/api/circuits/:circuitId/exercises/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { exerciseIds } = req.body as { exerciseIds: string[] };
      await storage.reorderCircuitExercises(userId, req.params.circuitId as string, exerciseIds);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error reordering circuit exercises:", error);
      res.status(500).json({ message: "Failed to reorder circuit exercises" });
    }
  });

  app.patch("/api/circuits/:circuitId/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { restAfterSeconds, defaultReps, defaultWeight, defaultTimeSeconds, notes } = req.body;
      const updateData: Record<string, any> = {};
      if (restAfterSeconds !== undefined) updateData.restAfterSeconds = restAfterSeconds;
      if (defaultReps !== undefined) updateData.defaultReps = defaultReps;
      if (defaultWeight !== undefined) updateData.defaultWeight = defaultWeight;
      if (defaultTimeSeconds !== undefined) updateData.defaultTimeSeconds = defaultTimeSeconds;
      if (notes !== undefined) updateData.notes = notes;
      const ce = await storage.updateCircuitExercise(userId, req.params.id as string, updateData);
      if (!ce) {
        return res.status(404).json({ message: "Circuit exercise not found" });
      }
      res.json(ce);
    } catch (error) {
      console.error("Error updating circuit exercise:", error);
      res.status(500).json({ message: "Failed to update circuit exercise" });
    }
  });

  // ============================================
  // TEMPLATES
  // ============================================

  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const template = await storage.getTemplate(userId, req.params.id as string);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validation = validateBody(insertWorkoutTemplateSchema.omit({ userId: true }), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const template = await storage.createTemplate({ ...validation.data, userId });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const template = await storage.updateTemplate(userId, req.params.id as string, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteTemplate(userId, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/templates/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const template = await storage.copyTemplate(userId, req.params.id as string);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error copying template:", error);
      res.status(500).json({ message: "Failed to copy template" });
    }
  });

  // Template Exercises
  app.post("/api/templates/:templateId/exercises", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const templateExercise = await storage.addTemplateExercise({
        ...req.body,
        userId,
        templateId: req.params.templateId as string,
      });
      res.status(201).json(templateExercise);
    } catch (error) {
      console.error("Error adding template exercise:", error);
      res.status(500).json({ message: "Failed to add exercise to template" });
    }
  });

  app.delete("/api/templates/:templateId/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.removeTemplateExercise(userId, req.params.templateId as string, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing template exercise:", error);
      res.status(500).json({ message: "Failed to remove exercise from template" });
    }
  });

  app.patch("/api/templates/:templateId/exercises/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { exerciseIds } = req.body as { exerciseIds: string[] };
      await storage.reorderTemplateExercises(userId, req.params.templateId, exerciseIds);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error reordering exercises:", error);
      res.status(500).json({ message: "Failed to reorder exercises" });
    }
  });

  // Planned Sets
  app.post("/api/templates/:templateId/exercises/:exerciseId/sets", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const set = await storage.addPlannedSet({
        ...req.body,
        userId,
        templateExerciseId: req.params.exerciseId,
      });
      res.status(201).json(set);
    } catch (error) {
      console.error("Error adding planned set:", error);
      res.status(500).json({ message: "Failed to add planned set" });
    }
  });

  app.delete("/api/templates/:templateId/exercises/:exerciseId/sets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deletePlannedSet(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting planned set:", error);
      res.status(500).json({ message: "Failed to delete planned set" });
    }
  });

  app.patch("/api/templates/:templateId/exercises/:exerciseId/sets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const set = await storage.updatePlannedSet(userId, req.params.id, req.body);
      res.json(set);
    } catch (error) {
      console.error("Error updating planned set:", error);
      res.status(500).json({ message: "Failed to update planned set" });
    }
  });

  app.post("/api/templates/:templateId/exercises/:exerciseId/sets/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.reorderPlannedSets(userId, req.params.exerciseId, req.body.setIds);
      res.status(200).send();
    } catch (error) {
      console.error("Error reordering planned sets:", error);
      res.status(500).json({ message: "Failed to reorder planned sets" });
    }
  });

  // Template-Circuit Integration
  app.post("/api/templates/:templateId/circuits", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { circuitId, position, rounds } = req.body as { circuitId: string; position: number; rounds?: number };
      const templateExercises = await storage.addCircuitToTemplate(userId, req.params.templateId as string, circuitId, position, rounds);
      res.status(201).json(templateExercises);
    } catch (error) {
      console.error("Error adding circuit to template:", error);
      res.status(500).json({ message: "Failed to add circuit to template" });
    }
  });

  app.patch("/api/templates/:templateId/circuits/:circuitId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { rounds } = req.body as { rounds: number };
      await storage.updateCircuitRoundsInTemplate(userId, req.params.templateId as string, req.params.circuitId as string, rounds);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating circuit rounds:", error);
      res.status(500).json({ message: "Failed to update circuit rounds" });
    }
  });

  app.delete("/api/templates/:templateId/circuits/:circuitId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.removeCircuitFromTemplate(userId, req.params.templateId as string, req.params.circuitId as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing circuit from template:", error);
      res.status(500).json({ message: "Failed to remove circuit from template" });
    }
  });

  // ============================================
  // SCHEDULE
  // ============================================

  app.get("/api/schedule/:date", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const schedule = await storage.getScheduleForDate(userId, req.params.date);
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ message: "Failed to fetch schedule" });
    }
  });

  app.get("/api/schedule/week/:startDate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const schedule = await storage.getScheduleForWeek(userId, req.params.startDate);
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching week schedule:", error);
      res.status(500).json({ message: "Failed to fetch week schedule" });
    }
  });

  app.get("/api/schedule/range/:startDate/:endDate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const schedule = await storage.getScheduleForRange(userId, req.params.startDate, req.params.endDate);
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching schedule range:", error);
      res.status(500).json({ message: "Failed to fetch schedule range" });
    }
  });

  app.post("/api/schedule", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const schedule = await storage.createSchedule({ ...req.body, userId });
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // ============================================
  // SESSIONS
  // ============================================

  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sessions = await storage.getSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/active", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.getActiveSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  // Export all sessions with full details - must be before :id route
  app.get("/api/sessions/export", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sessions = await storage.getSessionsForExport(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error exporting sessions:", error);
      res.status(500).json({ message: "Failed to export sessions" });
    }
  });

  app.get("/api/sessions/:id/last-performance", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.getSession(userId, req.params.id as string);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const exerciseIds = (session.exercises || []).map((e: any) => e.exerciseId);
      const lastPerformance = await storage.getLastPerformance(userId, exerciseIds);
      res.json(lastPerformance);
    } catch (error) {
      console.error("Error fetching last performance:", error);
      res.status(500).json({ message: "Failed to fetch last performance" });
    }
  });

  app.get("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.getSession(userId, req.params.id as string);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions/start/:scheduleId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.startSession(userId, req.params.scheduleId as string);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  app.post("/api/sessions/adhoc", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.createAdhocSession(userId);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating adhoc session:", error);
      res.status(500).json({ message: "Failed to create adhoc session" });
    }
  });

  app.post("/api/sessions/start-from-template/:templateId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const template = await storage.getTemplate(userId, req.params.templateId as string);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      const session = await storage.startSessionFromTemplate(userId, req.params.templateId as string);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error starting session from template:", error);
      res.status(500).json({ message: "Failed to start session from template" });
    }
  });

  app.post("/api/sessions/:id/end", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.endSession(userId, req.params.id as string, req.body.notes);
      res.json(session);
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Session Exercises
  app.post("/api/sessions/:sessionId/exercises", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sessionExercise = await storage.addSessionExercise({
        ...req.body,
        userId,
        sessionId: req.params.sessionId,
      });
      res.status(201).json(sessionExercise);
    } catch (error) {
      console.error("Error adding session exercise:", error);
      res.status(500).json({ message: "Failed to add exercise to session" });
    }
  });

  // Performed Sets
  app.post("/api/sessions/:sessionId/exercises/:exerciseId/sets", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const set = await storage.addPerformedSet({
        ...req.body,
        userId,
        sessionExerciseId: req.params.exerciseId,
      });
      res.status(201).json(set);
    } catch (error) {
      console.error("Error adding performed set:", error);
      res.status(500).json({ message: "Failed to log set" });
    }
  });

  app.patch("/api/sessions/:sessionId/exercises/:exerciseId/sets/:setId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const set = await storage.updatePerformedSet(userId, req.params.setId as string, req.body);
      if (!set) {
        return res.status(404).json({ message: "Set not found" });
      }
      res.json(set);
    } catch (error) {
      console.error("Error updating performed set:", error);
      res.status(500).json({ message: "Failed to update set" });
    }
  });

  app.delete("/api/sessions/:sessionId/exercises/:exerciseId/sets/:setId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deletePerformedSet(userId, req.params.setId as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting performed set:", error);
      res.status(500).json({ message: "Failed to delete set" });
    }
  });

  // ============================================
  // SUPPLEMENTS
  // ============================================

  app.get("/api/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supplements = await storage.getSupplements(userId);
      res.json(supplements);
    } catch (error) {
      console.error("Error fetching supplements:", error);
      res.status(500).json({ message: "Failed to fetch supplements" });
    }
  });

  app.post("/api/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validation = validateBody(insertSupplementSchema.omit({ userId: true }), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const supplement = await storage.createSupplement({ ...validation.data, userId });
      res.status(201).json(supplement);
    } catch (error) {
      console.error("Error creating supplement:", error);
      res.status(500).json({ message: "Failed to create supplement" });
    }
  });

  app.patch("/api/supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supplement = await storage.updateSupplement(userId, req.params.id, req.body);
      if (!supplement) {
        return res.status(404).json({ message: "Supplement not found" });
      }
      res.json(supplement);
    } catch (error) {
      console.error("Error updating supplement:", error);
      res.status(500).json({ message: "Failed to update supplement" });
    }
  });

  app.delete("/api/supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteSupplement(userId, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplement:", error);
      res.status(500).json({ message: "Failed to delete supplement" });
    }
  });

  // Supplement Logs
  app.get("/api/supplements/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getSupplementLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching supplement logs:", error);
      res.status(500).json({ message: "Failed to fetch supplement logs" });
    }
  });

  app.get("/api/supplements/logs/today", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getTodaySupplementLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching today's supplement logs:", error);
      res.status(500).json({ message: "Failed to fetch today's supplement logs" });
    }
  });

  app.post("/api/supplements/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const log = await storage.logSupplementIntake({
        ...req.body,
        userId,
        takenAt: new Date(req.body.takenAt),
      });
      res.status(201).json(log);
    } catch (error) {
      console.error("Error logging supplement intake:", error);
      res.status(500).json({ message: "Failed to log supplement intake" });
    }
  });

  app.patch("/api/supplements/logs/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const updateData: { dose?: string; takenAt?: Date; notes?: string | null } = {};
      if (req.body.dose !== undefined) updateData.dose = req.body.dose;
      if (req.body.takenAt !== undefined) updateData.takenAt = new Date(req.body.takenAt);
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      const log = await storage.updateSupplementLog(userId, id, updateData);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error updating supplement log:", error);
      res.status(500).json({ message: "Failed to update supplement log" });
    }
  });

  app.delete("/api/supplements/logs/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      await storage.deleteSupplementLog(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplement log:", error);
      res.status(500).json({ message: "Failed to delete supplement log" });
    }
  });

  // ============================================
  // BODY WEIGHT
  // ============================================

  app.get("/api/weight", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getWeightLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      res.status(500).json({ message: "Failed to fetch weight logs" });
    }
  });

  app.post("/api/weight", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validation = validateBody(insertBodyWeightLogSchema.omit({ userId: true }), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const log = await storage.logWeight({
        ...validation.data,
        userId,
      });
      res.status(201).json(log);
    } catch (error) {
      console.error("Error logging weight:", error);
      res.status(500).json({ message: "Failed to log weight" });
    }
  });

  // ============================================
  // ANALYTICS
  // ============================================

  app.get("/api/analytics/exercise/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const analytics = await storage.getExerciseAnalytics(userId, id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching exercise analytics:", error);
      res.status(500).json({ message: "Failed to fetch exercise analytics" });
    }
  });

  return httpServer;
}
