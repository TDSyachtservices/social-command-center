import { logger } from "../utils/logger.js";
import type { PublishResult, PlatformCapabilities, PlatformComment } from "./facebook.js";

export type { PublishResult, PlatformCapabilities, PlatformComment };

export function getCapabilities(): PlatformCapabilities {
  return { posting: true, commentRead: false, commentReply: false, moderation: false };
}

export async function publishPost(opts: {
  endpointUrl: string;
  apiKey: string;
  title: string;
  caption: string;
  mediaUrl?: string | null;
  scheduledAt?: Date | null;
}): Promise<PublishResult> {
  logger.warn("Website adapter is a MOCK — no real CMS call");
  return {
    success: true,
    externalPostId: `web_mock_${Date.now()}`,
  };
}

export async function getComments(_opts: { endpointUrl: string; apiKey: string; postId: string }): Promise<PlatformComment[]> {
  logger.warn("Website getComments is a MOCK");
  return [];
}

export async function replyToComment(_opts: { endpointUrl: string; apiKey: string; commentId: string; message: string }): Promise<PublishResult> {
  logger.warn("Website replyToComment is a MOCK");
  return { success: true, externalPostId: `web_reply_${Date.now()}` };
}

export async function websitePublish(opts: Parameters<typeof publishPost>[0]): Promise<PublishResult> {
  return publishPost(opts);
}
