import { Router } from "express";
import { db, mentionContactsTable, insertMentionContactSchema, updateMentionContactSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/mention-contacts", async (req, res) => {
  try {
    const contacts = await db.select().from(mentionContactsTable).orderBy(mentionContactsTable.createdAt);
    res.json({ success: true, data: contacts });
  } catch (err) {
    req.log.error(err, "Failed to list mention contacts");
    res.status(500).json({ success: false, error: "Failed to load mention contacts" });
  }
});

router.post("/mention-contacts", async (req, res) => {
  const parsed = insertMentionContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(mentionContactsTable).values(parsed.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error(err, "Failed to create mention contact");
    res.status(500).json({ success: false, error: "Failed to create mention contact" });
  }
});

router.patch("/mention-contacts/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = updateMentionContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(mentionContactsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(mentionContactsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error(err, "Failed to update mention contact");
    res.status(500).json({ success: false, error: "Failed to update mention contact" });
  }
});

router.delete("/mention-contacts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [deleted] = await db
      .delete(mentionContactsTable)
      .where(eq(mentionContactsTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }
    res.json({ success: true, data: deleted });
  } catch (err) {
    req.log.error(err, "Failed to delete mention contact");
    res.status(500).json({ success: false, error: "Failed to delete mention contact" });
  }
});

export default router;
