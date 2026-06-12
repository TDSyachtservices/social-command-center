/**
 * API client for the Social Command Center backend.
 *
 * All functions attempt to fetch from VITE_API_BASE_URL first.
 * On success they return typed data.
 * On failure (network error, non-2xx, or VITE_API_BASE_URL not set) they
 * return null — callers are responsible for falling back to mock data.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string } };

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; ok: true } | { ok: false; error: string }> {
  if (!BASE_URL) return { ok: false, error: "VITE_API_BASE_URL not set" };

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
      ...options,
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      const msg = json.success ? "Non-2xx response" : json.error.message;
      return { ok: false, error: msg };
    }

    return { ok: true, data: (json as { success: true; data: T }).data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface ApiPost {
  id: string;
  title: string;
  masterCaption: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  platforms: Array<{ platform: string; status: string; accountId: string }>;
  createdAt: string;
  updatedAt: string;
}

export async function listPosts(params?: {
  status?: string;
  platform?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<ApiPost[] | null> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const result = await apiFetch<ApiPost[]>(`/api/posts?${qs}`);
  return result.ok ? result.data : null;
}

export async function getPost(id: string): Promise<ApiPost | null> {
  const result = await apiFetch<ApiPost>(`/api/posts/${id}`);
  return result.ok ? result.data : null;
}

export async function createPost(body: {
  title: string;
  masterCaption: string;
  platforms: string[];
  accountIds: string[];
  status?: string;
  scheduledAt?: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<ApiPost | null> {
  const result = await apiFetch<ApiPost>("/api/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function updatePost(
  id: string,
  body: Partial<Parameters<typeof createPost>[0]>,
): Promise<ApiPost | null> {
  const result = await apiFetch<ApiPost>(`/api/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await apiFetch<{ deleted: boolean }>(`/api/posts/${id}`, { method: "DELETE" });
  return result.ok && result.data.deleted;
}

export async function retryPost(id: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/posts/${id}/retry`, { method: "POST" });
  return result.ok;
}

export async function schedulePost(postId: string, scheduledAt: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/posts/${postId}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduledAt }),
  });
  return result.ok;
}

export async function publishPost(postId: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/posts/${postId}/publish`, { method: "POST" });
  return result.ok;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export interface ApiAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  connectionStatus: string;
  lastSync: string | null;
  postingCapability: boolean;
  commentReadCapability: boolean;
  commentReplyCapability: boolean;
  moderationCapability: boolean;
  scopes: string[];
  tokenExpiresAt: string | null;
}

export async function listAccounts(): Promise<ApiAccount[] | null> {
  const result = await apiFetch<ApiAccount[]>("/api/accounts");
  return result.ok ? result.data : null;
}

export async function getAccount(id: string): Promise<ApiAccount | null> {
  const result = await apiFetch<ApiAccount>(`/api/accounts/${id}`);
  return result.ok ? result.data : null;
}

export async function connectAccountMock(body: {
  platform: string;
  accountName: string;
  accountId: string;
}): Promise<ApiAccount | null> {
  const result = await apiFetch<ApiAccount>("/api/accounts/connect-mock", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function disconnectAccount(id: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/accounts/${id}/disconnect`, { method: "POST" });
  return result.ok;
}

export async function checkAccount(id: string): Promise<{ status: string; expiresAt?: string } | null> {
  const result = await apiFetch<{ status: string; expiresAt?: string }>(`/api/accounts/${id}/check`);
  return result.ok ? result.data : null;
}

export async function getAccountCapabilities(id: string): Promise<{
  posting: boolean;
  commentRead: boolean;
  commentReply: boolean;
  moderation: boolean;
} | null> {
  const result = await apiFetch<{
    posting: boolean;
    commentRead: boolean;
    commentReply: boolean;
    moderation: boolean;
  }>(`/api/accounts/${id}/capabilities`);
  return result.ok ? result.data : null;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export async function publishNow(postId: string): Promise<boolean> {
  const result = await apiFetch<{ queued: boolean }>("/api/scheduler/publish-now", {
    method: "POST",
    body: JSON.stringify({ postId }),
  });
  return result.ok;
}

export async function cancelSchedule(postId: string): Promise<boolean> {
  const result = await apiFetch<unknown>("/api/scheduler/cancel", {
    method: "POST",
    body: JSON.stringify({ postId }),
  });
  return result.ok;
}

export async function getSchedulerQueue(): Promise<ApiPost[] | null> {
  const result = await apiFetch<ApiPost[]>("/api/scheduler/queue");
  return result.ok ? result.data : null;
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export interface ApiComment {
  id: string;
  platform: string;
  accountName: string;
  commenterName: string;
  commenterHandle: string | null;
  commentText: string;
  originalPostTitle: string | null;
  status: string;
  priority: string;
  replyCount: number;
  assignedUser: string | null;
  timestamp: string;
  replies: Array<{ id: string; replyText: string; sentBy: string | null; sentAt: string; status: string }>;
  notes: Array<{ id: string; noteText: string; createdBy: string | null; createdAt: string }>;
}

export async function listComments(params?: {
  status?: string;
  platform?: string;
  priority?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<ApiComment[] | null> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status.toUpperCase());
  if (params?.platform) qs.set("platform", params.platform.toUpperCase());
  if (params?.priority) qs.set("priority", params.priority.toUpperCase());
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const result = await apiFetch<ApiComment[]>(`/api/inbox?${qs}`);
  return result.ok ? result.data : null;
}

export async function getComment(id: string): Promise<ApiComment | null> {
  const result = await apiFetch<ApiComment>(`/api/inbox/${id}`);
  return result.ok ? result.data : null;
}

export async function updateComment(
  id: string,
  body: { status?: string; priority?: string; assignedUser?: string | null },
): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return result.ok;
}

export async function hideComment(id: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${id}/hide`, { method: "PATCH" });
  return result.ok;
}

export async function assignComment(id: string, assignedUser: string | null): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assignedUser }),
  });
  return result.ok;
}

export async function sendReply(commentId: string, replyText: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${commentId}/replies`, {
    method: "POST",
    body: JSON.stringify({ replyText }),
  });
  return result.ok;
}

export async function addNote(commentId: string, noteText: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${commentId}/notes`, {
    method: "POST",
    body: JSON.stringify({ noteText }),
  });
  return result.ok;
}

export async function triggerSyncMock(): Promise<{ synced: number } | null> {
  const result = await apiFetch<{ synced: number }>("/api/inbox/sync-mock", { method: "POST" });
  return result.ok ? result.data : null;
}

export async function getInboxSyncLogs(): Promise<unknown[] | null> {
  const result = await apiFetch<unknown[]>("/api/inbox/sync-logs");
  return result.ok ? result.data : null;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export interface ApiPublishLog {
  id: string;
  postTitle: string;
  platform: string;
  action: string;
  status: string;
  timestamp: string;
  errorMessage: string | null;
  externalPostId: string | null;
}

export async function listPublishLogs(params?: {
  status?: string;
  platform?: string;
  page?: number;
}): Promise<ApiPublishLog[] | null> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<ApiPublishLog[]>(`/api/logs/publish?${qs}`);
  return result.ok ? result.data : null;
}

export async function listCommentLogs(params?: {
  status?: string;
  platform?: string;
  page?: number;
}): Promise<unknown[] | null> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<unknown[]>(`/api/logs/comment?${qs}`);
  return result.ok ? result.data : null;
}

export async function listAuditLogs(params?: {
  page?: number;
}): Promise<unknown[] | null> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<unknown[]>(`/api/logs/audit?${qs}`);
  return result.ok ? result.data : null;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface ApiSettings {
  [key: string]: unknown;
}

export async function getSettings(): Promise<ApiSettings | null> {
  const result = await apiFetch<ApiSettings>("/api/settings");
  return result.ok ? result.data : null;
}

export async function updateSettings(key: string, value: unknown): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  return result.ok;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface ApiMediaAsset {
  id: string;
  originalFileName: string;
  originalFileType: string;
  originalMimeType: string;
  originalSizeBytes: number;
  originalWidth: number | null;
  originalHeight: number | null;
  processingStatus: string;
  validationStatus: string;
  createdAt: string;
}

export async function listMedia(params?: {
  type?: string;
  page?: number;
}): Promise<ApiMediaAsset[] | null> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<ApiMediaAsset[]>(`/api/media?${qs}`);
  return result.ok ? result.data : null;
}

export async function getMediaAsset(id: string): Promise<ApiMediaAsset | null> {
  const result = await apiFetch<ApiMediaAsset>(`/api/media/${id}`);
  return result.ok ? result.data : null;
}

export async function getMediaVersions(id: string): Promise<unknown[] | null> {
  const result = await apiFetch<unknown[]>(`/api/media/${id}/versions`);
  return result.ok ? result.data : null;
}

export async function processMedia(assetId: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/media/${assetId}/process`, { method: "POST" });
  return result.ok;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export async function generateCaption(body: {
  postTitle: string;
  platforms: string[];
  tone?: string;
  additionalContext?: string;
}): Promise<{ caption: string; mock?: boolean } | null> {
  const result = await apiFetch<{ caption: string; mock?: boolean }>("/api/ai/generate-caption", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function generateReply(body: {
  commentText: string;
  commenterName: string;
  platform: string;
  tone?: string;
}): Promise<{ reply: string; mock?: boolean } | null> {
  const result = await apiFetch<{ reply: string; mock?: boolean }>("/api/ai/generate-reply", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function analyzeComment(body: {
  commentText: string;
  platform: string;
}): Promise<{
  sentiment: string;
  priority: string;
  category: string;
  suggestedAction: string;
  mock?: boolean;
} | null> {
  const result = await apiFetch<{
    sentiment: string;
    priority: string;
    category: string;
    suggestedAction: string;
    mock?: boolean;
  }>("/api/ai/analyze-comment", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function createWebsiteDraft(body: {
  postTitle: string;
  caption: string;
  tone?: string;
}): Promise<{ draft: string; mock?: boolean } | null> {
  const result = await apiFetch<{ draft: string; mock?: boolean }>("/api/ai/create-website-draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.ok ? result.data : null;
}

export async function getAiStatus(): Promise<{
  connected: boolean;
  endpoint?: string;
  models?: unknown[];
} | null> {
  const result = await apiFetch<{ connected: boolean; endpoint?: string; models?: unknown[] }>(
    "/api/ai/status",
  );
  return result.ok ? result.data : null;
}

// ─── Website ──────────────────────────────────────────────────────────────────

export async function getWebsiteStatus(): Promise<{ connected: boolean; endpoint?: string } | null> {
  const result = await apiFetch<{ connected: boolean; endpoint?: string }>("/api/website/status");
  return result.ok ? result.data : null;
}

export async function listWebsiteDrafts(): Promise<unknown[] | null> {
  const result = await apiFetch<unknown[]>("/api/website/drafts");
  return result.ok ? result.data : null;
}

export async function publishWebsiteDraft(postId: string): Promise<boolean> {
  const result = await apiFetch<unknown>("/api/website/publish", {
    method: "POST",
    body: JSON.stringify({ postId }),
  });
  return result.ok;
}

export async function getWebsiteSyncLogs(): Promise<unknown[] | null> {
  const result = await apiFetch<unknown[]>("/api/website/sync-logs");
  return result.ok ? result.data : null;
}

// ─── Health check ─────────────────────────────────────────────────────────────

// Health endpoint returns the direct { status, db } shape (not the success envelope).
export async function checkHealth(): Promise<{ ok: boolean; db?: string }> {
  if (!BASE_URL) return { ok: false };
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { status: string; db: string };
    return { ok: json.status === "ok", db: json.db };
  } catch {
    return { ok: false };
  }
}
