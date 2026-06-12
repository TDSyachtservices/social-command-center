import { logger } from "../utils/logger.js";

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

export async function publishPost(opts: {
  accessToken: string;
  pageId: string;
  message: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("Facebook adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `fb_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function getComments(opts: {
  accessToken: string;
  postId: string;
}): Promise<PlatformComment[]> {
  logger.warn("Facebook getComments is a MOCK");
  return [];
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("Facebook replyToComment is a MOCK");
  return { success: true, externalPostId: `fb_reply_${Date.now()}` };
}

export async function facebookPublish(opts: Parameters<typeof publishPost>[0]): Promise<PublishResult> {
  return publishPost(opts);
}
export async function facebookGetComments(opts: Parameters<typeof getComments>[0]): Promise<PlatformComment[]> {
  return getComments(opts);
}
export async function facebookReplyToComment(opts: Parameters<typeof replyToComment>[0]): Promise<PublishResult> {
  return replyToComment(opts);
}
