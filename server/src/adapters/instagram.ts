import { logger } from "../utils/logger.js";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export async function instagramPublish(opts: {
  accessToken: string;
  igUserId: string;
  caption: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("Instagram adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `ig_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function instagramGetComments(opts: {
  accessToken: string;
  mediaId: string;
}): Promise<unknown[]> {
  logger.warn("Instagram getComments is a MOCK");
  return [];
}

export async function instagramReplyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("Instagram replyToComment is a MOCK");
  return { success: true, externalPostId: `ig_reply_${Date.now()}` };
}
