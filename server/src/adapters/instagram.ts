import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

const GRAPH = "https://graph.facebook.com/v19.0";

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: false };
}

// ─── Publishing ────────────────────────────────────────────────────────────────
// Instagram publishing is a two-step process:
//   1. Create a media container (returns container ID)
//   2. Publish the container

export async function publishPost(opts: {
  accessToken: string;
  igUserId: string;
  caption: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): Promise<PublishResult> {
  const { accessToken, igUserId, caption, mediaUrl, mediaType } = opts;

  try {
    // Step 1: create container
    const containerBody: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (mediaUrl && (mediaType === "image" || !mediaType)) {
      containerBody.image_url = mediaUrl;
      containerBody.media_type = "IMAGE";
    } else if (mediaUrl && mediaType === "video") {
      containerBody.video_url = mediaUrl;
      containerBody.media_type = "REELS";
    } else {
      // Text-only is not supported on Instagram — image is required
      logger.warn({ igUserId }, "Instagram requires an image or video; text-only posts not supported");
      return {
        success: false,
        errorMessage: "Instagram requires an image or video. Text-only posts are not supported.",
      };
    }

    const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
      signal: AbortSignal.timeout(30_000),
    });
    const containerData = (await containerRes.json()) as {
      id?: string;
      error?: { message: string; code: number };
    };

    if (!containerRes.ok || !containerData.id) {
      const msg = containerData.error?.message ?? `HTTP ${containerRes.status}`;
      logger.error({ igUserId, error: containerData.error }, "Instagram container creation failed");
      return { success: false, errorMessage: msg, rawResponse: containerData };
    }

    const containerId = containerData.id;
    logger.info({ igUserId, containerId }, "Instagram container created");

    // Step 2: publish container
    const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
      signal: AbortSignal.timeout(30_000),
    });
    const publishData = (await publishRes.json()) as {
      id?: string;
      error?: { message: string; code: number };
    };

    if (!publishRes.ok || !publishData.id) {
      const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
      logger.error({ igUserId, containerId, error: publishData.error }, "Instagram publish failed");
      return { success: false, errorMessage: msg, rawResponse: publishData };
    }

    logger.info({ igUserId, mediaId: publishData.id }, "Instagram publish success");
    return { success: true, externalPostId: publishData.id, rawResponse: publishData };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ igUserId, err }, "Instagram publishPost threw");
    return { success: false, errorMessage: msg };
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(opts: {
  accessToken: string;
  mediaId: string;
}): Promise<PlatformComment[]> {
  const { accessToken, mediaId } = opts;

  const url = new URL(`${GRAPH}/${mediaId}/comments`);
  url.searchParams.set("fields", "id,text,username,timestamp");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  const data = (await res.json()) as {
    data?: Array<{ id: string; text: string; username: string; timestamp: string }>;
    error?: { message: string };
  };

  if (data.error) {
    logger.warn({ mediaId, error: data.error }, "Instagram getComments error");
    return [];
  }

  return (data.data ?? []).map((c) => ({
    externalId: c.id,
    commenterName: c.username,
    text: c.text,
    timestamp: c.timestamp,
  }));
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  const { accessToken, commentId, message } = opts;

  const res = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as {
    id?: string;
    error?: { message: string; code: number };
  };

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    logger.error({ commentId, error: data.error }, "Instagram replyToComment failed");
    return { success: false, errorMessage: msg, rawResponse: data };
  }

  logger.info({ commentId, replyId: data.id }, "Instagram reply posted");
  return { success: true, externalPostId: data.id, rawResponse: data };
}

export async function instagramPublish(opts: Parameters<typeof publishPost>[0]): Promise<PublishResult> {
  return publishPost(opts);
}
export async function instagramGetComments(opts: Parameters<typeof getComments>[0]): Promise<PlatformComment[]> {
  return getComments(opts);
}
export async function instagramReplyToComment(opts: Parameters<typeof replyToComment>[0]): Promise<PublishResult> {
  return replyToComment(opts);
}
