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

export const qrStyleTemplates = pgTable(
  "qr_style_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    preset: text("preset").notNull(), // "Wald", "Koralle", etc.
    dotType: text("dot_type").notNull().default("rounded"),
    cornerType: text("corner_type").notNull().default("extra-rounded"),
    transparent: boolean("transparent").notNull().default(false),
    printMode: boolean("print_mode").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("qr_templates_user_idx").on(t.userId)],
);

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(), // First 8 chars for display
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("api_keys_user_idx").on(t.userId),
    index("api_keys_key_hash_idx").on(t.keyHash),
  ]
);

export type QrStyleTemplate = typeof qrStyleTemplates.$inferSelect;
export type NewQrStyleTemplate = typeof qrStyleTemplates.$inferInsert;
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    success: boolean("success").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("login_attempts_email_idx").on(t.email),
    index("login_attempts_created_at_idx").on(t.createdAt),
  ]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
