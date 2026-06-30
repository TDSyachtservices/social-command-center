import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mentionGroupsTable = pgTable("mention_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactIds: uuid("contact_ids").array().notNull().default([]),
  platforms: text("platforms").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMentionGroupSchema = createInsertSchema(mentionGroupsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMentionGroupSchema = insertMentionGroupSchema.partial();

export const selectMentionGroupSchema = createSelectSchema(mentionGroupsTable);

export type InsertMentionGroup = z.infer<typeof insertMentionGroupSchema>;
export type MentionGroup = typeof mentionGroupsTable.$inferSelect;
