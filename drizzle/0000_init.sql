CREATE TABLE "qr_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"target_url" text NOT NULL,
	"title" text,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_scan_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "qr_codes_created_at_idx" ON "qr_codes" USING btree ("created_at");