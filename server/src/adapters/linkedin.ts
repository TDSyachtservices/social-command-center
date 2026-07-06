import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

const LI_API = "https://api.linkedin.com/v2";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LinkedInProfile {
  id: string;       // urn sub (e.g. "abc123") — the member ID portion
  name: string;
  email?: string;
  picture?: string;
}

export interface LinkedInOrganization {
  urn: string;      // urn:li:organization:123456
  id: string;       // numeric string "123456"
  name: string;
}

export interface LinkedInFollowerStats {
  totalFollowers: number;
}

// ─── Capabilities ──────────────────────────────────────────────────────────────

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: false, moderation: false };
}

// ─── Profile ───────────────────────────────────────────────────────────────────

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(`${LI_API}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`LinkedIn userinfo failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    picture?: string;
  };
  return {
    id: data.sub,
    name: data.name ?? ([data.given_name, data.family_name].filter(Boolean).join(" ") || "LinkedIn User"),
    email: data.email,
    picture: data.picture,
  };
}

// ─── Organizations ─────────────────────────────────────────────────────────────

/**
 * Returns Company Pages where the authenticated member is an ADMINISTRATOR.
 * Requires r_organization_social / rw_organization_admin scope.
 * Returns empty array if the scope isn't granted (graceful fallback to member-only account).
 */
export async function getAdminOrganizations(accessToken: string): Promise<LinkedInOrganization[]> {
  const url = new URL(`${LI_API}/organizationAcls`);
  url.searchParams.set("q", "roleAssignee");
  url.searchParams.set("role", "ADMINISTRATOR");
  url.searchParams.set("state", "APPROVED");
  url.searchParams.set("projection", "(elements*(organizationAcl*(organization~(id,localizedName))))");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    // 403 = scope not granted; 400 = org features not available on this app — treat as no orgs
    const text = await res.text().catch(() => res.statusText);
    logger.warn({ status: res.status, body: text }, "LinkedIn org ACL fetch failed — no org accounts");
    return [];
  }

  type AclElement = {
    organizationAcl?: {
      organization?: string;
      "organization~"?: { id?: number; localizedName?: string };
    };
  };
  const data = (await res.json()) as { elements?: AclElement[] };

  const orgs: LinkedInOrganization[] = [];
  for (const el of data.elements ?? []) {
    const acl = el.organizationAcl;
    if (!acl) continue;
    const urn = acl.organization;
    const detail = acl["organization~"];
    if (!urn || !detail?.id) continue;
    orgs.push({
      urn,
      id: String(detail.id),
      name: detail.localizedName ?? `Organization ${detail.id}`,
    });
  }
  return orgs;
}

// ─── Follower stats ────────────────────────────────────────────────────────────

export async function getOrganizationFollowerStats(
  accessToken: string,
  orgUrn: string,
): Promise<LinkedInFollowerStats> {
  const url = new URL(`${LI_API}/organizationalEntityFollowerStatistics`);
  url.searchParams.set("q", "organizationalEntity");
  url.searchParams.set("organizationalEntity", orgUrn);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    logger.warn({ orgUrn, status: res.status, body: text }, "LinkedIn follower stats unavailable");
    return { totalFollowers: 0 };
  }

  type StatsResponse = {
    elements?: Array<{ totalFollowerCounts?: { count?: number } }>;
  };
  const data = (await res.json()) as StatsResponse;
  const count = data.elements?.[0]?.totalFollowerCounts?.count ?? 0;
  return { totalFollowers: count };
}

// ─── Publish ───────────────────────────────────────────────────────────────────

/**
 * Publishes a UGC post to LinkedIn as either an organization page or a member.
 * authorUrn: "urn:li:organization:{id}"  or  "urn:li:person:{memberId}"
 */
export async function publishPost(opts: {
  accessToken: string;
  authorUrn: string;
  text: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  type UgcPost = {
    author: string;
    lifecycleState: string;
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: string };
        shareMediaCategory: string;
        media?: Array<{
          status: string;
          originalUrl: string;
          title?: { text: string };
        }>;
      };
    };
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": string };
  };

  const shareMedia: UgcPost["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] =
    opts.mediaUrl
      ? [{ status: "READY", originalUrl: opts.mediaUrl, title: { text: "Media" } }]
      : undefined;

  const body: UgcPost = {
    author: opts.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: opts.text },
        shareMediaCategory: opts.mediaUrl ? "ARTICLE" : "NONE",
        ...(shareMedia ? { media: shareMedia } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    logger.error({ status: res.status, body: text, authorUrn: opts.authorUrn }, "LinkedIn publish failed");
    return { success: false, errorMessage: `LinkedIn API error (${res.status}): ${text}` };
  }

  const postUrn = res.headers.get("x-restli-id") ?? `li_${Date.now()}`;
  logger.info({ postUrn, authorUrn: opts.authorUrn }, "LinkedIn post published");
  return { success: true, externalPostId: postUrn, rawResponse: { postUrn } };
}

// ─── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(opts: {
  accessToken: string;
  shareUrn: string;
}): Promise<PlatformComment[]> {
  const url = new URL(`${LI_API}/socialActions/${encodeURIComponent(opts.shareUrn)}/comments`);
  url.searchParams.set("count", "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    logger.warn({ shareUrn: opts.shareUrn, status: res.status }, "LinkedIn getComments failed");
    return [];
  }

  type LiComment = {
    id?: string;
    message?: { text?: string };
    actor?: string;
    created?: { time?: number };
  };
  const data = (await res.json()) as { elements?: LiComment[] };

  return (data.elements ?? []).map(c => ({
    externalId: c.id ?? `li_comment_${Date.now()}`,
    commenterName: c.actor ?? "LinkedIn User",
    text: c.message?.text ?? "",
    timestamp: c.created?.time ? new Date(c.created.time).toISOString() : new Date().toISOString(),
  }));
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn({ commentId: opts.commentId }, "LinkedIn replyToComment — not supported via public API");
  return { success: false, errorMessage: "LinkedIn comment replies are not available via the public API" };
}

// ─── Legacy aliases (used by publish routes) ───────────────────────────────────

export async function linkedinPublish(opts: {
  accessToken: string;
  organizationId: string;
  text: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  return publishPost({
    accessToken: opts.accessToken,
    authorUrn: `urn:li:organization:${opts.organizationId}`,
    text: opts.text,
    mediaUrl: opts.mediaUrl,
  });
}

export async function linkedinGetComments(
  opts: Parameters<typeof getComments>[0],
): Promise<PlatformComment[]> {
  return getComments(opts);
}
