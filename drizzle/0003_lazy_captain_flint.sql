CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" numeric NOT NULL,
	"status" text NOT NULL,
	"category" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "latitude" numeric;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "longitude" numeric;