import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

const OPENAI_BASE = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "").replace(/\/$/, "");
const OPENAI_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

interface ScoreImageBody {
  imageUrl: string;
  platform: string;
  placement: string;
  width: number;
  height: number;
}

interface AiQualityResult {
  score: number;
  label: "Excellent" | "Good" | "Needs Review" | "Poor";
  reason: string;
}

// ─── POST /api/ai/score-image ─────────────────────────────────────────────────
// Accepts a public image URL + platform/placement metadata.
// Fetches the image, sends it to GPT vision, returns a quality label + reason.
// This runs inside Replit so it can access the AI_INTEGRATIONS_OPENAI_BASE_URL proxy.
router.post("/score-image", async (req: Request, res: Response) => {
  const body = req.body as Partial<ScoreImageBody>;

  const { imageUrl, platform, placement, width, height } = body;
  if (!imageUrl || !platform || !placement || !width || !height) {
    res.status(400).json({ error: "Missing required fields: imageUrl, platform, placement, width, height" });
    return;
  }

  if (!OPENAI_BASE || !OPENAI_KEY) {
    res.status(503).json({ error: "OpenAI integration not configured on this server." });
    return;
  }

  let imageBase64: string;
  let mimeType = "image/jpeg";
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
    const ct = imgRes.headers.get("content-type") ?? "";
    if (ct.includes("png")) mimeType = "image/png";
    else if (ct.includes("webp")) mimeType = "image/webp";
    const buf = await imgRes.arrayBuffer();
    imageBase64 = Buffer.from(buf).toString("base64");
  } catch (err) {
    logger.warn({ err, imageUrl }, "Failed to fetch image for AI scoring");
    res.status(422).json({ error: `Could not fetch image: ${String(err).slice(0, 120)}` });
    return;
  }

  const prompt = `You are a social media image quality reviewer.

You are looking at a ${width}×${height}px cropped image intended for: ${platform} ${placement.replace(/_/g, " ")}.

Assess whether this crop looks good as a social media post image. Consider:
1. Is the main subject (person, product, logo, boat, vessel) fully visible and not cut off?
2. Is the image sharp and in focus?
3. Is the composition acceptable for ${platform} (right breathing room, subject well-framed)?
4. Are there obvious problems — mostly blank/grey, severe distortion, key content cropped out?

Reply with ONLY valid JSON (no markdown, no code fences):
{"label":"Excellent","score":0.95,"reason":"One sentence explanation."}

Labels: "Excellent" (great, ready to post), "Good" (minor imperfections, acceptable), "Needs Review" (something notable wrong), "Poor" (major problem — subject cut off, blank image, severe distortion).`;

  try {
    const aiRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_completion_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      throw new Error(`OpenAI ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw.trim()) as {
      label?: string;
      score?: number;
      reason?: string;
    };

    const validLabels = ["Excellent", "Good", "Needs Review", "Poor"] as const;
    const label: AiQualityResult["label"] = validLabels.includes(
      parsed.label as (typeof validLabels)[number],
    )
      ? (parsed.label as AiQualityResult["label"])
      : "Needs Review";
    const score =
      typeof parsed.score === "number" ? Math.min(1, Math.max(0, parsed.score)) : 0.5;
    const reason =
      typeof parsed.reason === "string" ? parsed.reason : "No explanation provided.";

    res.json({ label, score, reason });
  } catch (err) {
    logger.warn({ err }, "AI vision scoring failed");
    res.status(500).json({
      error: `AI scoring failed: ${String(err).slice(0, 120)}`,
      label: "Needs Review",
      score: 0.5,
      reason: "AI scoring failed — please review manually.",
    });
  }
});

export default router;
