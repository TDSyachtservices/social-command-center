import { Platform } from "./mockPosts";

export type ConnectionStatus = "connected" | "not_connected" | "needs_permission" | "mock_mode";

export interface MockAccount {
  id: string;
  platform: Platform | "n8n" | "Local AI";
  accountName: string;
  accountId: string;
  connectionStatus: ConnectionStatus;
  lastSync: string | null;
  postingCapability: boolean;
  commentReadCapability: boolean;
  commentReplyCapability: boolean;
  moderationCapability: boolean;
}
