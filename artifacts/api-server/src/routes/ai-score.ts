import { Router, type Request, type Response } from "express";
import { lookup } from "node:dns/promises";
import { logger } from "../lib/logger";

const router = Router();

const OPENAI_BASE = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "").replace(/\/$/, "");
const OPENAI_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

// Cap the image we'll buffer + base64 into the vision request (defends memory/DoS).
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

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

// ─── SSRF guards ──────────────────────────────────────────────────────────────
// This endpoint fetches a caller-supplied URL server-side, which is a classic
// SSRF vector. We restrict it to https, an optional host allowlist, and refuse
// any host that resolves to a private/internal/link-local address (which is what
// cloud metadata endpoints like 169.254.169.254 live on).

function ipToLong(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0] << 24) >>> 0) + ((p[1] << 16) >>> 0) + ((p[2] << 8) >>> 0) + (p[3] >>> 0);
}

function isPrivateIpv4(ip: string): boolean {
  const long = ipToLong(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipToLong(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||
    inRange("10.0.0.0", 8) ||
    inRange("100.64.0.0", 10) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.0.0.0", 24) ||
    inRange("192.168.0.0", 16) ||
    inRange("198.18.0.0", 15) ||
    inRange("224.0.0.0", 4) ||
    inRange("240.0.0.0", 4)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::") return true;
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local fc00::/7
  if (/^fe[89ab]/.test(addr)) return true; // link-local fe80::/10
  return false;
}

function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIpv6(ip) : isPrivateIpv4(ip);
}

async function assertSafeImageUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (url.protocol !== "https:") throw new Error("Image URL must use https");

  const allowed = (process.env.MEDIA_ALLOWED_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(url.hostname.toLowerCase())) {
    throw new Error("Image host not allowed");
  }

  const resolved = await lookup(url.hostname, { all: true });
  if (resolved.length === 0) throw new Error("Could not resolve image host");
  for (const { address } of resolved) {
    if (isPrivateIp(address)) throw new Error("Image host resolves to a private address");
  }
  return url;
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

  let safeUrl: URL;
  try {
    safeUrl = await assertSafeImageUrl(imageUrl);
  } catch (err) {
    res.status(400).json({
      error: `Rejected image URL: ${String(err instanceof Error ? err.message : err).slice(0, 120)}`,
    });
    return;
  }

  let imageBase64: string;
  let mimeType = "image/jpeg";
  try {
    const imgRes = await fetch(safeUrl, { signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);

    // Only accept images, and cap the size before buffering to avoid pulling an
    // arbitrary large/non-image body into memory (DoS).
    const ct = imgRes.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) throw new Error(`Not an image (content-type: ${ct || "unknown"})`);
    const declaredLen = Number(imgRes.headers.get("content-length") ?? "0");
    if (declaredLen > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (${declaredLen} bytes, max ${MAX_IMAGE_BYTES})`);
    }
    if (ct.includes("png")) mimeType = "image/png";
    else if (ct.includes("webp")) mimeType = "image/webp";

    const buf = await imgRes.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (${buf.byteLength} bytes, max ${MAX_IMAGE_BYTES})`);
    }
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

// ─── POST /api/ai/generate-reply ─────────────────────────────────────────────
// Runs on the Replit server so it has access to AI_INTEGRATIONS_OPENAI_BASE_URL.
// The frontend calls this via a relative URL to bypass the Railway server entirely.
interface GenerateReplyBody {
  commentText: string;
  tone?: string;
  postTitle?: string;
  postCaption?: string;
}

router.post("/generate-reply", async (req: Request, res: Response) => {
  const body = req.body as Partial<GenerateReplyBody>;

  if (!body.commentText) {
    res.status(400).json({ success: false, error: "commentText is required" });
    return;
  }

  if (!OPENAI_BASE || !OPENAI_KEY) {
    res.status(503).json({ success: false, error: "OpenAI integration not configured" });
    return;
  }

  const toneMap: Record<string, string> = {
    professional: "professional and polished",
    friendly: "warm, friendly, and conversational",
    helpful: "helpful, informative, and solution-focused",
    sales: "sales-oriented, highlighting value and encouraging next steps",
    technical: "technical and detailed, showing expertise",
  };

  const tone = body.tone ?? "professional";
  const toneDesc = toneMap[tone] ?? "professional and polished";

  const systemPrompt = `You are a social media manager for TDS Yacht Services, a marine decking and yacht services company.
Write concise, on-brand replies to customer comments on social media posts.
Tone: ${toneDesc}.
Keep replies under 150 words. Do not use hashtags. Do not use filler phrases like "I hope this message finds you well".
If relevant, you can mention contacting us at customerservice@teakdecking.com.`;

  const lines: string[] = [];
  if (body.postTitle) lines.push(`Post: "${body.postTitle}"`);
  if (body.postCaption) lines.push(`Post caption: "${body.postCaption}"`);
  lines.push(`Comment: "${body.commentText}"`);
  lines.push("Write a reply to this comment.");
  const userPrompt = lines.join("\n");

  try {
    const aiRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_completion_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    res.json({ success: true, data: { reply } });
  } catch (err) {
    logger.warn({ err }, "AI generate-reply failed");
    res.status(500).json({ success: false, error: "Failed to generate reply" });
  }
});

// ─── POST /api/ai/translate ───────────────────────────────────────────────────
// Detects the language of commentText and returns an English translation.
// Returns { detected, translation } — if already English, translation === commentText.
interface TranslateBody {
  text: string;
}

router.post("/translate", async (req: Request, res: Response) => {
  const body = req.body as Partial<TranslateBody>;
  if (!body.text?.trim()) {
    res.status(400).json({ success: false, error: "text is required" });
    return;
  }
  if (!OPENAI_BASE || !OPENAI_KEY) {
    res.status(503).json({ success: false, error: "OpenAI integration not configured" });
    return;
  }

  const systemPrompt = `You are a translation assistant.
Detect the language of the user-supplied text.
If it is already English, return it unchanged.
Reply with ONLY valid JSON (no markdown, no code fences):
{"detected":"<ISO 639-1 language name, e.g. Spanish>","translation":"<English translation>"}`;

  try {
    const aiRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      throw new Error(`OpenAI ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw) as { detected?: string; translation?: string };
    res.json({ success: true, data: { detected: parsed.detected ?? "Unknown", translation: parsed.translation ?? body.text } });
  } catch (err) {
    logger.warn({ err }, "AI translate failed");
    res.status(500).json({ success: false, error: "Translation failed" });
  }
});

export default router;
