import { logger } from "../utils/logger.js";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export async function facebookPublish(opts: {
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

export async function facebookGetComments(opts: {
  accessToken: string;
  postId: string;
}): Promise<unknown[]> {
  logger.warn("Facebook getComments is a MOCK");
  return [];
}

export async function facebookReplyToComment(opts: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<PublishResult> {
  logger.warn("Facebook replyToComment is a MOCK");
  return { success: true, externalPostId: `fb_reply_${Date.now()}` };
}
