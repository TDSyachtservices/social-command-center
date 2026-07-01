import { Router, Request, Response } from "express";
import { z } from "zod";
import { validateQuery } from "../utils/validation.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

const router = Router();

const JAMENDO_API = "https://api.jamendo.com/v3.0";

const searchQuerySchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  limit: z.string().optional(),
});

export interface MusicTrack {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
  tags: string[];
  license: string;
  attribution: string;
}

/**
 * GET /api/music/search
 * Search royalty-free music via Jamendo API.
 * Requires JAMENDO_CLIENT_ID env var (free registration at developer.jamendo.com).
 */
router.get(
  "/search",
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof searchQuerySchema> }).validatedQuery;
    const limitNum = Math.min(50, Math.max(1, parseInt(q.limit ?? "18", 10) || 18));

    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) {
      sendError(res, "NOT_CONFIGURED",
        "Music search is not configured. Add JAMENDO_CLIENT_ID to your environment variables (free at developer.jamendo.com).",
        undefined, 503);
      return;
    }

    try {
      const url = new URL(`${JAMENDO_API}/tracks/`);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", String(limitNum));
      url.searchParams.set("include", "musicinfo");
      url.searchParams.set("audioformat", "mp32");
      url.searchParams.set("groupby", "artist_id");

      if (q.q) url.searchParams.set("namesearch", q.q);
      if (q.tags) url.searchParams.set("fuzzytags", q.tags);

      const apiRes = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
      if (!apiRes.ok) {
        logger.warn({ status: apiRes.status }, "Jamendo API error");
        sendError(res, "UPSTREAM_ERROR", `Jamendo API returned HTTP ${apiRes.status}`, undefined, 502);
        return;
      }

      const data = (await apiRes.json()) as {
        headers?: { status: string; code: number; error_message: string };
        results?: Array<{
          id: string;
          name: string;
          duration: number;
          artist_name: string;
          album_name: string;
          audio: string;
          audiodownload: string;
          image: string;
          musicinfo?: { tags?: { genres?: string[]; vartags?: string[] } };
          license_ccurl: string;
        }>;
      };

      if (data.headers?.status === "failed") {
        logger.warn({ code: data.headers.code, msg: data.headers.error_message }, "Jamendo API failure");
        sendError(res, "UPSTREAM_ERROR", data.headers.error_message, undefined, 502);
        return;
      }

      const tracks: MusicTrack[] = (data.results ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        artistName: t.artist_name,
        albumName: t.album_name,
        duration: t.duration,
        audioUrl: t.audiodownload || t.audio,
        imageUrl: t.image,
        tags: [
          ...(t.musicinfo?.tags?.genres ?? []),
          ...(t.musicinfo?.tags?.vartags ?? []),
        ],
        license: "CC (Jamendo)",
        attribution: `"${t.name}" by ${t.artist_name} — Jamendo`,
      }));

      sendSuccess(res, tracks);
    } catch (err) {
      logger.error({ err }, "Music search error");
      sendError(res, "INTERNAL_ERROR", "Music search failed", undefined, 500);
    }
  },
);

export default router;
