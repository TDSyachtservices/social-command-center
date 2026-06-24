import * as fs from "fs";

const OPENAI_BASE = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "").replace(/\/$/, "");
const OPENAI_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

export interface AiQualityResult {
  score: number;
  label: "Excellent" | "Good" | "Needs Review" | "Poor";
  reason: string;
}

/**
 * Ask GPT-4o to visually assess a cropped image for a specific platform placement.
 * Returns a structured quality label and a one-sentence explanation.
 *
 * Falls back to resolution-based heuristic if the AI endpoint is unavailable.
 */
export async function scoreVersionWithAi(
  imagePath: string,
  platform: string,
  placement: string,
  width: number,
  height: number,
): Promise<AiQualityResult> {
  if (!OPENAI_BASE || !OPENAI_KEY) {
    return { score: 0.5, label: "Needs Review", reason: "AI scoring unavailable — OpenAI not configured." };
  }

  let imageBase64: string;
  try {
    imageBase64 = fs.readFileSync(imagePath).toString("base64");
  } catch {
    return { score: 0.5, label: "Needs Review", reason: "Could not read image file for AI scoring." };
  }

  const prompt = `You are a social media image quality reviewer.

You are looking at a ${width}×${height}px cropped image intended for: ${platform} ${placement.replace(/_/g, " ")}.

Assess whether this crop looks good as a social media post image. Consider:
1. Is the main subject (person, product, logo) fully visible and not cut off?
2. Is the image sharp and not blurry?
3. Is the composition acceptable for ${platform} (right amount of visual breathing room, subject well-framed)?
4. Are there any obvious problems like a mostly blank/grey area, severe distortion, or key content cropped out?

Reply with ONLY valid JSON in this exact format (no markdown, no code fences):
{"label":"Excellent","score":0.95,"reason":"One sentence explanation."}

Label must be one of: "Excellent", "Good", "Needs Review", "Poor".
- Excellent: Composition is great, subject fully visible, sharp, ready to post
- Good: Minor imperfections but acceptable for posting
- Needs Review: Something notable is wrong — subject partially cut, notable distortion, or questionable crop
- Poor: Major problem — subject cut off, image is blank/grey, severely distorted`;

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
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
                image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "low" },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response — be tolerant of any surrounding whitespace
    const parsed = JSON.parse(raw.trim()) as {
      label?: string;
      score?: number;
      reason?: string;
    };

    const validLabels = ["Excellent", "Good", "Needs Review", "Poor"] as const;
    const label = validLabels.includes(parsed.label as typeof validLabels[number])
      ? (parsed.label as AiQualityResult["label"])
      : "Needs Review";
    const score = typeof parsed.score === "number" ? Math.min(1, Math.max(0, parsed.score)) : 0.5;
    const reason = typeof parsed.reason === "string" ? parsed.reason : "No explanation provided.";

    return { label, score, reason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Graceful degradation — don't block the upload if AI scoring fails
    return { score: 0.5, label: "Needs Review", reason: `AI scoring failed: ${msg.slice(0, 120)}` };
  }
}
