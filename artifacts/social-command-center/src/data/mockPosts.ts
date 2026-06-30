export type Platform = "Facebook" | "Instagram" | "LinkedIn";
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "archived";

export interface MockPost {
  id: string;
  title: string;
  masterCaption: string;
  platforms: Platform[];
  status: PostStatus;
  scheduledAt: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  createdAt: string;
  updatedAt: string;
  externalPostIds: Record<string, string>;
}
