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

export const mockAccounts: MockAccount[] = [
  {
    id: "a1",
    platform: "Facebook",
    accountName: "Marine Decking Co Page",
    accountId: "fb_page_12345",
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 1800000).toISOString(),
    postingCapability: true,
    commentReadCapability: true,
    commentReplyCapability: true,
    moderationCapability: true
  },
  {
    id: "a2",
    platform: "Instagram",
    accountName: "Marine Decking Co (@marinedecking)",
    accountId: "ig_biz_12345",
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    postingCapability: true,
    commentReadCapability: true,
    commentReplyCapability: true,
    moderationCapability: false
  },
  {
    id: "a3",
    platform: "LinkedIn",
    accountName: "CEO Profile",
    accountId: "li_prof_12345",
    connectionStatus: "needs_permission",
    lastSync: new Date(Date.now() - 86400000 * 5).toISOString(),
    postingCapability: false,
    commentReadCapability: false,
    commentReplyCapability: false,
    moderationCapability: false
  },
  {
    id: "a4",
    platform: "LinkedIn",
    accountName: "Marine Decking Co Page",
    accountId: "li_comp_12345",
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 7200000).toISOString(),
    postingCapability: true,
    commentReadCapability: true,
    commentReplyCapability: true,
    moderationCapability: true
  },
  {
    id: "a5",
    platform: "TikTok",
    accountName: "Marine Decking Official",
    accountId: "tt_12345",
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 14400000).toISOString(),
    postingCapability: true,
    commentReadCapability: true,
    commentReplyCapability: false,
    moderationCapability: false
  },
  {
    id: "a6",
    platform: "Website",
    accountName: "Main WordPress Site API",
    accountId: "wp_api_12345",
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 86400000).toISOString(),
    postingCapability: true,
    commentReadCapability: false,
    commentReplyCapability: false,
    moderationCapability: false
  },
  {
    id: "a7",
    platform: "n8n",
    accountName: "Internal n8n Server",
    accountId: "n8n_local",
    connectionStatus: "not_connected",
    lastSync: null,
    postingCapability: false,
    commentReadCapability: false,
    commentReplyCapability: false,
    moderationCapability: false
  },
  {
    id: "a8",
    platform: "Local AI",
    accountName: "Local AI Model",
    accountId: "llama3_local",
    connectionStatus: "mock_mode",
    lastSync: new Date(Date.now() - 60000).toISOString(),
    postingCapability: false,
    commentReadCapability: false,
    commentReplyCapability: false,
    moderationCapability: false
  }
];