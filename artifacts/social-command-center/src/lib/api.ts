/**
 * API client for the Social Command Center backend.
 *
 * All functions attempt to fetch from VITE_API_BASE_URL first.
 * If the backend is unreachable (network error or non-2xx) they fall back
 * to the local mock-data files so the frontend stays functional in
 * development without a running backend.
 */

import { mockPosts } from "@/data/mockPosts";
import { mockComments } from "@/data/mockComments";
import { mockAccounts } from "@/data/mockAccounts";
import { mockPublishLogs, mockCommentLogs } from "@/data/mockLogs";
import { mockSettings } from "@/data/mockSettings";
import { mockMediaAssets } from "@/data/mockMedia";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiResponse<T> = { success: true; data: T; meta?: Record<string, unknown> } | { success: false; error: { code: string; message: string } };

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
}): Promise<ApiPost[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const result = await apiFetch<ApiPost[]>(`/api/posts?${qs}`);
  if (result.ok) return result.data;

  // Fallback: map frontend mock data
  return mockPosts
    .filter((p) => !params?.status || params.status === "all" || p.status === params.status)
    .map((p) => ({
      id: p.id,
      title: p.title,
      masterCaption: p.masterCaption ?? "",
      status: p.status.toUpperCase(),
      scheduledAt: p.scheduledAt ?? null,
      publishedAt: null,
      mediaUrl: p.mediaUrl ?? null,
      mediaType: p.mediaType ?? null,
      platforms: p.platforms.map((pl) => ({ platform: pl.toUpperCase(), status: p.status.toUpperCase(), accountId: "" })),
      createdAt: p.createdAt ?? new Date().toISOString(),
      updatedAt: p.updatedAt ?? new Date().toISOString(),
    }));
}

export async function getPost(id: string): Promise<ApiPost | null> {
  const result = await apiFetch<ApiPost>(`/api/posts/${id}`);
  if (result.ok) return result.data;
  const found = mockPosts.find((p) => p.id === id);
  return found
    ? { id: found.id, title: found.title, masterCaption: found.masterCaption ?? "", status: found.status.toUpperCase(), scheduledAt: found.scheduledAt ?? null, publishedAt: null, mediaUrl: found.mediaUrl ?? null, mediaType: found.mediaType ?? null, platforms: found.platforms.map((pl) => ({ platform: pl.toUpperCase(), status: found.status.toUpperCase(), accountId: "" })), createdAt: found.createdAt ?? new Date().toISOString(), updatedAt: found.updatedAt ?? new Date().toISOString() }
    : null;
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

export async function updatePost(id: string, body: Partial<Parameters<typeof createPost>[0]>): Promise<ApiPost | null> {
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

export async function listAccounts(): Promise<ApiAccount[]> {
  const result = await apiFetch<ApiAccount[]>("/api/accounts");
  if (result.ok) return result.data;

  return mockAccounts.map((a) => ({
    id: a.id,
    platform: a.platform.toUpperCase(),
    accountName: a.accountName,
    accountId: a.accountId,
    connectionStatus: a.connectionStatus,
    lastSync: a.lastSync ?? null,
    postingCapability: a.postingCapability,
    commentReadCapability: a.commentReadCapability,
    commentReplyCapability: a.commentReplyCapability,
    moderationCapability: a.moderationCapability,
    scopes: [],
    tokenExpiresAt: null,
  }));
}

export async function disconnectAccount(id: string): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/accounts/${id}/disconnect`, { method: "POST" });
  return result.ok;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export async function publishNow(postId: string): Promise<boolean> {
  const result = await apiFetch<{ queued: boolean }>("/api/scheduler/publish-now", {
    method: "POST",
    body: JSON.stringify({ postId }),
  });
  return result.ok;
}

export async function schedulePost(postId: string, scheduledAt: string): Promise<boolean> {
  const result = await apiFetch<unknown>("/api/scheduler/schedule", {
    method: "POST",
    body: JSON.stringify({ postId, scheduledAt }),
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

export async function getSchedulerQueue(): Promise<ApiPost[]> {
  const result = await apiFetch<ApiPost[]>("/api/scheduler/queue");
  if (result.ok) return result.data;
  return mockPosts.filter((p) => p.status === "scheduled").map((p) => ({
    id: p.id, title: p.title, masterCaption: "", status: "SCHEDULED",
    scheduledAt: p.scheduledAt ?? null, publishedAt: null, mediaUrl: null, mediaType: null,
    platforms: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));
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
}): Promise<ApiComment[]> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status.toUpperCase());
  if (params?.platform) qs.set("platform", params.platform.toUpperCase());
  if (params?.priority) qs.set("priority", params.priority.toUpperCase());
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const result = await apiFetch<ApiComment[]>(`/api/inbox?${qs}`);
  if (result.ok) return result.data;

  return mockComments
    .filter((c) => !params?.status || params.status === "all" || c.status === params.status)
    .map((c) => ({
      id: c.id,
      platform: c.platform.toUpperCase(),
      accountName: c.accountName ?? "",
      commenterName: c.commenterName,
      commenterHandle: c.commenterHandle ?? null,
      commentText: c.commentText,
      originalPostTitle: c.originalPostTitle ?? null,
      status: c.status.toUpperCase(),
      priority: (c.priority ?? "NORMAL").toUpperCase(),
      replyCount: c.replyCount ?? 0,
      assignedUser: c.assignedUser ?? null,
      timestamp: c.timestamp,
      replies: [],
      notes: [],
    }));
}

export async function updateComment(id: string, body: { status?: string; priority?: string; assignedUser?: string | null }): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
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

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function listPublishLogs(params?: { status?: string; platform?: string; page?: number }): Promise<typeof mockPublishLogs> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<typeof mockPublishLogs>(`/api/logs/publish?${qs}`);
  return result.ok ? result.data : mockPublishLogs;
}

export async function listCommentLogs(params?: { status?: string; platform?: string; page?: number }): Promise<typeof mockCommentLogs> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<typeof mockCommentLogs>(`/api/logs/comment?${qs}`);
  return result.ok ? result.data : mockCommentLogs;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<typeof mockSettings> {
  const result = await apiFetch<typeof mockSettings>("/api/settings");
  return result.ok ? result.data : mockSettings;
}

export async function updateSettings(key: string, value: unknown): Promise<boolean> {
  const result = await apiFetch<unknown>(`/api/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  return result.ok;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export async function listMedia(params?: { type?: string; page?: number }): Promise<typeof mockMediaAssets> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page) qs.set("page", String(params.page));

  const result = await apiFetch<typeof mockMediaAssets>(`/api/media?${qs}`);
  return result.ok ? result.data : mockMediaAssets;
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

export async function getAiStatus(): Promise<{ connected: boolean; endpoint?: string; models?: unknown[] } | null> {
  const result = await apiFetch<{ connected: boolean; endpoint?: string; models?: unknown[] }>("/api/ai/status");
  return result.ok ? result.data : null;
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ ok: boolean; db?: string }> {
  const result = await apiFetch<{ status: string; db: string }>("/api/health");
  return result.ok ? { ok: true, db: result.data.db } : { ok: false };
}
