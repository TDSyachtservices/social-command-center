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

export const mockComments: MockComment[] = [
  {
    id: "c1",
    platform: "Facebook",
    accountName: "Marine Decking Co",
    commenterName: "John Smith",
    commenterHandle: "@johnsmith_fl",
    commentText: "Do you install teak decks in Fort Lauderdale?",
    originalPostTitle: "Before & after teak restoration",
    originalPostCaption: "Restoring the original luster. This deck was neglected for 5 years before our team stepped in.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c2",
    platform: "Instagram",
    accountName: "Marine Decking Co",
    commenterName: "Sarah Jenkins",
    commenterHandle: "@sailing_sarah",
    commentText: "How long does a teak deck last?",
    originalPostTitle: "Maintenance tip: cleaning teak",
    originalPostCaption: "Proper maintenance is key to teak longevity...",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c3",
    platform: "LinkedIn",
    accountName: "Marine Decking Co",
    commenterName: "Robert Davis",
    commenterHandle: "robert-davis-marine",
    commentText: "Do you work with OEM boat builders?",
    originalPostTitle: "OEM partnership announcement",
    originalPostCaption: "We are proud to announce our selection as the exclusive decking provider...",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: "needs_follow_up",
    priority: "high",
    replyCount: 0,
    assignedUser: "Sales Team",
    mediaUrl: null
  },
  {
    id: "c4",
    platform: "TikTok",
    accountName: "Marine Decking Co",
    commenterName: "Boat Guy",
    commenterHandle: "@boatguy123",
    commentText: "Can this be used instead of real teak?",
    originalPostTitle: "TikTok: Is synthetic teak worth it?",
    originalPostCaption: "Breaking down the pros and cons of synthetic vs real teak...",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c5",
    platform: "Instagram",
    accountName: "Marine Decking Co",
    commenterName: "Angry Captain",
    commenterHandle: "@captain_mad",
    commentText: "My old deck failed after two years. What makes yours different?",
    originalPostTitle: "Before & after teak restoration",
    originalPostCaption: "Restoring the original luster...",
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    status: "new",
    priority: "urgent",
    replyCount: 0,
    assignedUser: "Support Team",
    mediaUrl: null
  },
  {
    id: "c6",
    platform: "Facebook",
    accountName: "Marine Decking Co",
    commenterName: "Mike Rogers",
    commenterHandle: "@mikerogers",
    commentText: "Can someone contact me about a quote?",
    originalPostTitle: "Teak deck refit showcase",
    originalPostCaption: "Another beautiful teak deck refit completed...",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "needs_follow_up",
    priority: "sales_opportunity",
    replyCount: 1,
    assignedUser: "Sales Team",
    mediaUrl: null
  },
  {
    id: "c7",
    platform: "LinkedIn",
    accountName: "Marine Decking Co",
    commenterName: "Eleanor Vance",
    commenterHandle: "eleanor-vance-yachts",
    commentText: "Impressive craftsmanship. Do you handle superyachts?",
    originalPostTitle: "Behind the scenes: production floor",
    originalPostCaption: "A look inside our main facility...",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: "replied",
    priority: "high",
    replyCount: 1,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c8",
    platform: "Instagram",
    accountName: "Marine Decking Co",
    commenterName: "Yacht Life",
    commenterHandle: "@yachtlife_daily",
    commentText: "What's the price per square foot for teak?",
    originalPostTitle: "Maintenance tip: cleaning teak",
    originalPostCaption: "Proper maintenance is key...",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c9",
    platform: "TikTok",
    accountName: "Marine Decking Co",
    commenterName: "Decking Fan",
    commenterHandle: "@deckingfan",
    commentText: "This looks incredible! Where can I buy?",
    originalPostTitle: "TikTok: Is synthetic teak worth it?",
    originalPostCaption: "Breaking down the pros and cons...",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c10",
    platform: "Facebook",
    accountName: "Marine Decking Co",
    commenterName: "Linda Matthews",
    commenterHandle: "@lindam",
    commentText: "I had a great experience with your Fort Lauderdale team",
    originalPostTitle: "Before & after teak restoration",
    originalPostCaption: "Restoring the original luster...",
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: "resolved",
    priority: "low",
    replyCount: 1,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c11",
    platform: "Instagram",
    accountName: "Marine Decking Co",
    commenterName: "Boat Show Goer",
    commenterHandle: "@boatshow_guy",
    commentText: "Are you at the Miami Boat Show?",
    originalPostTitle: "Marine expo 2026 preview",
    originalPostCaption: "Will we see you at the upcoming show?",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "new",
    priority: "normal",
    replyCount: 0,
    assignedUser: null,
    mediaUrl: null
  },
  {
    id: "c12",
    platform: "LinkedIn",
    accountName: "Marine Decking Co",
    commenterName: "Builder Inc",
    commenterHandle: "builder-inc",
    commentText: "We're a boat builder looking for teak suppliers",
    originalPostTitle: "OEM partnership announcement",
    originalPostCaption: "We are proud to announce...",
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "needs_follow_up",
    priority: "sales_opportunity",
    replyCount: 0,
    assignedUser: "Sales Team",
    mediaUrl: null
  }
];