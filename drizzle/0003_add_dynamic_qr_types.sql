ALTER TABLE "qr_codes" ADD COLUMN "qr_type" text DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "qr_data" text;
