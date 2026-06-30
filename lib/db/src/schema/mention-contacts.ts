import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mentionContactsTable = pgTable("mention_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull().default(""),
  platforms: text("platforms").array().notNull().default([]),
  handles: jsonb("handles").notNull().default({}),
  linkedinUrn: text("linkedin_urn"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMentionContactSchema = createInsertSchema(mentionContactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMentionContactSchema = insertMentionContactSchema.partial();

export const selectMentionContactSchema = createSelectSchema(mentionContactsTable);

export type InsertMentionContact = z.infer<typeof insertMentionContactSchema>;
export type MentionContact = typeof mentionContactsTable.$inferSelect;
