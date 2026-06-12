import { logger } from "../utils/logger.js";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export async function tiktokPublish(opts: {
  accessToken: string;
  openId: string;
  title: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("TikTok adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `tt_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function tiktokGetComments(opts: {
  accessToken: string;
  videoId: string;
}): Promise<unknown[]> {
  logger.warn("TikTok getComments is a MOCK");
  return [];
}
