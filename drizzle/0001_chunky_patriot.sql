CREATE TABLE "financing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_id" uuid NOT NULL,
	"property_value" numeric NOT NULL,
	"down_payment" numeric NOT NULL,
	"term_months" integer NOT NULL,
	"interest_rate" numeric NOT NULL,
	"amortization_system" text NOT NULL,
	"first_parcel_override" numeric,
	"last_parcel_override" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financing_house_id_unique" UNIQUE("house_id")
);
--> statement-breakpoint
ALTER TABLE "financing" ADD CONSTRAINT "financing_house_id_houses_id_fk" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE no action;