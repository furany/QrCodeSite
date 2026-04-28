import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const qrCodes = pgTable(
  "qr_codes",
  {
    code: text("code").primaryKey(),
    targetUrl: text("target_url").notNull(),
    title: text("title"),
    scanCount: integer("scan_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastScanAt: timestamp("last_scan_at", { withTimezone: true }),
  },
  (t) => [index("qr_codes_created_at_idx").on(t.createdAt)],
);

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
