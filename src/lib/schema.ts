import {
  boolean,
  pgTable,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("member"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    code: text("code").primaryKey(),
    userId: text("user_id"),
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
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("qr_codes_created_at_idx").on(t.createdAt),
    index("qr_codes_scan_count_idx").on(t.scanCount),
    index("qr_codes_last_scan_at_idx").on(t.lastScanAt),
    index("qr_codes_archived_at_idx").on(t.archivedAt),
  ],
);

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
