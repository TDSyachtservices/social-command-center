import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hashtagSetsTable = pgTable("hashtag_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  platforms: text("platforms").array().notNull().default([]),
  hashtags: text("hashtags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHashtagSetSchema = createInsertSchema(hashtagSetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateHashtagSetSchema = insertHashtagSetSchema.partial();

export const selectHashtagSetSchema = createSelectSchema(hashtagSetsTable);

export type InsertHashtagSet = z.infer<typeof insertHashtagSetSchema>;
export type HashtagSet = typeof hashtagSetsTable.$inferSelect;
