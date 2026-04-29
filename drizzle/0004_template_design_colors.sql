CREATE TABLE IF NOT EXISTS "qr_style_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"preset" text NOT NULL,
	"color_from" text,
	"color_to" text,
	"background_color" text,
	"dot_type" text DEFAULT 'rounded' NOT NULL,
	"corner_type" text DEFAULT 'extra-rounded' NOT NULL,
	"transparent" boolean DEFAULT false NOT NULL,
	"print_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qr_style_templates" ADD COLUMN IF NOT EXISTS "color_from" text;
--> statement-breakpoint
ALTER TABLE "qr_style_templates" ADD COLUMN IF NOT EXISTS "color_to" text;
--> statement-breakpoint
ALTER TABLE "qr_style_templates" ADD COLUMN IF NOT EXISTS "background_color" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_templates_user_idx" ON "qr_style_templates" USING btree ("user_id");
