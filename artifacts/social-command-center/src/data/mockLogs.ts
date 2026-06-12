import { Platform } from "./mockPosts";

export interface PublishLog {
  id: string;
  postTitle: string;
  platform: Platform;
  action: "post_created" | "post_scheduled" | "publish_started" | "publish_success" | "publish_failed" | "retry_started" | "retry_success" | "retry_failed";
  status: "success" | "failed" | "pending";
  externalPostId: string | null;
  apiResponse: string;
  errorMessage: string | null;
  timestamp: string;
}

export interface CommentLog {
  id: string;
  platform: Platform;
  account: string;
  actionType: "comment_sync" | "thread_refresh" | "reply_sent" | "reply_failed" | "comment_hidden" | "status_updated" | "assignment_updated" | "note_added";
  status: "success" | "failed" | "pending";
  relatedPost: string | null;
  relatedCommenter: string | null;
  errorMessage: string | null;
  timestamp: string;
}

export const mockPublishLogs: PublishLog[] = [
  {
    id: "pl1",
    postTitle: "Maintenance tip: cleaning teak",
    platform: "Facebook",
    action: "publish_success",
    status: "success",
    externalPostId: "fb_123",
    apiResponse: "{ id: 'fb_123', status: 'published' }",
    errorMessage: null,
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "pl2",
    postTitle: "Maintenance tip: cleaning teak",
    platform: "Instagram",
    action: "publish_success",
    status: "success",
    externalPostId: "ig_123",
    apiResponse: "{ id: 'ig_123', status: 'published' }",
    errorMessage: null,
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "pl3",
    postTitle: "Project gallery update",
    platform: "Instagram",
    action: "publish_failed",
    status: "failed",
    externalPostId: null,
    apiResponse: "{ error: { code: 190, message: 'Invalid OAuth access token.' } }",
    errorMessage: "Invalid OAuth access token. Re-authenticate account.",
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "pl4",
    postTitle: "TikTok: Is synthetic teak worth it?",
    platform: "TikTok",
    action: "publish_success",
    status: "success",
    externalPostId: "tt_456",
    apiResponse: "{ data: { publish_id: 'tt_456' } }",
    errorMessage: null,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "pl5",
    postTitle: "Teak deck refit showcase",
    platform: "Facebook",
    action: "post_scheduled",
    status: "success",
    externalPostId: null,
    apiResponse: "{ scheduled: true }",
    errorMessage: null,
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

export const mockCommentLogs: CommentLog[] = [
  {
    id: "cl1",
    platform: "Facebook",
    account: "Marine Decking Co Page",
    actionType: "comment_sync",
    status: "success",
    relatedPost: null,
    relatedCommenter: null,
    errorMessage: null,
    timestamp: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: "cl2",
    platform: "Instagram",
    account: "Marine Decking Co (@marinedecking)",
    actionType: "reply_sent",
    status: "success",
    relatedPost: "Maintenance tip: cleaning teak",
    relatedCommenter: "@sailing_sarah",
    errorMessage: null,
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "cl3",
    platform: "LinkedIn",
    account: "Marine Decking Co Page",
    actionType: "status_updated",
    status: "success",
    relatedPost: "OEM partnership announcement",
    relatedCommenter: "Robert Davis",
    errorMessage: null,
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "cl4",
    platform: "TikTok",
    account: "Marine Decking Official",
    actionType: "comment_sync",
    status: "failed",
    relatedPost: null,
    relatedCommenter: null,
    errorMessage: "Rate limit exceeded. Retrying in 15 minutes.",
    timestamp: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: "cl5",
    platform: "Facebook",
    account: "Marine Decking Co Page",
    actionType: "assignment_updated",
    status: "success",
    relatedPost: "Teak deck refit showcase",
    relatedCommenter: "@mikerogers",
    errorMessage: null,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];