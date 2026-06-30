import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

const GRAPH = "https://graph.facebook.com/v19.0";

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: false };
}

/**
 * Publish a post to Instagram via the Graph API content-publishing flow.
 *
 * Instagram publishing is a two-step, MEDIA-REQUIRED process:
 *   1. Create a media container on /{ig-user-id}/media (image_url or video_url + caption).
 *   2. Publish that container on /{ig-user-id}/media_publish (creation_id).
 *
 * Unlike Facebook, Instagram CANNOT publish a text-only post — an image or
 * video is mandatory, and the media URL must be publicly reachable because
 * Instagram fetches it server-side. The access token is the Page token linked
 * to the IG Business account, and the node is the IG user id (account.accountId).
 */
export async function publishPost(opts: {
  accessToken: string;
  igUserId: string;
  caption: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): Promise<PublishResult> {
  if (!opts.mediaUrl) {
    return {
      success: false,
      errorMessage:
        "Instagram requires an image or video — text-only posts aren't supported. Attach media for this platform.",
    };
  }

  const isVideo = opts.mediaType === "video";

  // ── Step 1: create the media container ────────────────────────────────────
  const createBody: Record<string, string> = {
    caption: opts.caption,
    access_token: opts.accessToken,
  };
  if (isVideo) {
    createBody.media_type = "REELS";
    createBody.video_url = opts.mediaUrl;
  } else {
    createBody.image_url = opts.mediaUrl;
  }

  logger.info({ igUserId: opts.igUserId, isVideo }, "Creating Instagram media container");

  const createRes = await fetch(`${GRAPH}/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
    signal: AbortSignal.timeout(30_000),
  });
  const createData = (await createRes.json()) as {
    id?: string;
    error?: { message: string; code: number };
  };

  if (!createRes.ok || createData.error || !createData.id) {
    const msg = createData.error?.message ?? `HTTP ${createRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: createData.error }, "Instagram container creation failed");
    return { success: false, errorMessage: msg, rawResponse: createData };
  }

  const creationId = createData.id;

  // ── Step 2: wait for the container to finish processing ───────────────────
  // Images are usually ready immediately; videos (Reels) need transcoding.
  const ready = await waitForContainer(creationId, opts.accessToken, isVideo);
  if (!ready.ok) {
    return { success: false, errorMessage: ready.errorMessage, rawResponse: ready.raw };
  }

  // ── Step 3: publish the container ─────────────────────────────────────────
  logger.info({ igUserId: opts.igUserId, creationId }, "Publishing Instagram media container");

  const publishRes = await fetch(`${GRAPH}/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(30_000),
  });
  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message: string; code: number };
  };

  if (!publishRes.ok || publishData.error || !publishData.id) {
    const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: publishData.error }, "Instagram publish failed");
    return { success: false, errorMessage: msg, rawResponse: publishData };
  }

  logger.info({ igUserId: opts.igUserId, externalPostId: publishData.id }, "Instagram publish success");
  return { success: true, externalPostId: publishData.id, rawResponse: publishData };
}

/**
 * Poll a media container until it has finished processing. Images finish almost
 * instantly; Reels/videos can take several seconds to transcode.
 */
async function waitForContainer(
  creationId: string,
  accessToken: string,
  isVideo: boolean,
): Promise<{ ok: true } | { ok: false; errorMessage: string; raw?: unknown }> {
  const maxAttempts = isVideo ? 20 : 6;
  const delayMs = isVideo ? 3_000 : 1_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = new URL(`${GRAPH}/${creationId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json()) as {
      status_code?: string;
      status?: string;
      error?: { message: string };
    };

    if (data.error) {
      return { ok: false, errorMessage: data.error.message, raw: data };
    }
    if (data.status_code === "FINISHED") return { ok: true };
    if (data.status_code === "ERROR") {
      return {
        ok: false,
        errorMessage: data.status ?? "Instagram could not process the media (check format/size/aspect ratio).",
        raw: data,
      };
    }

    // IN_PROGRESS — wait and retry.
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return {
    ok: false,
    errorMessage: "Instagram media processing timed out. Try a smaller or differently-formatted image/video.",
  };
}

// ─── Comments ──────────────────────────────────────────────────────────────────

export interface IgMedia {
  externalPostId: string;
  caption: string;
  createdTime: string;
}

export interface IgMediaWithComments extends IgMedia {
  comments: PlatformComment[];
}

/** Fetch the IG Business account's media, with top-level comments embedded per item. */
export async function getMediaWithComments(opts: {
  accessToken: string;
  igUserId: string;
  limit?: number;
}): Promise<IgMediaWithComments[]> {
  const mediaUrl = new URL(`${GRAPH}/${opts.igUserId}/media`);
  mediaUrl.searchParams.set("access_token", opts.accessToken);
  mediaUrl.searchParams.set("fields", "id,caption,timestamp");
  mediaUrl.searchParams.set("limit", String(opts.limit ?? 50));

  const mediaRes = await fetch(mediaUrl.toString(), { signal: AbortSignal.timeout(20_000) });
  const mediaData = (await mediaRes.json()) as {
    data?: Array<{ id: string; caption?: string; timestamp: string }>;
    error?: { message: string; code: number };
  };

  if (mediaData.error) {
    logger.warn({ igUserId: opts.igUserId, error: mediaData.error }, "Instagram getMediaWithComments error");
    return [];
  }

  const results: IgMediaWithComments[] = [];

  for (const item of mediaData.data ?? []) {
    const comments = await getComments({ accessToken: opts.accessToken, postId: item.id });
    results.push({
      externalPostId: item.id,
      caption: item.caption ?? "",
      createdTime: item.timestamp,
      comments,
    });
  }

  return results;
}

export async function getComments(opts: {
  accessToken: string;
  postId: string;
}): Promise<PlatformComment[]> {
  const url = new URL(`${GRAPH}/${opts.postId}/comments`);
  url.searchParams.set("access_token", opts.accessToken);
  url.searchParams.set("fields", "id,text,username,timestamp");
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  const data = (await res.json()) as {
    data?: Array<{ id: string; text: string; username?: string; timestamp: string }>;
    error?: { message: string; code: number; type: string };
  };

  if (data.error) {
    logger.warn({ postId: opts.postId, igError: data.error }, "Instagram getComments error");
    return [];
  }

  return (data.data ?? []).map((c) => ({
    externalId: c.id,
    commenterName: c.username ? `@${c.username}` : "Instagram User",
    text: c.text,
    timestamp: c.timestamp,
  }));
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  // Instagram replies are posted to /{ig-comment-id}/replies, not /{comment}/comments like Facebook.
  const res = await fetch(`${GRAPH}/${opts.commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: opts.message, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || data.error) {
    logger.warn({ commentId: opts.commentId, igError: data.error }, "Instagram replyToComment error");
    return { success: false, errorMessage: data.error?.message ?? `HTTP ${res.status}` };
  }
  return { success: true, externalPostId: data.id };
}
