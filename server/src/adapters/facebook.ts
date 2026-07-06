import { logger } from "../utils/logger.js";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface PlatformCapabilities {
  posting: boolean;
  commentRead: boolean;
  commentReply: boolean;
  moderation: boolean;
}

export interface PlatformComment {
  externalId: string;
  commenterName: string;
  text: string;
  timestamp: string;
}

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: true };
}

// ─── OAuth helpers ─────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_CLIENT_ID and META_CLIENT_SECRET must be set");
  }
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!data.access_token) {
    throw new Error(`Facebook token exchange failed: ${data.error?.message ?? "no access_token in response"}`);
  }
  return data.access_token;
}

export async function getLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_CLIENT_ID and META_CLIENT_SECRET must be set");
  }
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
  if (!data.access_token) {
    throw new Error(`Long-lived token exchange failed: ${data.error?.message ?? "no access_token"}`);
  }
  return { token: data.access_token, expiresIn: data.expires_in ?? 5_184_000 };
}

export async function getGrantedPermissions(userToken: string): Promise<string[]> {
  const url = new URL(`${GRAPH}/me/permissions`);
  url.searchParams.set("access_token", userToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    data?: Array<{ permission: string; status: string }>;
    error?: { message: string };
  };
  if (!data.data) {
    logger.warn({ error: data.error }, "Could not fetch granted permissions");
    return [];
  }
  return data.data.filter((p) => p.status === "granted").map((p) => p.permission);
}

export async function getPages(userToken: string): Promise<Array<{
  id: string;
  name: string;
  access_token: string;
  category: string;
}>> {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("access_token", userToken);
  url.searchParams.set("fields", "id,name,access_token,category");

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    data?: Array<{ id: string; name: string; access_token: string; category: string }>;
    error?: { message: string };
  };
  if (!data.data) {
    throw new Error(`Could not fetch pages: ${data.error?.message ?? "no data"}`);
  }
  return data.data;
}

// Returns the Instagram Business Account linked to a Facebook Page, or null if none.
export async function getInstagramAccountForPage(
  pageId: string,
  pageToken: string,
): Promise<{ id: string; name: string; username?: string } | null> {
  const url = new URL(`${GRAPH}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account{id,name,username}");
  url.searchParams.set("access_token", pageToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    instagram_business_account?: { id: string; name?: string; username?: string };
    error?: { message: string };
  };

  if (data.error) {
    logger.warn({ pageId, error: data.error }, "Could not fetch Instagram account for page");
    return null;
  }
  if (!data.instagram_business_account) return null;

  const iga = data.instagram_business_account;
  return {
    id: iga.id,
    name: iga.name ?? iga.username ?? iga.id,
    username: iga.username,
  };
}

// ─── Publishing ────────────────────────────────────────────────────────────────

/** Standard post: text-only, single photo, single video, or link. */
export async function publishPost(opts: {
  accessToken: string;
  pageId: string;
  message: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): Promise<PublishResult> {
  let endpoint: string;
  let body: Record<string, string>;

  if (opts.mediaUrl && opts.mediaType === "image") {
    endpoint = `${GRAPH}/${opts.pageId}/photos`;
    body = { url: opts.mediaUrl, caption: opts.message, access_token: opts.accessToken };
  } else if (opts.mediaUrl && opts.mediaType === "video") {
    endpoint = `${GRAPH}/${opts.pageId}/videos`;
    body = { file_url: opts.mediaUrl, description: opts.message, access_token: opts.accessToken };
  } else {
    endpoint = `${GRAPH}/${opts.pageId}/feed`;
    body = { message: opts.message, access_token: opts.accessToken };
    if (opts.mediaUrl) body.link = opts.mediaUrl;
  }

  logger.info({ pageId: opts.pageId, endpoint }, "Posting to Facebook");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json()) as { id?: string; error?: { message: string; code: number } };

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    logger.error({ pageId: opts.pageId, error: data.error }, "Facebook publish failed");
    return { success: false, errorMessage: msg, rawResponse: data };
  }

  logger.info({ pageId: opts.pageId, externalPostId: data.id }, "Facebook publish success");
  return { success: true, externalPostId: data.id, rawResponse: data };
}

/**
 * Photo Album: upload each image as unpublished, then create a feed post
 * attaching all photos as a multi-image album.
 * Requires pages_manage_posts permission.
 */
export async function publishAlbum(opts: {
  accessToken: string;
  pageId: string;
  message: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  if (opts.mediaUrls.length < 2) {
    return { success: false, errorMessage: "Album requires at least 2 images." };
  }

  logger.info({ pageId: opts.pageId, count: opts.mediaUrls.length }, "Uploading album photos to Facebook");

  // Step 1: upload each photo as unpublished to get photo IDs
  const photoIds: string[] = [];
  for (const url of opts.mediaUrls) {
    const res = await fetch(`${GRAPH}/${opts.pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, published: false, access_token: opts.accessToken }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || data.error || !data.id) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      logger.error({ pageId: opts.pageId, url, error: data.error }, "Facebook album photo upload failed");
      return { success: false, errorMessage: `Photo upload failed: ${msg}`, rawResponse: data };
    }
    photoIds.push(data.id);
  }

  // Step 2: create feed post attaching all photos
  const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
  const feedRes = await fetch(`${GRAPH}/${opts.pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: opts.message,
      attached_media: attachedMedia,
      access_token: opts.accessToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const feedData = (await feedRes.json()) as { id?: string; error?: { message: string } };

  if (!feedRes.ok || feedData.error || !feedData.id) {
    const msg = feedData.error?.message ?? `HTTP ${feedRes.status}`;
    logger.error({ pageId: opts.pageId, error: feedData.error }, "Facebook album feed post failed");
    return { success: false, errorMessage: msg, rawResponse: feedData };
  }

  logger.info({ pageId: opts.pageId, externalPostId: feedData.id, photos: photoIds.length }, "Facebook album published");
  return { success: true, externalPostId: feedData.id, rawResponse: feedData };
}

/**
 * Facebook Story: publish a photo or short video (≤ 20s) as a Page story.
 * Requires pages_manage_posts + pages_read_engagement.
 */
export async function publishStory(opts: {
  accessToken: string;
  pageId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
}): Promise<PublishResult> {
  logger.info({ pageId: opts.pageId, mediaType: opts.mediaType }, "Publishing Facebook Story");

  // Step 1: upload the media to get a photo/video ID
  let mediaId: string;
  if (opts.mediaType === "video") {
    const uploadRes = await fetch(`${GRAPH}/${opts.pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: opts.mediaUrl,
        published: false,
        access_token: opts.accessToken,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const uploadData = (await uploadRes.json()) as { id?: string; error?: { message: string } };
    if (!uploadRes.ok || uploadData.error || !uploadData.id) {
      const msg = uploadData.error?.message ?? `HTTP ${uploadRes.status}`;
      return { success: false, errorMessage: `Story video upload failed: ${msg}`, rawResponse: uploadData };
    }
    mediaId = uploadData.id;
  } else {
    const uploadRes = await fetch(`${GRAPH}/${opts.pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: opts.mediaUrl,
        published: false,
        access_token: opts.accessToken,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const uploadData = (await uploadRes.json()) as { id?: string; error?: { message: string } };
    if (!uploadRes.ok || uploadData.error || !uploadData.id) {
      const msg = uploadData.error?.message ?? `HTTP ${uploadRes.status}`;
      return { success: false, errorMessage: `Story photo upload failed: ${msg}`, rawResponse: uploadData };
    }
    mediaId = uploadData.id;
  }

  // Step 2: create the story
  const storyBody: Record<string, unknown> = { access_token: opts.accessToken };
  if (opts.mediaType === "video") {
    storyBody.video_id = mediaId;
  } else {
    storyBody.photo_ids = [mediaId];
  }

  const storyRes = await fetch(`${GRAPH}/${opts.pageId}/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(storyBody),
    signal: AbortSignal.timeout(30_000),
  });
  const storyData = (await storyRes.json()) as { id?: string; error?: { message: string } };

  if (!storyRes.ok || storyData.error || !storyData.id) {
    const msg = storyData.error?.message ?? `HTTP ${storyRes.status}`;
    logger.error({ pageId: opts.pageId, error: storyData.error }, "Facebook Story publish failed");
    return { success: false, errorMessage: msg, rawResponse: storyData };
  }

  logger.info({ pageId: opts.pageId, externalPostId: storyData.id }, "Facebook Story published");
  return { success: true, externalPostId: storyData.id, rawResponse: storyData };
}

/**
 * Facebook Reel: initialize upload → post via video_reels endpoint.
 * The video URL must be publicly accessible for server-side fetch.
 * Requires pages_manage_posts + pages_read_engagement.
 */
export async function publishReel(opts: {
  accessToken: string;
  pageId: string;
  videoUrl: string;
  description: string;
}): Promise<PublishResult> {
  logger.info({ pageId: opts.pageId }, "Publishing Facebook Reel");

  // Step 1: initialize the Reels upload session
  const initRes = await fetch(`${GRAPH}/${opts.pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "start",
      access_token: opts.accessToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const initData = (await initRes.json()) as {
    video_id?: string;
    upload_url?: string;
    error?: { message: string };
  };

  if (!initRes.ok || initData.error || !initData.video_id || !initData.upload_url) {
    const msg = initData.error?.message ?? `HTTP ${initRes.status}`;
    logger.error({ pageId: opts.pageId, error: initData.error }, "Facebook Reel init failed");
    return { success: false, errorMessage: `Reel upload init failed: ${msg}`, rawResponse: initData };
  }

  const { video_id: videoId, upload_url: uploadUrl } = initData;

  // Step 2: download the video and upload its bytes to Facebook's upload URL
  let videoBuffer: Buffer;
  try {
    const videoRes = await fetch(opts.videoUrl, { signal: AbortSignal.timeout(120_000) });
    if (!videoRes.ok) {
      return { success: false, errorMessage: `Could not download video from URL: HTTP ${videoRes.status}` };
    }
    videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return { success: false, errorMessage: `Could not download reel video: ${msg}` };
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `OAuth ${opts.accessToken}`,
      "offset": "0",
      "file_size": String(videoBuffer.byteLength),
      "Content-Type": "application/octet-stream",
    },
    body: videoBuffer,
    signal: AbortSignal.timeout(120_000),
  });
  const uploadData = (await uploadRes.json()) as { success?: boolean; error?: { message: string } };

  if (!uploadRes.ok || uploadData.error || !uploadData.success) {
    const msg = uploadData.error?.message ?? `HTTP ${uploadRes.status}`;
    logger.error({ pageId: opts.pageId, error: uploadData.error }, "Facebook Reel byte upload failed");
    return { success: false, errorMessage: `Reel upload failed: ${msg}`, rawResponse: uploadData };
  }

  // Step 3: publish the reel
  const publishRes = await fetch(`${GRAPH}/${opts.pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_id: videoId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
      description: opts.description,
      access_token: opts.accessToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const publishData = (await publishRes.json()) as { success?: boolean; error?: { message: string } };

  if (!publishRes.ok || publishData.error || publishData.success === false) {
    const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
    logger.error({ pageId: opts.pageId, error: publishData.error }, "Facebook Reel publish failed");
    return { success: false, errorMessage: msg, rawResponse: publishData };
  }

  logger.info({ pageId: opts.pageId, videoId }, "Facebook Reel published");
  return { success: true, externalPostId: videoId, rawResponse: publishData };
}

/**
 * Facebook Event: create a Page event with name, start/end time, location, and description.
 * Requires pages_manage_events (or pages_manage_posts on newer apps) permission.
 */
export async function publishEvent(opts: {
  accessToken: string;
  pageId: string;
  name: string;
  description: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  coverImageUrl?: string | null;
}): Promise<PublishResult> {
  logger.info({ pageId: opts.pageId, eventName: opts.name }, "Creating Facebook Event");

  const body: Record<string, string> = {
    name: opts.name,
    description: opts.description,
    start_time: opts.startTime,
    access_token: opts.accessToken,
  };
  if (opts.endTime) body.end_time = opts.endTime;
  if (opts.location) body.location = opts.location;
  if (opts.coverImageUrl) body.cover = opts.coverImageUrl;

  const res = await fetch(`${GRAPH}/${opts.pageId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json()) as { id?: string; error?: { message: string; code: number } };

  if (!res.ok || data.error || !data.id) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    logger.error({ pageId: opts.pageId, error: data.error }, "Facebook Event creation failed");
    return { success: false, errorMessage: msg, rawResponse: data };
  }

  logger.info({ pageId: opts.pageId, eventId: data.id }, "Facebook Event created");
  return { success: true, externalPostId: data.id, rawResponse: data };
}

// ─── Page feed ─────────────────────────────────────────────────────────────────

export interface PagePost {
  externalPostId: string;
  message: string;
  createdTime: string;
}

export interface PagePostWithComments extends PagePost {
  comments: PlatformComment[];
}

export async function getPagePosts(opts: {
  accessToken: string;
  pageId: string;
  limit?: number;
}): Promise<PagePost[]> {
  const url = new URL(`${GRAPH}/${opts.pageId}/posts`);
  url.searchParams.set("access_token", opts.accessToken);
  url.searchParams.set("fields", "id,message,created_time");
  url.searchParams.set("limit", String(opts.limit ?? 50));

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  const data = (await res.json()) as {
    data?: Array<{ id: string; message?: string; created_time: string }>;
    error?: { message: string };
  };

  if (data.error) {
    logger.warn({ pageId: opts.pageId, error: data.error.message }, "Facebook getPagePosts error");
    return [];
  }

  return (data.data ?? []).map((p) => ({
    externalPostId: p.id,
    message: p.message ?? "",
    createdTime: p.created_time,
  }));
}

/** Fetch the page's posts with comments embedded in one request. */
export async function getPageFeedWithComments(opts: {
  accessToken: string;
  pageId: string;
  limit?: number;
}): Promise<PagePostWithComments[]> {
  const postsUrl = new URL(`${GRAPH}/${opts.pageId}/posts`);
  postsUrl.searchParams.set("access_token", opts.accessToken);
  postsUrl.searchParams.set("fields", "id,message,created_time");
  postsUrl.searchParams.set("limit", String(opts.limit ?? 50));

  const postsRes = await fetch(postsUrl.toString(), { signal: AbortSignal.timeout(20_000) });
  const postsData = (await postsRes.json()) as {
    data?: Array<{ id: string; message?: string; created_time: string }>;
    error?: { message: string; code: number };
  };

  if (postsData.error) {
    logger.warn({ pageId: opts.pageId, fbError: postsData.error }, "Facebook getPageFeedWithComments error");
    return [];
  }

  const results: PagePostWithComments[] = [];

  for (const post of postsData.data ?? []) {
    const commentsUrl = new URL(`${GRAPH}/${post.id}/comments`);
    commentsUrl.searchParams.set("access_token", opts.accessToken);
    commentsUrl.searchParams.set("fields", "id,message,created_time");
    commentsUrl.searchParams.set("limit", "100");

    const commentsRes = await fetch(commentsUrl.toString(), { signal: AbortSignal.timeout(15_000) });
    const commentsData = (await commentsRes.json()) as {
      data?: Array<{ id: string; message: string; created_time: string }>;
      error?: { message: string; code: number };
    };

    if (commentsData.error) {
      logger.warn({ postId: post.id, fbError: commentsData.error }, "Facebook getComments error");
    }

    results.push({
      externalPostId: post.id,
      message: post.message ?? "",
      createdTime: post.created_time,
      comments: (commentsData.data ?? []).map((c) => ({
        externalId: c.id,
        commenterName: "Facebook User",
        text: c.message,
        timestamp: c.created_time,
      })),
    });
  }

  return results;
}

// ─── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(opts: {
  accessToken: string;
  postId: string;
}): Promise<PlatformComment[]> {
  const url = new URL(`${GRAPH}/${opts.postId}/comments`);
  url.searchParams.set("access_token", opts.accessToken);
  url.searchParams.set("fields", "id,message,created_time");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  const data = (await res.json()) as {
    data?: Array<{ id: string; message: string; created_time: string }>;
    error?: { message: string; code: number; type: string };
  };

  if (data.error) {
    logger.warn({ postId: opts.postId, fbError: data.error }, "Facebook getComments error");
    return [];
  }

  return (data.data ?? []).map((c) => ({
    externalId: c.id,
    commenterName: "Facebook User",
    text: c.message,
    timestamp: c.created_time,
  }));
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  const res = await fetch(`${GRAPH}/${opts.commentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: opts.message, access_token: opts.accessToken }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || data.error) {
    return { success: false, errorMessage: data.error?.message ?? `HTTP ${res.status}` };
  }
  return { success: true, externalPostId: data.id };
}

export const facebookPublish = publishPost;
export const facebookGetComments = getComments;
export const facebookReplyToComment = replyToComment;

// ─── Page Insights ─────────────────────────────────────────────────────────────

export interface DailyDataPoint {
  date: string;
  value: number;
}

export interface PageInsights {
  followers: number;
  followerGrowth30d: number;
  reach30d: number;
  impressions30d: number;
  engagedUsers30d: number;
  engagementRate: number;
  dailyReach: DailyDataPoint[];
  dailyImpressions: DailyDataPoint[];
  dailyEngaged: DailyDataPoint[];
}

export async function getPageInsights(opts: {
  accessToken: string;
  pageId: string;
}): Promise<PageInsights> {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  // page_impressions_unique + page_engaged_users deprecated June 2026.
  // page_impressions (total views) + page_post_engagements are the safest available v21 metrics.
  const dailyMetrics = [
    "page_impressions",
    "page_post_engagements",
  ];

  const [pageRes, dailyRes] = await Promise.all([
    // fan_count from the Page object is more reliable than the deprecated page_fans insights metric
    fetch(
      `${GRAPH}/${opts.pageId}?fields=fan_count,followers_count&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
    fetch(
      `${GRAPH}/${opts.pageId}/insights?metric=${dailyMetrics.join(",")}&period=day&since=${since}&until=${until}&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
  ]);

  type InsightValue = { end_time: string; value: number };
  type InsightEntry = { name: string; values: InsightValue[] };

  const pageData = (await pageRes.json()) as {
    fan_count?: number;
    followers_count?: number;
    error?: { message: string; code: number };
  };
  const dailyData = (await dailyRes.json()) as {
    data?: InsightEntry[];
    error?: { message: string; code: number };
  };

  if (pageData.error) {
    logger.warn({ pageId: opts.pageId, error: pageData.error }, "Facebook page fields error");
    throw new Error(pageData.error.message);
  }
  if (dailyData.error) {
    logger.warn({ pageId: opts.pageId, error: dailyData.error }, "Facebook daily insights error");
    throw new Error(
      dailyData.error.code === 10 || dailyData.error.code === 200
        ? "The stored token doesn't have read_insights permission — reconnect Facebook to grant it"
        : dailyData.error.message,
    );
  }

  // If daily data came back empty, the token is missing read_insights
  if (!dailyData.data?.length) {
    throw new Error(
      "No insights data returned — the token likely lacks read_insights permission. Reconnect Facebook to fix this.",
    );
  }

  const followers = pageData.fan_count ?? pageData.followers_count ?? 0;

  const daily = (name: string): DailyDataPoint[] =>
    (dailyData.data?.find(d => d.name === name)?.values ?? []).map(v => ({
      date: v.end_time.slice(0, 10),
      value: v.value,
    }));

  const sum = (pts: DailyDataPoint[]) => pts.reduce((acc, p) => acc + p.value, 0);

  const dailyImpressions = daily("page_impressions");
  const dailyEngaged = daily("page_post_engagements");
  const dailyReach = dailyImpressions;

  const followerGrowth30d = 0;
  const impressions30d = sum(dailyImpressions);
  const reach30d = impressions30d;
  const engagedUsers30d = sum(dailyEngaged);
  const engagementRate = impressions30d > 0 ? Math.round((engagedUsers30d / impressions30d) * 1000) / 10 : 0;

  return {
    followers,
    followerGrowth30d,
    reach30d,
    impressions30d,
    engagedUsers30d,
    engagementRate,
    dailyReach,
    dailyImpressions,
    dailyEngaged,
  };
}
