import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: false, commentReply: false, moderation: false };
}

export async function publishPost(opts: {
  accessToken: string;
  openId: string;
  title: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("TikTok adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `tt_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function getComments(opts: {
  accessToken: string;
  videoId: string;
}): Promise<PlatformComment[]> {
  logger.warn("TikTok getComments is a MOCK");
  return [];
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("TikTok replyToComment is a MOCK");
  return { success: true, externalPostId: `tt_reply_${Date.now()}` };
}

export async function tiktokPublish(opts: Parameters<typeof publishPost>[0]): Promise<PublishResult> {
  return publishPost(opts);
}
export async function tiktokGetComments(opts: Parameters<typeof getComments>[0]): Promise<PlatformComment[]> {
  return getComments(opts);
}
