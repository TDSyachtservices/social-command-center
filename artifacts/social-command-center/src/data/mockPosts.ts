export type Platform = "Facebook" | "Instagram" | "LinkedIn" | "TikTok" | "Website";
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

export const mockPosts: MockPost[] = [
  {
    id: "p1",
    title: "Teak deck refit showcase",
    masterCaption: "Another beautiful teak deck refit completed for this classic motor yacht. The precision in the caulking lines is what sets our 40-year heritage apart.",
    platforms: ["Facebook", "Instagram", "LinkedIn"],
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    externalPostIds: {}
  },
  {
    id: "p2",
    title: "Composite decking install highlight",
    masterCaption: "Synthetic options have come a long way. Check out this seamless composite decking installation. Maximum durability, minimal maintenance.",
    platforms: ["Instagram", "TikTok"],
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 86400000 * 4).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "video",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    externalPostIds: {}
  },
  {
    id: "p3",
    title: "Maintenance tip: cleaning teak",
    masterCaption: "Proper maintenance is key to teak longevity. Remember: always brush across the grain, never with it. Use a soft bristle brush.",
    platforms: ["Facebook", "Instagram", "LinkedIn", "TikTok"],
    status: "published",
    scheduledAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    externalPostIds: { Facebook: "fb_123", Instagram: "ig_123", LinkedIn: "li_123", TikTok: "tt_123" }
  },
  {
    id: "p4",
    title: "Behind the scenes: production floor",
    masterCaption: "A look inside our main facility where the magic happens. Precision CNC cutting meets traditional craftsmanship.",
    platforms: ["Facebook", "LinkedIn"],
    status: "draft",
    scheduledAt: null,
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    externalPostIds: {}
  },
  {
    id: "p5",
    title: "SeaSole product preview",
    masterCaption: "Introducing our new line of marine-grade interior flooring. All the aesthetic appeal of traditional soles with modern acoustic dampening.",
    platforms: ["Facebook", "Instagram", "LinkedIn", "TikTok", "Website"],
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    externalPostIds: {}
  },
  {
    id: "p6",
    title: "Project gallery update",
    masterCaption: "Swipe to see the transformation on this 80ft sportfisher.",
    platforms: ["Instagram"],
    status: "failed",
    scheduledAt: new Date(Date.now() - 86400000).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    externalPostIds: {}
  },
  {
    id: "p7",
    title: "OEM partnership announcement",
    masterCaption: "We are proud to announce our selection as the exclusive decking provider for the new 2025 hull line.",
    platforms: ["LinkedIn"],
    status: "published",
    scheduledAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    externalPostIds: { LinkedIn: "li_456" }
  },
  {
    id: "p8",
    title: "Before & after teak restoration",
    masterCaption: "Restoring the original luster. This deck was neglected for 5 years before our team stepped in.",
    platforms: ["Facebook", "Instagram"],
    status: "published",
    scheduledAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    externalPostIds: { Facebook: "fb_456", Instagram: "ig_456" }
  },
  {
    id: "p9",
    title: "TikTok: Is synthetic teak worth it?",
    masterCaption: "Breaking down the pros and cons of synthetic vs real teak for your boat.",
    platforms: ["TikTok"],
    status: "published",
    scheduledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "video",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    externalPostIds: { TikTok: "tt_456" }
  },
  {
    id: "p10",
    title: "Marine expo 2026 preview",
    masterCaption: "Will we see you at the upcoming show? Visit our booth to see our latest decking innovations.",
    platforms: ["Facebook", "Instagram", "LinkedIn", "TikTok", "Website"],
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 86400000 * 14).toISOString(),
    mediaUrl: "placeholder",
    mediaType: "image",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    externalPostIds: {}
  }
];