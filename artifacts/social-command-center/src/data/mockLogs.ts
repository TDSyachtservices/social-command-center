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
