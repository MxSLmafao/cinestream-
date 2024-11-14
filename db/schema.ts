import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const accessCodes = pgTable("access_codes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").unique().notNull(),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").unique().notNull(),
  accessCodeId: integer("access_code_id").references(() => accessCodes.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertAccessCodeSchema = createInsertSchema(accessCodes);
export const selectAccessCodeSchema = createSelectSchema(accessCodes);
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);

export type AccessCode = z.infer<typeof selectAccessCodeSchema>;
export type Session = z.infer<typeof selectSessionSchema>;
