import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: false };
}

export async function publishPost(opts: {
  accessToken: string;
  igUserId: string;
  caption: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("Instagram adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `ig_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function getComments(opts: {
  accessToken: string;
  mediaId: string;
}): Promise<PlatformComment[]> {
  logger.warn("Instagram getComments is a MOCK");
  return [];
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("Instagram replyToComment is a MOCK");
  return { success: true, externalPostId: `ig_reply_${Date.now()}` };
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
