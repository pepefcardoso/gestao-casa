ALTER TABLE "financing" ADD COLUMN "admin_fee" numeric;--> statement-breakpoint
ALTER TABLE "financing" ADD COLUMN "mip_rate" numeric;--> statement-breakpoint
ALTER TABLE "financing" ADD COLUMN "dfi_rate" numeric;--> statement-breakpoint
ALTER TABLE "financing" ADD COLUMN "tr_rate" numeric;--> statement-breakpoint
ALTER TABLE "financing" ADD COLUMN "interest_method" text;