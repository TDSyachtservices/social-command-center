import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: true, commentReply: true, moderation: false };
}

export async function publishPost(opts: {
  accessToken: string;
  organizationId: string;
  text: string;
  mediaUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("LinkedIn adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `li_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function getComments(opts: {
  accessToken: string;
  shareUrn: string;
}): Promise<PlatformComment[]> {
  logger.warn("LinkedIn getComments is a MOCK");
  return [];
}

export async function replyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("LinkedIn replyToComment is a MOCK");
  return { success: true, externalPostId: `li_reply_${Date.now()}` };
}

export async function linkedinPublish(opts: Parameters<typeof publishPost>[0]): Promise<PublishResult> {
  return publishPost(opts);
}
export async function linkedinGetComments(opts: Parameters<typeof getComments>[0]): Promise<PlatformComment[]> {
  return getComments(opts);
}
