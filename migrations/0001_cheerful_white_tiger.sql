ALTER TABLE "circuit_exercises" ADD COLUMN "default_reps" integer;--> statement-breakpoint
ALTER TABLE "circuit_exercises" ADD COLUMN "default_weight" numeric;--> statement-breakpoint
ALTER TABLE "circuit_exercises" ADD COLUMN "default_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp;