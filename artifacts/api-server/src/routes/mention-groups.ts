import { Router } from "express";
import { db, mentionGroupsTable, insertMentionGroupSchema, updateMentionGroupSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/mention-groups", async (req, res) => {
  try {
    const groups = await db.select().from(mentionGroupsTable).orderBy(mentionGroupsTable.createdAt);
    res.json({ success: true, data: groups });
  } catch (err) {
    req.log.error(err, "Failed to list mention groups");
    res.status(500).json({ success: false, error: "Failed to load mention groups" });
  }
});

router.post("/mention-groups", async (req, res) => {
  const parsed = insertMentionGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(mentionGroupsTable).values(parsed.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error(err, "Failed to create mention group");
    res.status(500).json({ success: false, error: "Failed to create mention group" });
  }
});

router.patch("/mention-groups/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = updateMentionGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(mentionGroupsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(mentionGroupsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error(err, "Failed to update mention group");
    res.status(500).json({ success: false, error: "Failed to update mention group" });
  }
});

router.delete("/mention-groups/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [deleted] = await db
      .delete(mentionGroupsTable)
      .where(eq(mentionGroupsTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }
    res.json({ success: true, data: deleted });
  } catch (err) {
    req.log.error(err, "Failed to delete mention group");
    res.status(500).json({ success: false, error: "Failed to delete mention group" });
  }
});

export default router;
