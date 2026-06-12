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

// ─── POST /api/ai/generate-reply ──────────────────────────────────────────────
const generateReplySchema = z.object({
  commentText: z.string().min(1).max(5000),
  commenterName: z.string().max(200).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]).optional(),
  tone: z.enum(["professional", "friendly", "empathetic", "apologetic"]).default("professional"),
  additionalContext: z.string().max(1000).optional(),
});

router.post(
  "/generate-reply",
  validateBody(generateReplySchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof generateReplySchema>;

    const mockReply =
      `Thank you for your comment${body.commenterName ? `, ${body.commenterName}` : ""}! ` +
      `We appreciate your feedback. Our team will get back to you shortly. ` +
      `Feel free to reach out at sales@marinedeckingco.com for more information. ⚓`;

    sendSuccess(res, { reply: mockReply, model: "mock", mock: true });
  },
);

// ─── POST /api/ai/analyze-comment ─────────────────────────────────────────────
const analyzeCommentSchema = z.object({
  commentText: z.string().min(1).max(5000),
  commenterName: z.string().max(200).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]).optional(),
});

router.post(
  "/analyze-comment",
  validateBody(analyzeCommentSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof analyzeCommentSchema>;
    const text = body.commentText.toLowerCase();

    const isSalesLead = text.includes("price") || text.includes("quote") || text.includes("buy") || text.includes("purchase") || text.includes("cost");
    const isNegative = text.includes("bad") || text.includes("terrible") || text.includes("worst") || text.includes("awful");
    const isQuestion = text.includes("?") || text.includes("how") || text.includes("when") || text.includes("where");

    sendSuccess(res, {
      sentiment: isNegative ? "negative" : isSalesLead ? "positive" : "neutral",
      priority: isSalesLead ? "SALES_OPPORTUNITY" : isNegative ? "HIGH" : "NORMAL",
      isSalesLead,
      isQuestion,
      suggestedAction: isSalesLead
        ? "Follow up with pricing information"
        : isNegative
        ? "Acknowledge concern and offer resolution"
        : "Reply with helpful information",
      model: "mock",
      mock: true,
    });
  },
);

// ─── POST /api/ai/create-website-draft ────────────────────────────────────────
const createWebsiteDraftSchema = z.object({
  postTitle: z.string().min(1).max(300),
  masterCaption: z.string().max(5000).optional(),
  seoKeywords: z.array(z.string()).max(10).optional(),
  tone: z.enum(["professional", "casual", "educational", "promotional"]).default("professional"),
});

router.post(
  "/create-website-draft",
  validateBody(createWebsiteDraftSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createWebsiteDraftSchema>;

    const draft = {
      title: body.postTitle,
      metaTitle: `${body.postTitle} | Marine Decking Co`,
      metaDescription: body.masterCaption
        ? body.masterCaption.slice(0, 160)
        : `${body.postTitle} — Marine Decking Co, premium marine deck solutions.`,
      slug: body.postTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      bodyHtml: `<h1>${body.postTitle}</h1>\n<p>${body.masterCaption ?? "Content coming soon."}</p>`,
      keywords: body.seoKeywords ?? [],
    };

    sendSuccess(res, { draft, model: "mock", mock: true });
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
