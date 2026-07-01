import { Router, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../utils/logger.js";

const getOpenAI = () =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

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

    const model = (aiConfig.model as string | undefined) ?? "gpt-4o-mini";
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
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model,
        max_completion_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0]?.message?.content ?? "";
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
  platform: z.string().max(200).optional(),
});

router.post(
  "/improve-caption",
  validateBody(improveCaptionSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof improveCaptionSchema>;

    const systemPrompt = `You are a social media copywriter for TDS Yacht Services, a marine decking and yacht services company.
Rewrite the provided caption according to the instructions given.
Keep the core message and key information intact.
Preserve any hashtags that were in the original unless instructed otherwise.
Keep a similar length unless the instructions say otherwise.
Return only the rewritten caption with no explanation, preamble, or quotes.`;

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              `Original caption:\n${body.caption}`,
              `Instructions: ${body.instructions}`,
              body.platform ? `Optimise for: ${body.platform}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      });
      const revised = completion.choices[0]?.message?.content?.trim() ?? body.caption;
      sendSuccess(res, { caption: revised, model: "gpt-4o-mini" });
    } catch (err) {
      logger.warn({ err }, "AI improve-caption failed");
      sendError(res, "AI_ERROR", "Failed to improve caption", undefined, 500);
    }
  },
);

// ─── POST /api/ai/generate-reply ──────────────────────────────────────────────
const generateReplySchema = z.object({
  commentText: z.string().min(1).max(5000),
  commenterName: z.string().max(200).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]).optional(),
  tone: z.enum(["professional", "friendly", "helpful", "sales", "technical"]).default("professional"),
  postTitle: z.string().max(500).optional(),
  postCaption: z.string().max(2000).optional(),
});

router.post(
  "/generate-reply",
  validateBody(generateReplySchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof generateReplySchema>;

    const toneInstructions: Record<string, string> = {
      professional: "professional and polished",
      friendly: "warm, friendly, and conversational",
      helpful: "helpful, informative, and solution-focused",
      sales: "sales-oriented, highlighting value and encouraging next steps",
      technical: "technical and detailed, showing expertise",
    };

    const systemPrompt = `You are a social media manager for TDS Yacht Services, a marine decking and yacht services company. 
Write concise, on-brand replies to customer comments on social media posts.
Tone: ${toneInstructions[body.tone] ?? "professional"}.
Keep replies under 150 words. Do not use hashtags. Do not be overly formal or use filler phrases like "I hope this message finds you well".
If relevant, you can mention contacting us at customerservice@teakdecking.com.`;

    const userPrompt = [
      body.postTitle ? `Post: "${body.postTitle}"` : null,
      body.postCaption ? `Post caption: "${body.postCaption}"` : null,
      `Comment: "${body.commentText}"`,
      `Write a reply to this comment.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 256,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const reply = completion.choices[0]?.message?.content?.trim() ?? "";
      sendSuccess(res, { reply, model: "gpt-4o-mini" });
    } catch (err) {
      logger.error({ err }, "AI generate-reply failed");
      sendError(res, "AI_ERROR", "Failed to generate reply", undefined, 500);
    }
  },
);

// ─── POST /api/ai/translate ────────────────────────────────────────────────────
const translateSchema = z.object({
  text: z.string().min(1).max(5000),
});

router.post(
  "/translate",
  validateBody(translateSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof translateSchema>;

    const systemPrompt = `You are a translation assistant.
Detect the language of the user-supplied text.
If it is already English, return it unchanged.
Reply with ONLY valid JSON (no markdown, no code fences):
{"detected":"<ISO 639-1 language name, e.g. Spanish>","translation":"<English translation>"}`;

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(raw) as { detected?: string; translation?: string };
      sendSuccess(res, {
        detected: parsed.detected ?? "Unknown",
        translation: parsed.translation ?? body.text,
      });
    } catch (err) {
      logger.warn({ err }, "AI translate failed");
      sendError(res, "AI_ERROR", "Translation failed", undefined, 500);
    }
  },
);

// ─── POST /api/ai/score-image ─────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const scoreImageSchema = z.object({
  imageUrl: z.string().url(),
  platform: z.string().min(1),
  placement: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

router.post(
  "/score-image",
  validateBody(scoreImageSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof scoreImageSchema>;

    let imageBase64: string;
    let mimeType = "image/jpeg";
    try {
      const imgRes = await fetch(body.imageUrl, {
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      });
      if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);

      const ct = imgRes.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) throw new Error(`Not an image: ${ct}`);

      const buf = await imgRes.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too large");

      if (ct.includes("png")) mimeType = "image/png";
      else if (ct.includes("webp")) mimeType = "image/webp";

      imageBase64 = Buffer.from(buf).toString("base64");
    } catch (err) {
      sendError(res, "IMAGE_FETCH_FAILED", `Could not fetch image: ${String(err).slice(0, 120)}`, undefined, 422);
      return;
    }

    const prompt = `You are a social media image quality reviewer.

You are looking at a ${body.width}×${body.height}px cropped image intended for: ${body.platform} ${body.placement.replace(/_/g, " ")}.

Assess whether this crop looks good as a social media post image. Consider:
1. Is the main subject (person, product, logo, boat, vessel) fully visible and not cut off?
2. Is the image sharp and in focus?
3. Is the composition acceptable for ${body.platform} (right breathing room, subject well-framed)?
4. Are there obvious problems — mostly blank/grey, severe distortion, key content cropped out?

Reply with ONLY valid JSON (no markdown, no code fences):
{"label":"Excellent","score":0.95,"reason":"One sentence explanation."}

Labels: "Excellent" (great, ready to post), "Good" (minor imperfections, acceptable), "Needs Review" (something notable wrong), "Poor" (major problem — subject cut off, blank image, severe distortion).`;

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(raw) as { label?: string; score?: number; reason?: string };

      const validLabels = ["Excellent", "Good", "Needs Review", "Poor"] as const;
      const label = validLabels.includes(parsed.label as (typeof validLabels)[number])
        ? (parsed.label as (typeof validLabels)[number])
        : "Needs Review";
      const score = typeof parsed.score === "number" ? Math.min(1, Math.max(0, parsed.score)) : 0.5;
      const reason = typeof parsed.reason === "string" ? parsed.reason : "No explanation provided.";

      sendSuccess(res, { label, score, reason });
    } catch (err) {
      logger.warn({ err }, "AI score-image failed");
      sendError(res, "AI_ERROR", "AI scoring failed", undefined, 500);
    }
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
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  sendSuccess(res, {
    connected: hasKey,
    endpoint: "https://api.openai.com/v1",
    models: hasKey ? ["gpt-4o-mini"] : [],
  });
});

export default router;
