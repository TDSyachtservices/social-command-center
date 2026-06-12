import { logger } from "../utils/logger.js";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export async function linkedinPublish(opts: {
  accessToken: string;
  organizationId: string;
  text: string;
  imageUrl?: string | null;
}): Promise<PublishResult> {
  logger.warn("LinkedIn adapter is a MOCK — no real API call");
  return {
    success: true,
    externalPostId: `li_mock_${Date.now()}`,
    rawResponse: { mock: true },
  };
}

export async function linkedinGetComments(opts: {
  accessToken: string;
  shareUrn: string;
}): Promise<unknown[]> {
  logger.warn("LinkedIn getComments is a MOCK");
  return [];
}
