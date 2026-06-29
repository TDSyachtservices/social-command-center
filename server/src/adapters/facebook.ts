import { logger } from "../utils/logger.js";

const GRAPH = "https://graph.facebook.com/v19.0";

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

// ─── Publishing ────────────────────────────────────────────────────────────────

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

/** Fetch the page's posts with comments embedded in one request.
 *  Uses /{pageId}/posts (page-created content only) which works with the
 *  page access token. /feed requires broader permissions and fails with #10. */
export async function getPageFeedWithComments(opts: {
  accessToken: string;
  pageId: string;
  limit?: number;
}): Promise<PagePostWithComments[]> {
  // Step 1: get posts (no embedded comments — we'll fetch comments directly per-post
  // because the direct /{post}/comments endpoint returns `from` when the nested query does not)
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

  // Step 2: fetch comments for each post directly (returns `from` more reliably)
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
  date: string; // YYYY-MM-DD
  value: number;
}

export interface PageInsights {
  followers: number;
  followerGrowth30d: number;
  reach30d: number;
  impressions30d: number;
  engagedUsers30d: number;
  engagementRate: number; // (engagedUsers30d / reach30d) * 100, or 0
  dailyReach: DailyDataPoint[];
  dailyImpressions: DailyDataPoint[];
  dailyEngaged: DailyDataPoint[];
}

/**
 * Fetch Facebook Page Insights for a given page over the last 30 days.
 * Requires the Page access token and the `read_insights` permission on the app.
 */
export async function getPageInsights(opts: {
  accessToken: string;
  pageId: string;
}): Promise<PageInsights> {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  // Batch request: fetch lifetime fans + daily metrics in parallel
  const dailyMetrics = [
    "page_fans_adds",
    "page_impressions_unique",
    "page_impressions",
    "page_engaged_users",
  ];

  const [fansRes, dailyRes] = await Promise.all([
    // page_fans is a lifetime metric (no since/until)
    fetch(
      `${GRAPH}/${opts.pageId}/insights/page_fans?period=lifetime&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
    fetch(
      `${GRAPH}/${opts.pageId}/insights?metric=${dailyMetrics.join(",")}&period=day&since=${since}&until=${until}&access_token=${opts.accessToken}`,
      { signal: AbortSignal.timeout(15_000) },
    ),
  ]);

  type InsightValue = { end_time: string; value: number };
  type InsightEntry = { name: string; values: InsightValue[] };

  const fansData = (await fansRes.json()) as {
    data?: InsightEntry[];
    error?: { message: string; code: number };
  };
  const dailyData = (await dailyRes.json()) as {
    data?: InsightEntry[];
    error?: { message: string; code: number };
  };

  if (fansData.error) {
    logger.warn({ pageId: opts.pageId, error: fansData.error }, "Facebook page_fans insights error");
  }
  if (dailyData.error) {
    logger.warn({ pageId: opts.pageId, error: dailyData.error }, "Facebook daily insights error");
  }

  // Current follower count — last value in the series
  const fansEntry = fansData.data?.[0];
  const followers = fansEntry?.values?.at(-1)?.value ?? 0;

  // Helper: pull a named metric's daily values
  const daily = (name: string): DailyDataPoint[] =>
    (dailyData.data?.find(d => d.name === name)?.values ?? []).map(v => ({
      date: v.end_time.slice(0, 10),
      value: v.value,
    }));

  const sum = (pts: DailyDataPoint[]) => pts.reduce((acc, p) => acc + p.value, 0);

  const dailyFansAdds = daily("page_fans_adds");
  const dailyReach = daily("page_impressions_unique");
  const dailyImpressions = daily("page_impressions");
  const dailyEngaged = daily("page_engaged_users");

  const followerGrowth30d = sum(dailyFansAdds);
  const reach30d = sum(dailyReach);
  const impressions30d = sum(dailyImpressions);
  const engagedUsers30d = sum(dailyEngaged);
  const engagementRate = reach30d > 0 ? Math.round((engagedUsers30d / reach30d) * 1000) / 10 : 0;

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
