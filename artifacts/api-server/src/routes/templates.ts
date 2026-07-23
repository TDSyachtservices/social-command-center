import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

interface PostTemplate {
  id: string;
  name: string;
  description: string | null;
  postType: string;
  platforms: string[];
  masterCaption: string;
  platformCaptionsJson: Record<string, string> | null;
  hashtagsJson: Record<string, string[]> | null;
  createdAt: string;
  updatedAt: string;
}

const store: PostTemplate[] = [];

function now() {
  return new Date().toISOString();
}

router.get("/templates", (_req, res) => {
  res.json({ success: true, data: store.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)) });
});

router.get("/templates/:id", (req, res) => {
  const t = store.find((x) => x.id === req.params.id);
  if (!t) { res.status(404).json({ success: false, error: "Template not found" }); return; }
  res.json({ success: true, data: t });
});

router.post("/templates", (req, res) => {
  const { name, description, postType, platforms, masterCaption, platformCaptionsJson, hashtagsJson } = req.body as Partial<PostTemplate>;
  if (!name?.trim()) { res.status(400).json({ success: false, error: "name is required" }); return; }
  const t: PostTemplate = {
    id: randomUUID(),
    name: name.trim(),
    description: description ?? null,
    postType: postType ?? "standard",
    platforms: platforms ?? [],
    masterCaption: masterCaption ?? "",
    platformCaptionsJson: platformCaptionsJson ?? null,
    hashtagsJson: hashtagsJson ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  store.push(t);
  res.status(201).json({ success: true, data: t });
});

router.patch("/templates/:id", (req, res) => {
  const idx = store.findIndex((x) => x.id === req.params.id);
  if (idx === -1) { res.status(404).json({ success: false, error: "Template not found" }); return; }
  const { name, description, postType, platforms, masterCaption, platformCaptionsJson, hashtagsJson } = req.body as Partial<PostTemplate>;
  const t = store[idx];
  store[idx] = {
    ...t,
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(postType !== undefined ? { postType } : {}),
    ...(platforms !== undefined ? { platforms } : {}),
    ...(masterCaption !== undefined ? { masterCaption } : {}),
    ...(platformCaptionsJson !== undefined ? { platformCaptionsJson } : {}),
    ...(hashtagsJson !== undefined ? { hashtagsJson } : {}),
    updatedAt: now(),
  };
  res.json({ success: true, data: store[idx] });
});

router.delete("/templates/:id", (req, res) => {
  const idx = store.findIndex((x) => x.id === req.params.id);
  if (idx === -1) { res.status(404).json({ success: false, error: "Template not found" }); return; }
  store.splice(idx, 1);
  res.json({ success: true, data: { deleted: true } });
});

export default router;
