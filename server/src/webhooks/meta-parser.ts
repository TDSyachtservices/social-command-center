/**
 * Meta webhook payload normalizer.
 *
 * Converts raw Graph API "changes" entries and Messenger "messaging" events
 * into a platform-agnostic NotificationInput that webhook.routes.ts persists.
 */

export interface NotificationInput {
  type: string;
  title: string;
  externalId: string | null;
  body?: string;
  occurredAt: Date;
}

// ─── Changes (entry.changes[]) ────────────────────────────────────────────────

interface MetaChange {
  field: string;
  value: Record<string, unknown>;
}

export function parseChange(
  platform: string,
  change: MetaChange,
): NotificationInput | null {
  const field = change.field;
  const value = change.value ?? {};

  const ts = value.published_time ?? value.created_time ?? value.timestamp;
  const occurredAt = typeof ts === "number" ? new Date(ts * 1000) : new Date();

  // ── Facebook feed / posts ──────────────────────────────────────────────────
  if (field === "feed" || field === "posts") {
    return parseFeedChange(value, occurredAt);
  }

  // ── Instagram comments ─────────────────────────────────────────────────────
  if (field === "comments") {
    const commentId = value.id as string | undefined;
    const text = value.text as string | undefined;
    const fromUsername = (value.from as { username?: string } | undefined)?.username;
    return {
      type: "comment",
      externalId: commentId ?? null,
      title: `New comment${fromUsername ? ` from @${fromUsername}` : ""}`,
      body: text,
      occurredAt,
    };
  }

  // ── Mentions (Instagram caption / comment mention) ─────────────────────────
  if (field === "mentions" || field === "mention") {
    const mediaId = value.media_id as string | undefined;
    const commentId = value.comment_id as string | undefined;
    const message = value.message as string | undefined;
    return {
      type: "mention",
      externalId: commentId ?? mediaId ?? null,
      title: "Your account was mentioned",
      body: message,
      occurredAt,
    };
  }

  // ── Facebook message_reactions (changes subscription field) ───────────────
  if (field === "message_reactions") {
    const mid = value.mid as string | undefined;
    const reaction = value.reaction as string | undefined;
    return {
      type: "reaction",
      externalId: mid ?? null,
      title: `New ${reaction ?? "reaction"} on a message`,
      occurredAt,
    };
  }

  // ── Facebook ratings (e.g. star ratings on a business page) ──────────────
  if (field === "ratings") {
    const reviewId = value.review_id as string | undefined;
    const rating = value.rating as number | undefined;
    const reviewerName = value.reviewer_name as string | undefined;
    return {
      type: "rating",
      externalId: reviewId ?? null,
      title: `New ${rating ? `${rating}-star ` : ""}rating${reviewerName ? ` from ${reviewerName}` : ""}`,
      body: value.review_text as string | undefined,
      occurredAt,
    };
  }

  // ── Facebook messages (Graph API change subscription, rare) ───────────────
  if (field === "messages") {
    const mid = value.mid as string | undefined;
    const text = value.message as string | undefined;
    return {
      type: "message",
      externalId: mid ?? null,
      title: `New Facebook message`,
      body: text,
      occurredAt,
    };
  }

  // ── Facebook messaging_postbacks (Graph API change subscription) ──────────
  if (field === "messaging_postbacks") {
    const mid = value.mid as string | undefined;
    const title = value.title as string | undefined;
    return {
      type: "message_postback",
      externalId: mid ?? null,
      title: `New button reply${title ? `: ${title}` : ""}`,
      occurredAt,
    };
  }

  // ── Follower changes ───────────────────────────────────────────────────────
  if (field === "follower_changes" || field === "follows") {
    return {
      type: "follow",
      externalId: null,
      title: "New follower",
      occurredAt,
    };
  }

  // ── Generic fallback (preserve field name as type) ─────────────────────────
  return {
    type: field,
    externalId: null,
    title: `${platform} event: ${field}`,
    occurredAt,
  };
}

// ── Feed / posts helper (Facebook) ────────────────────────────────────────────
// The `item` field on a feed change determines the event sub-type.
// IMPORTANT: do NOT use `field === "feed"` as a proxy for "comment" — that
// mis-classifies reactions, mentions, and other feed sub-types.
function parseFeedChange(
  value: Record<string, unknown>,
  occurredAt: Date,
): NotificationInput {
  const item = value.item as string | undefined;
  const commentId = (value.comment_id ?? value.commentId) as string | undefined;
  const postId = (value.post_id ?? value.postId) as string | undefined;
  const message = value.message as string | undefined;
  const fromName = (value.from as { name?: string } | undefined)?.name;
  const verb = value.verb as string | undefined;

  if (item === "comment") {
    return {
      type: "comment",
      externalId: commentId ?? null,
      title:
        verb === "remove"
          ? `Comment removed${fromName ? ` by ${fromName}` : ""}`
          : `New comment${fromName ? ` from ${fromName}` : ""}${postId ? ` on post ${postId.split("_")[1] ?? postId}` : ""}`,
      body: message,
      occurredAt,
    };
  }

  if (item === "reaction") {
    return {
      type: "reaction",
      externalId: `${value.reaction_type as string}_${value.post_id as string}_${value.from_id as string}`,
      title: `New ${(value.reaction_type as string) ?? "reaction"} on post`,
      occurredAt,
    };
  }

  if (item === "mention") {
    return {
      type: "mention",
      externalId: commentId ?? null,
      title: "Page mentioned in a comment",
      body: message,
      occurredAt,
    };
  }

  if (item === "status") {
    return {
      type: "post",
      externalId: postId ?? null,
      title: verb === "remove" ? "Post removed" : `New post${fromName ? ` by ${fromName}` : ""}`,
      body: message,
      occurredAt,
    };
  }

  // Other feed sub-types (photo, video, link, etc.)
  return {
    type: item ?? "feed_event",
    externalId: postId ?? null,
    title: `Facebook feed event: ${item ?? "unknown"}`,
    body: message,
    occurredAt,
  };
}

// ─── Messaging (entry.messaging[]) ───────────────────────────────────────────

export interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type?: string; payload?: { url?: string } }>;
  };
  postback?: { mid?: string; title?: string; payload?: string };
  read?: unknown;
  delivery?: unknown;
}

export function parseMessagingEvent(
  platform: string,
  event: MetaMessagingEvent,
): NotificationInput | null {
  // Skip delivery / read receipts — no actionable content.
  if (event.read || event.delivery) return null;
  // Skip echoes of our own outbound messages.
  if (event.message?.is_echo) return null;

  const occurredAt = event.timestamp ? new Date(event.timestamp) : new Date();
  const platformLabel = platform === "INSTAGRAM" ? "Instagram" : "Facebook";

  if (event.postback) {
    return {
      type: "message_postback",
      externalId: event.postback.mid ?? null,
      title: `New ${platformLabel} button reply`,
      body: event.postback.title ?? event.postback.payload,
      occurredAt,
    };
  }

  if (event.message) {
    let body = event.message.text;
    if (!body && event.message.attachments?.length) {
      const kinds = event.message.attachments.map((a) => a.type ?? "attachment").join(", ");
      body = `[${kinds}]`;
    }
    return {
      type: "message",
      externalId: event.message.mid ?? null,
      title: `New ${platformLabel} message`,
      body,
      occurredAt,
    };
  }

  // Unrecognized sub-type (e.g. message reaction on DM thread)
  return null;
}
