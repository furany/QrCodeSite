ALTER TABLE "qr_codes" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "qr_codes_scan_count_idx" ON "qr_codes" USING btree ("scan_count");--> statement-breakpoint
CREATE INDEX "qr_codes_last_scan_at_idx" ON "qr_codes" USING btree ("last_scan_at");--> statement-breakpoint
CREATE INDEX "qr_codes_archived_at_idx" ON "qr_codes" USING btree ("archived_at");