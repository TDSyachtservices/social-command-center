import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

const GRAPH = "https://graph.facebook.com/v19.0";

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: false };
}

/**
 * Publish a single photo or video (Reel) to Instagram.
 *
 * Instagram publishing is a two-step process:
 *   1. Create a media container on /{ig-user-id}/media.
 *   2. Publish via /{ig-user-id}/media_publish.
 *
 * Text-only posts are not supported — media is mandatory.
 * For a video, media_type is set to REELS (standard IG video format).
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
  const ready = await waitForContainer(creationId, opts.accessToken, isVideo);
  if (!ready.ok) {
    return { success: false, errorMessage: ready.errorMessage, rawResponse: ready.raw };
  }

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
 * Instagram Carousel: multiple images (or videos) swiped as one post.
 * Steps:
 *   1. Create a container for each item with is_carousel_item=true.
 *   2. Create a parent CAROUSEL container referencing all child IDs.
 *   3. Publish the carousel container.
 */
export async function publishCarousel(opts: {
  accessToken: string;
  igUserId: string;
  caption: string;
  mediaItems: Array<{ url: string; type: "image" | "video" }>;
}): Promise<PublishResult> {
  if (opts.mediaItems.length < 2) {
    return { success: false, errorMessage: "Carousel requires at least 2 media items." };
  }
  if (opts.mediaItems.length > 10) {
    return { success: false, errorMessage: "Instagram carousel supports a maximum of 10 items." };
  }

  logger.info({ igUserId: opts.igUserId, count: opts.mediaItems.length }, "Creating Instagram carousel item containers");

  // Step 1: create a container for each item
  const childIds: string[] = [];
  for (const item of opts.mediaItems) {
    const body: Record<string, string> = {
      is_carousel_item: "true",
      access_token: opts.accessToken,
    };
    if (item.type === "video") {
      body.media_type = "VIDEO";
      body.video_url = item.url;
    } else {
      body.image_url = item.url;
    }

    const res = await fetch(`${GRAPH}/${opts.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || data.error || !data.id) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      logger.error({ igUserId: opts.igUserId, url: item.url, error: data.error }, "Carousel item container failed");
      return { success: false, errorMessage: `Carousel item upload failed: ${msg}`, rawResponse: data };
    }

    const ready = await waitForContainer(data.id, opts.accessToken, item.type === "video");
    if (!ready.ok) {
      return { success: false, errorMessage: `Carousel item processing failed: ${ready.errorMessage}` };
    }

    childIds.push(data.id);
  }

  // Step 2: create parent carousel container
  const carouselRes = await fetch(`${GRAPH}/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: opts.caption,
      access_token: opts.accessToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const carouselData = (await carouselRes.json()) as { id?: string; error?: { message: string } };

  if (!carouselRes.ok || carouselData.error || !carouselData.id) {
    const msg = carouselData.error?.message ?? `HTTP ${carouselRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: carouselData.error }, "Instagram carousel parent container failed");
    return { success: false, errorMessage: msg, rawResponse: carouselData };
  }

  const carouselId = carouselData.id;
  const carouselReady = await waitForContainer(carouselId, opts.accessToken, false);
  if (!carouselReady.ok) {
    return { success: false, errorMessage: `Carousel container not ready: ${carouselReady.errorMessage}` };
  }

  // Step 3: publish
  const publishRes = await fetch(`${GRAPH}/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselId, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(30_000),
  });
  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };

  if (!publishRes.ok || publishData.error || !publishData.id) {
    const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: publishData.error }, "Instagram carousel publish failed");
    return { success: false, errorMessage: msg, rawResponse: publishData };
  }

  logger.info({ igUserId: opts.igUserId, externalPostId: publishData.id, items: childIds.length }, "Instagram carousel published");
  return { success: true, externalPostId: publishData.id, rawResponse: publishData };
}

/**
 * Instagram Story: ephemeral 24h content.
 * Use media_type=STORIES for images; for videos use REELS with a short clip.
 */
export async function publishStory(opts: {
  accessToken: string;
  igUserId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
}): Promise<PublishResult> {
  logger.info({ igUserId: opts.igUserId, mediaType: opts.mediaType }, "Creating Instagram Story container");

  const createBody: Record<string, string> = {
    media_type: "STORIES",
    access_token: opts.accessToken,
  };
  if (opts.mediaType === "video") {
    createBody.video_url = opts.mediaUrl;
  } else {
    createBody.image_url = opts.mediaUrl;
  }

  const createRes = await fetch(`${GRAPH}/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
    signal: AbortSignal.timeout(30_000),
  });
  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };

  if (!createRes.ok || createData.error || !createData.id) {
    const msg = createData.error?.message ?? `HTTP ${createRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: createData.error }, "Instagram Story container failed");
    return { success: false, errorMessage: msg, rawResponse: createData };
  }

  const creationId = createData.id;
  const ready = await waitForContainer(creationId, opts.accessToken, opts.mediaType === "video");
  if (!ready.ok) {
    return { success: false, errorMessage: ready.errorMessage, rawResponse: ready.raw };
  }

  const publishRes = await fetch(`${GRAPH}/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(30_000),
  });
  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };

  if (!publishRes.ok || publishData.error || !publishData.id) {
    const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: publishData.error }, "Instagram Story publish failed");
    return { success: false, errorMessage: msg, rawResponse: publishData };
  }

  logger.info({ igUserId: opts.igUserId, externalPostId: publishData.id }, "Instagram Story published");
  return { success: true, externalPostId: publishData.id, rawResponse: publishData };
}

/**
 * Instagram Reel. The video must already have the desired audio baked in —
 * the Graph API does not accept external audio URLs or music library tracks.
 */
export async function publishReel(opts: {
  accessToken: string;
  igUserId: string;
  videoUrl: string;
  caption: string;
}): Promise<PublishResult> {
  const caption = opts.caption;

  logger.info({ igUserId: opts.igUserId }, "Creating Instagram Reel container");

  const createRes = await fetch(`${GRAPH}/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: opts.videoUrl,
      caption,
      access_token: opts.accessToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };

  if (!createRes.ok || createData.error || !createData.id) {
    const msg = createData.error?.message ?? `HTTP ${createRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: createData.error }, "Instagram Reel container failed");
    return { success: false, errorMessage: msg, rawResponse: createData };
  }

  const creationId = createData.id;
  const ready = await waitForContainer(creationId, opts.accessToken, true);
  if (!ready.ok) {
    return { success: false, errorMessage: ready.errorMessage, rawResponse: ready.raw };
  }

  const publishRes = await fetch(`${GRAPH}/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(30_000),
  });
  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };

  if (!publishRes.ok || publishData.error || !publishData.id) {
    const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
    logger.error({ igUserId: opts.igUserId, error: publishData.error }, "Instagram Reel publish failed");
    return { success: false, errorMessage: msg, rawResponse: publishData };
  }

  logger.info({ igUserId: opts.igUserId, externalPostId: publishData.id }, "Instagram Reel published");
  return { success: true, externalPostId: publishData.id, rawResponse: publishData };
}

/**
 * Poll a media container until it has finished processing.
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

// ─── Account Insights ─────────────────────────────────────────────────────────

export interface IgDailyDataPoint {
  date: string;
  value: number;
}

export interface IgInsights {
  followers: number;
  followerGrowth30d: number;
  reach30d: number;
  impressions30d: number;
  profileViews30d: number;
  dailyReach: IgDailyDataPoint[];
  dailyImpressions: IgDailyDataPoint[];
  dailyProfileViews: IgDailyDataPoint[];
}

/**
 * Fetch Instagram Business Account Insights for the past 30 days.
 * Requires the token to have `instagram_manage_insights` permission.
 *
 * Metrics fetched (v19.0 valid names):
 *   - reach              — unique accounts that saw any content
 *   - total_interactions — likes + comments + shares + saves (replaces deprecated `impressions`)
 *   - profile_views      — profile page visits
 *   - follower_count     — daily net follower change (sum = 30-day growth)
 */
export async function getIgInsights(opts: {
  accessToken: string;
  igUserId: string;
}): Promise<IgInsights> {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  // `impressions` removed in v19.0 — `total_interactions` is the valid replacement
  const metrics = ["reach", "total_interactions", "profile_views", "follower_count"].join(",");

  const [profileRes, insightsRes] = await Promise.all([
    fetch(
      `${GRAPH}/${opts.igUserId}?fields=followers_count&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
    fetch(
      `${GRAPH}/${opts.igUserId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
  ]);

  type InsightValue = { end_time: string; value: number };
  type InsightEntry = { name: string; values: InsightValue[] };

  const profileData = (await profileRes.json()) as {
    followers_count?: number;
    error?: { message: string; code: number };
  };
  const insightsData = (await insightsRes.json()) as {
    data?: InsightEntry[];
    error?: { message: string; code: number };
  };

  if (profileData.error) {
    logger.warn({ igUserId: opts.igUserId, error: profileData.error }, "Instagram profile fetch error");
  }
  if (insightsData.error) {
    logger.warn({ igUserId: opts.igUserId, error: insightsData.error }, "Instagram insights fetch error");
    throw new Error(insightsData.error.message);
  }

  const followers = profileData.followers_count ?? 0;

  const daily = (name: string): IgDailyDataPoint[] =>
    (insightsData.data?.find(d => d.name === name)?.values ?? []).map(v => ({
      date: v.end_time.slice(0, 10),
      value: v.value,
    }));

  const sum = (pts: IgDailyDataPoint[]) => pts.reduce((acc, p) => acc + p.value, 0);

  const dailyReach = daily("reach");
  const dailyImpressions = daily("total_interactions"); // was `impressions` pre-v19
  const dailyProfileViews = daily("profile_views");
  const dailyFollowerCount = daily("follower_count");

  return {
    followers,
    followerGrowth30d: sum(dailyFollowerCount),
    reach30d: sum(dailyReach),
    impressions30d: sum(dailyImpressions),
    profileViews30d: sum(dailyProfileViews),
    dailyReach,
    dailyImpressions,
    dailyProfileViews,
  };
}
