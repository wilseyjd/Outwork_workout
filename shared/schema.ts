import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, numeric, timestamp, date, jsonb, index, unique, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const scheduleStatusEnum = pgEnum("schedule_status", ["planned", "completed", "skipped"]);
export const supplementScheduleTypeEnum = pgEnum("supplement_schedule_type", ["daily", "weekly", "custom"]);

// Exercises table - user's exercise bank
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Nullable for system exercises
  name: text("name").notNull(),
  category: text("category"),
  defaultTracking: jsonb("default_tracking").$type<{ weight: boolean; reps: boolean; time: boolean; distance: boolean }>().default({ weight: true, reps: true, time: false, distance: false }),
  weightUnit: text("weight_unit").default("lbs"),
  distanceUnit: text("distance_unit").default("mi"),
  timeUnit: text("time_unit").default("sec"),
  notes: text("notes"),
  url: text("url"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("exercises_user_name_unique").on(table.userId, table.name),
  index("exercises_user_idx").on(table.userId),
]);

export const hiddenSystemExercises = pgTable("hidden_system_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
}, (table) => [
  index("hidden_exercises_user_idx").on(table.userId),
]);

// Circuits table - reusable exercise groups
export const circuits = pgTable("circuits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Nullable for system circuits
  name: text("name").notNull(),
  rounds: integer("rounds").notNull().default(1),
  category: text("category"),
  isSystem: boolean("is_system").notNull().default(false),
  restBetweenExercisesSeconds: integer("rest_between_exercises_seconds"),
  restBetweenRoundsSeconds: integer("rest_between_rounds_seconds"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("circuits_user_idx").on(table.userId),
]);

// Circuit exercises - exercises within a circuit with ordering
export const circuitExercises = pgTable("circuit_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  circuitId: varchar("circuit_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  position: integer("position").notNull(),
  restAfterSeconds: integer("rest_after_seconds"),
  defaultReps: integer("default_reps"),
  defaultWeight: numeric("default_weight"),
  defaultTimeSeconds: integer("default_time_seconds"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("circuit_exercises_circuit_idx").on(table.circuitId),
  index("circuit_exercises_position_idx").on(table.circuitId, table.position),
]);

// Hidden system circuits - tracks which system circuits a user has hidden
export const hiddenSystemCircuits = pgTable("hidden_system_circuits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  circuitId: varchar("circuit_id").notNull(),
}, (table) => [
  index("hidden_circuits_user_idx").on(table.userId),
]);

// Workout templates table - planned workout definitions
export const workoutTemplates = pgTable("workout_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("templates_user_idx").on(table.userId),
]);

// Workout template exercises - exercises in a template with ordering
export const workoutTemplateExercises = pgTable("workout_template_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateId: varchar("template_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  position: integer("position").notNull(),
  circuitId: varchar("circuit_id"),
  circuitRound: integer("circuit_round"),
  circuitRounds: integer("circuit_rounds"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("template_exercises_template_idx").on(table.templateId),
  index("template_exercises_position_idx").on(table.templateId, table.position),
]);

// Planned sets - targets for each exercise in a template
export const plannedSets = pgTable("planned_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateExerciseId: varchar("template_exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  targetReps: integer("target_reps"),
  targetWeight: numeric("target_weight"),
  targetTimeSeconds: integer("target_time_seconds"),
  targetDistance: numeric("target_distance"),
  restSeconds: integer("rest_seconds"),
  isWarmup: boolean("is_warmup").default(false),
}, (table) => [
  index("planned_sets_template_exercise_idx").on(table.templateExerciseId, table.setNumber),
]);

// Workout schedule - assign templates to specific days
export const workoutSchedule = pgTable("workout_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateId: varchar("template_id").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  status: scheduleStatusEnum("status").default("planned"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("schedule_user_date_idx").on(table.userId, table.scheduledDate),
  index("schedule_template_idx").on(table.templateId),
]);

// Workout sessions - performed workouts
export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateId: varchar("template_id"),
  scheduleId: varchar("schedule_id"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sessions_user_started_idx").on(table.userId, table.startedAt),
  index("sessions_template_idx").on(table.templateId),
]);

// Session exercises - exercises performed in a session
export const sessionExercises = pgTable("session_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  position: integer("position").notNull(),
  circuitId: varchar("circuit_id"),
  circuitRound: integer("circuit_round"),
  circuitRounds: integer("circuit_rounds"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("session_exercises_session_idx").on(table.sessionId, table.position),
  index("session_exercises_exercise_idx").on(table.exerciseId),
]);

// Performed sets - actual logged sets during a session
export const performedSets = pgTable("performed_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionExerciseId: varchar("session_exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  actualReps: integer("actual_reps"),
  actualWeight: numeric("actual_weight"),
  actualTimeSeconds: integer("actual_time_seconds"),
  actualDistance: numeric("actual_distance"),
  restSeconds: integer("rest_seconds"),
  isWarmup: boolean("is_warmup").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("performed_sets_session_exercise_idx").on(table.sessionExerciseId, table.setNumber),
  index("performed_sets_user_created_idx").on(table.userId, table.createdAt),
]);

// Supplements table
export const supplements = pgTable("supplements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  defaultDose: text("default_dose"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("supplements_user_name_unique").on(table.userId, table.name),
  index("supplements_user_idx").on(table.userId),
]);

// Supplement schedule - how/when to take supplements
export const supplementSchedule = pgTable("supplement_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  supplementId: varchar("supplement_id").notNull(),
  scheduleType: supplementScheduleTypeEnum("schedule_type").default("daily"),
  timeOfDay: text("time_of_day"),
  daysOfWeek: integer("days_of_week").array(),
  dose: text("dose"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("supplement_schedule_user_idx").on(table.userId, table.active),
  index("supplement_schedule_supplement_idx").on(table.supplementId),
]);

// Supplement logs - actual intake tracking
export const supplementLogs = pgTable("supplement_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  supplementId: varchar("supplement_id").notNull(),
  takenAt: timestamp("taken_at").notNull(),
  dose: text("dose").notNull(),
  notes: text("notes"),
}, (table) => [
  index("supplement_logs_user_taken_idx").on(table.userId, table.takenAt),
  index("supplement_logs_supplement_idx").on(table.supplementId, table.takenAt),
]);

// Body weight logs
export const bodyWeightLogs = pgTable("body_weight_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  loggedAt: timestamp("logged_at").defaultNow(),
  weightLbs: numeric("weight_lbs").notNull(),
  notes: text("notes"),
}, (table) => [
  index("body_weight_logs_user_logged_idx").on(table.userId, table.loggedAt),
]);

// Relations
export const circuitsRelations = relations(circuits, ({ many }) => ({
  circuitExercises: many(circuitExercises),
}));

export const circuitExercisesRelations = relations(circuitExercises, ({ one }) => ({
  circuit: one(circuits, {
    fields: [circuitExercises.circuitId],
    references: [circuits.id],
  }),
  exercise: one(exercises, {
    fields: [circuitExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  templateExercises: many(workoutTemplateExercises),
  sessionExercises: many(sessionExercises),
  circuitExercises: many(circuitExercises),
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({ many }) => ({
  templateExercises: many(workoutTemplateExercises),
  schedules: many(workoutSchedule),
  sessions: many(workoutSessions),
}));

export const workoutTemplateExercisesRelations = relations(workoutTemplateExercises, ({ one, many }) => ({
  template: one(workoutTemplates, {
    fields: [workoutTemplateExercises.templateId],
    references: [workoutTemplates.id],
  }),
  exercise: one(exercises, {
    fields: [workoutTemplateExercises.exerciseId],
    references: [exercises.id],
  }),
  plannedSets: many(plannedSets),
}));

export const plannedSetsRelations = relations(plannedSets, ({ one }) => ({
  templateExercise: one(workoutTemplateExercises, {
    fields: [plannedSets.templateExerciseId],
    references: [workoutTemplateExercises.id],
  }),
}));

export const workoutScheduleRelations = relations(workoutSchedule, ({ one }) => ({
  template: one(workoutTemplates, {
    fields: [workoutSchedule.templateId],
    references: [workoutTemplates.id],
  }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  template: one(workoutTemplates, {
    fields: [workoutSessions.templateId],
    references: [workoutTemplates.id],
  }),
  schedule: one(workoutSchedule, {
    fields: [workoutSessions.scheduleId],
    references: [workoutSchedule.id],
  }),
  sessionExercises: many(sessionExercises),
}));

export const sessionExercisesRelations = relations(sessionExercises, ({ one, many }) => ({
  session: one(workoutSessions, {
    fields: [sessionExercises.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [sessionExercises.exerciseId],
    references: [exercises.id],
  }),
  performedSets: many(performedSets),
}));

export const performedSetsRelations = relations(performedSets, ({ one }) => ({
  sessionExercise: one(sessionExercises, {
    fields: [performedSets.sessionExerciseId],
    references: [sessionExercises.id],
  }),
}));

export const supplementsRelations = relations(supplements, ({ many }) => ({
  schedules: many(supplementSchedule),
  logs: many(supplementLogs),
}));

export const supplementScheduleRelations = relations(supplementSchedule, ({ one }) => ({
  supplement: one(supplements, {
    fields: [supplementSchedule.supplementId],
    references: [supplements.id],
  }),
}));

export const supplementLogsRelations = relations(supplementLogs, ({ one }) => ({
  supplement: one(supplements, {
    fields: [supplementLogs.supplementId],
    references: [supplements.id],
  }),
}));

// Insert schemas
export const insertCircuitSchema = createInsertSchema(circuits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCircuitExerciseSchema = createInsertSchema(circuitExercises).omit({ id: true, createdAt: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutTemplateExerciseSchema = createInsertSchema(workoutTemplateExercises).omit({ id: true, createdAt: true });
export const insertPlannedSetSchema = createInsertSchema(plannedSets).omit({ id: true });
export const insertWorkoutScheduleSchema = createInsertSchema(workoutSchedule).omit({ id: true, createdAt: true });
export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({ id: true, createdAt: true });
export const insertSessionExerciseSchema = createInsertSchema(sessionExercises).omit({ id: true, createdAt: true });
export const insertPerformedSetSchema = createInsertSchema(performedSets).omit({ id: true, createdAt: true });
export const insertSupplementSchema = createInsertSchema(supplements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplementScheduleSchema = createInsertSchema(supplementSchedule).omit({ id: true, createdAt: true });
export const insertSupplementLogSchema = createInsertSchema(supplementLogs).omit({ id: true });
export const insertBodyWeightLogSchema = createInsertSchema(bodyWeightLogs).omit({ id: true, loggedAt: true });

// Types
export type Circuit = typeof circuits.$inferSelect;
export type InsertCircuit = z.infer<typeof insertCircuitSchema>;
export type CircuitExercise = typeof circuitExercises.$inferSelect;
export type InsertCircuitExercise = z.infer<typeof insertCircuitExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
export type WorkoutTemplateExercise = typeof workoutTemplateExercises.$inferSelect;
export type InsertWorkoutTemplateExercise = z.infer<typeof insertWorkoutTemplateExerciseSchema>;
export type PlannedSet = typeof plannedSets.$inferSelect;
export type InsertPlannedSet = z.infer<typeof insertPlannedSetSchema>;
export type WorkoutScheduleItem = typeof workoutSchedule.$inferSelect;
export type InsertWorkoutSchedule = z.infer<typeof insertWorkoutScheduleSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type InsertSessionExercise = z.infer<typeof insertSessionExerciseSchema>;
export type PerformedSet = typeof performedSets.$inferSelect;
export type InsertPerformedSet = z.infer<typeof insertPerformedSetSchema>;
export type Supplement = typeof supplements.$inferSelect;
export type InsertSupplement = z.infer<typeof insertSupplementSchema>;
export type SupplementScheduleItem = typeof supplementSchedule.$inferSelect;
export type InsertSupplementSchedule = z.infer<typeof insertSupplementScheduleSchema>;
export type SupplementLog = typeof supplementLogs.$inferSelect;
export type InsertSupplementLog = z.infer<typeof insertSupplementLogSchema>;
export type BodyWeightLog = typeof bodyWeightLogs.$inferSelect;
export type InsertBodyWeightLog = z.infer<typeof insertBodyWeightLogSchema>;
