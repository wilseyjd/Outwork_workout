CREATE TYPE "public"."schedule_status" AS ENUM('planned', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."supplement_schedule_type" AS ENUM('daily', 'weekly', 'custom');--> statement-breakpoint
CREATE TABLE "body_weight_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"logged_at" timestamp DEFAULT now(),
	"weight_lbs" numeric NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "circuit_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"circuit_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"position" integer NOT NULL,
	"rest_after_seconds" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circuits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"rounds" integer DEFAULT 1 NOT NULL,
	"category" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"rest_between_exercises_seconds" integer,
	"rest_between_rounds_seconds" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"category" text,
	"default_tracking" jsonb DEFAULT '{"weight":true,"reps":true,"time":false}'::jsonb,
	"notes" text,
	"url" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "exercises_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "hidden_system_circuits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"circuit_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hidden_system_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performed_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_exercise_id" varchar NOT NULL,
	"set_number" integer NOT NULL,
	"actual_reps" integer,
	"actual_weight" numeric,
	"actual_time_seconds" integer,
	"rest_seconds" integer,
	"is_warmup" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "planned_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"template_exercise_id" varchar NOT NULL,
	"set_number" integer NOT NULL,
	"target_reps" integer,
	"target_weight" numeric,
	"target_time_seconds" integer,
	"rest_seconds" integer,
	"is_warmup" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"position" integer NOT NULL,
	"circuit_id" varchar,
	"circuit_round" integer,
	"circuit_rounds" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplement_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"supplement_id" varchar NOT NULL,
	"taken_at" timestamp NOT NULL,
	"dose" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "supplement_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"supplement_id" varchar NOT NULL,
	"schedule_type" "supplement_schedule_type" DEFAULT 'daily',
	"time_of_day" text,
	"days_of_week" integer[],
	"dose" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"default_dose" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "supplements_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "workout_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"template_id" varchar NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" "schedule_status" DEFAULT 'planned',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"template_id" varchar,
	"schedule_id" varchar,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"template_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"position" integer NOT NULL,
	"circuit_id" varchar,
	"circuit_round" integer,
	"circuit_rounds" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "body_weight_logs_user_logged_idx" ON "body_weight_logs" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE INDEX "circuit_exercises_circuit_idx" ON "circuit_exercises" USING btree ("circuit_id");--> statement-breakpoint
CREATE INDEX "circuit_exercises_position_idx" ON "circuit_exercises" USING btree ("circuit_id","position");--> statement-breakpoint
CREATE INDEX "circuits_user_idx" ON "circuits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exercises_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hidden_circuits_user_idx" ON "hidden_system_circuits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hidden_exercises_user_idx" ON "hidden_system_exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "performed_sets_session_exercise_idx" ON "performed_sets" USING btree ("session_exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "performed_sets_user_created_idx" ON "performed_sets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "planned_sets_template_exercise_idx" ON "planned_sets" USING btree ("template_exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "session_exercises_session_idx" ON "session_exercises" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "session_exercises_exercise_idx" ON "session_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "supplement_logs_user_taken_idx" ON "supplement_logs" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE INDEX "supplement_logs_supplement_idx" ON "supplement_logs" USING btree ("supplement_id","taken_at");--> statement-breakpoint
CREATE INDEX "supplement_schedule_user_idx" ON "supplement_schedule" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "supplement_schedule_supplement_idx" ON "supplement_schedule" USING btree ("supplement_id");--> statement-breakpoint
CREATE INDEX "supplements_user_idx" ON "supplements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "schedule_user_date_idx" ON "workout_schedule" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "schedule_template_idx" ON "workout_schedule" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "sessions_user_started_idx" ON "workout_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "sessions_template_idx" ON "workout_sessions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_exercises_template_idx" ON "workout_template_exercises" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_exercises_position_idx" ON "workout_template_exercises" USING btree ("template_id","position");--> statement-breakpoint
CREATE INDEX "templates_user_idx" ON "workout_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");