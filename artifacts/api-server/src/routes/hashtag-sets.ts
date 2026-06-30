import { Router } from "express";
import { db, hashtagSetsTable, insertHashtagSetSchema, updateHashtagSetSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/hashtag-sets", async (req, res) => {
  try {
    const sets = await db.select().from(hashtagSetsTable).orderBy(hashtagSetsTable.createdAt);
    res.json({ success: true, data: sets });
  } catch (err) {
    req.log.error(err, "Failed to list hashtag sets");
    res.status(500).json({ success: false, error: "Failed to load hashtag sets" });
  }
});

router.post("/hashtag-sets", async (req, res) => {
  const parsed = insertHashtagSetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(hashtagSetsTable).values(parsed.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error(err, "Failed to create hashtag set");
    res.status(500).json({ success: false, error: "Failed to create hashtag set" });
  }
});

router.patch("/hashtag-sets/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = updateHashtagSetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(hashtagSetsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(hashtagSetsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ success: false, error: "Hashtag set not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error(err, "Failed to update hashtag set");
    res.status(500).json({ success: false, error: "Failed to update hashtag set" });
  }
});

router.delete("/hashtag-sets/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [deleted] = await db
      .delete(hashtagSetsTable)
      .where(eq(hashtagSetsTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ success: false, error: "Hashtag set not found" });
      return;
    }
    res.json({ success: true, data: deleted });
  } catch (err) {
    req.log.error(err, "Failed to delete hashtag set");
    res.status(500).json({ success: false, error: "Failed to delete hashtag set" });
  }
});

export default router;
