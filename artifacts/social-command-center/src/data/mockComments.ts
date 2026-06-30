import { Platform } from "./mockPosts";

export type CommentStatus = "new" | "replied" | "needs_follow_up" | "resolved" | "hidden" | "ignored" | "escalated" | "failed_reply";
export type CommentPriority = "low" | "normal" | "high" | "urgent" | "sales_opportunity";

export interface MockComment {
  id: string;
  platform: Platform;
  accountName: string;
  commenterName: string;
  commenterHandle: string;
  commentText: string;
  originalPostTitle: string;
  originalPostCaption: string;
  timestamp: string;
  status: CommentStatus;
  priority: CommentPriority;
  replyCount: number;
  assignedUser: string | null;
  mediaUrl: string | null;
}
