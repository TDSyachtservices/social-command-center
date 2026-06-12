import { logger } from "../utils/logger.js";

export interface WebsitePublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
}

export async function websitePublish(opts: {
  endpointUrl: string;
  apiKey: string;
  title: string;
  caption: string;
  mediaUrl?: string | null;
  scheduledAt?: Date | null;
}): Promise<WebsitePublishResult> {
  logger.warn("Website adapter is a MOCK — no real CMS call");
  return {
    success: true,
    externalPostId: `web_mock_${Date.now()}`,
  };
}
