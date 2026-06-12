import { Router, Request, Response } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../utils/logger.js";

const router = Router();

const generateCaptionSchema = z.object({
  postTitle: z.string().min(1).max(300),
  platforms: z
    .array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]))
    .min(1),
  tone: z
    .enum(["professional", "casual", "educational", "promotional"])
    .default("professional"),
  additionalContext: z.string().max(1000).optional(),
});

// ─── POST /api/ai/generate-caption ────────────────────────────────────────────
router.post(
  "/generate-caption",
  validateBody(generateCaptionSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof generateCaptionSchema>;

    const aiSetting = await prisma.setting.findUnique({ where: { key: "ai" } });
    const aiConfig = (aiSetting?.value as Record<string, unknown>) ?? {};

    const endpoint =
      (aiConfig.endpoint as string | undefined) ??
      process.env.LOCAL_AI_ENDPOINT ??
      "http://localhost:11434/v1";
    const model = (aiConfig.model as string | undefined) ?? "llama3-70b";
    const temperature = (aiConfig.temperature as number | undefined) ?? 0.7;
    const brandVoice =
      (aiConfig.brandVoice as string | undefined) ??
      "Professional, authoritative, marine-industry focused.";

    const platformList = body.platforms.join(", ");
    const prompt = `You are a social media manager for a premium marine manufacturing company. Your brand voice: ${brandVoice}

Write ${body.platforms.length > 1 ? "separate captions" : "a caption"} for the following post, optimized for ${platformList}.

Post title: ${body.postTitle}
Tone: ${body.tone}
${body.additionalContext ? `Additional context: ${body.additionalContext}` : ""}

Provide one caption per platform, separated clearly. Keep captions platform-appropriate in length and style. Include relevant hashtags.`;

    try {
      const aiRes = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LOCAL_AI_API_KEY ?? "none"}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!aiRes.ok) {
        throw new Error(`AI endpoint returned ${aiRes.status}`);
      }

      const data = (await aiRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      sendSuccess(res, { caption: content, model, platform: platformList });
    } catch (err) {
      logger.warn(err, "AI caption generation failed — returning mock");
      const mockCaption = body.platforms
        .map(
          (p) =>
            `[${p}] ${body.postTitle} — crafted for the marine industry. Quality materials, expert craftsmanship. Contact us today. #MarineDecking #Boating #Quality`,
        )
        .join("\n\n");
      sendSuccess(res, {
        caption: mockCaption,
        model: "mock",
        platform: platformList,
        mock: true,
      });
    }
  },
);

// ─── POST /api/ai/improve-caption ─────────────────────────────────────────────
const improveCaptionSchema = z.object({
  caption: z.string().min(1).max(5000),
  instructions: z.string().min(1).max(1000),
  platform: z
    .enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"])
    .optional(),
});

router.post(
  "/improve-caption",
  validateBody(improveCaptionSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof improveCaptionSchema>;

    sendSuccess(res, {
      caption: `[Improved] ${body.caption.slice(0, 100)}... (AI improvement: ${body.instructions})`,
      mock: true,
    });
  },
);

// ─── GET /api/ai/status ────────────────────────────────────────────────────────
router.get("/status", async (_req: Request, res: Response) => {
  const aiSetting = await prisma.setting.findUnique({ where: { key: "ai" } });
  const aiConfig = (aiSetting?.value as Record<string, unknown>) ?? {};
  const endpoint =
    (aiConfig.endpoint as string | undefined) ??
    process.env.LOCAL_AI_ENDPOINT ??
    "http://localhost:11434/v1";

  try {
    const pingRes = await fetch(`${endpoint}/models`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!pingRes.ok) throw new Error(`Status ${pingRes.status}`);
    const data = (await pingRes.json()) as { data?: unknown[] };
    sendSuccess(res, {
      connected: true,
      endpoint,
      models: data.data ?? [],
    });
  } catch {
    sendError(res, "AI_UNAVAILABLE", "AI endpoint unreachable", { endpoint }, 503);
  }
});

export default router;
