export interface PlatformConfig {
  key: string;
  label: string;
  color: string;
  fill: string;
}

export const PLATFORM_CONFIG: PlatformConfig[] = [
  { key: "Facebook",  label: "Facebook",  color: "#7C6FD0", fill: "#7C6FD020" },
  { key: "Instagram", label: "Instagram", color: "#E0607A", fill: "#E0607A20" },
  { key: "LinkedIn",  label: "LinkedIn",  color: "#52ABC8", fill: "#52ABC820" },
  { key: "TikTok",   label: "TikTok",    color: "#4BB893", fill: "#4BB89320" },
];

export interface WeeklyDataPoint {
  week: string;
  Facebook: number;
  Instagram: number;
  LinkedIn: number;
  TikTok: number;
}

export const weeklyReach: WeeklyDataPoint[] = [
  { week: "Mar 23", Facebook: 1200, Instagram: 3800, LinkedIn:  800, TikTok:  4500 },
  { week: "Mar 30", Facebook: 1350, Instagram: 4200, LinkedIn:  950, TikTok:  3900 },
  { week: "Apr 6",  Facebook: 1100, Instagram: 3600, LinkedIn:  880, TikTok:  5200 },
  { week: "Apr 13", Facebook: 1600, Instagram: 4800, LinkedIn: 1400, TikTok:  4100 },
  { week: "Apr 20", Facebook: 1300, Instagram: 4100, LinkedIn: 1000, TikTok:  6800 },
  { week: "Apr 27", Facebook: 1500, Instagram: 5200, LinkedIn: 1200, TikTok:  5500 },
  { week: "May 4",  Facebook: 1800, Instagram: 4600, LinkedIn: 1600, TikTok:  7200 },
  { week: "May 11", Facebook: 1400, Instagram: 5800, LinkedIn: 1100, TikTok:  6100 },
  { week: "May 18", Facebook: 2100, Instagram: 6200, LinkedIn: 2800, TikTok:  8400 },
  { week: "May 25", Facebook: 1700, Instagram: 5400, LinkedIn: 1300, TikTok: 12000 },
  { week: "Jun 1",  Facebook: 1600, Instagram: 7200, LinkedIn: 1500, TikTok:  9800 },
  { week: "Jun 8",  Facebook: 2200, Instagram: 6800, LinkedIn: 1800, TikTok:  7600 },
];

export const weeklyImpressions: WeeklyDataPoint[] = weeklyReach.map(w => ({
  week: w.week,
  Facebook:  Math.round(w.Facebook  * 2.8),
  Instagram: Math.round(w.Instagram * 3.1),
  LinkedIn:  Math.round(w.LinkedIn  * 2.4),
  TikTok:    Math.round(w.TikTok    * 4.2),
}));

export const weeklyFollowers: WeeklyDataPoint[] = [
  { week: "Mar 23", Facebook:  4600, Instagram: 11800, LinkedIn: 2170, TikTok:  8200 },
  { week: "Mar 30", Facebook:  4618, Instagram: 11870, LinkedIn: 2185, TikTok:  8280 },
  { week: "Apr 6",  Facebook:  4636, Instagram: 11934, LinkedIn: 2199, TikTok:  8350 },
  { week: "Apr 13", Facebook:  4652, Instagram: 12002, LinkedIn: 2214, TikTok:  8420 },
  { week: "Apr 20", Facebook:  4668, Instagram: 12061, LinkedIn: 2228, TikTok:  8490 },
  { week: "Apr 27", Facebook:  4682, Instagram: 12128, LinkedIn: 2242, TikTok:  8570 },
  { week: "May 4",  Facebook:  4696, Instagram: 12192, LinkedIn: 2255, TikTok:  8650 },
  { week: "May 11", Facebook:  4709, Instagram: 12248, LinkedIn: 2268, TikTok:  8710 },
  { week: "May 18", Facebook:  4724, Instagram: 12308, LinkedIn: 2281, TikTok:  8760 },
  { week: "May 25", Facebook:  4748, Instagram: 12368, LinkedIn: 2292, TikTok:  8820 },
  { week: "Jun 1",  Facebook:  4782, Instagram: 12418, LinkedIn: 2303, TikTok:  8868 },
  { week: "Jun 8",  Facebook:  4820, Instagram: 12450, LinkedIn: 2310, TikTok:  8900 },
];

export interface PlatformSnapshot {
  platform: string;
  color: string;
  followers: number;
  followerGrowth: number;
  followerGrowthPct: number;
  reach30d: number;
  impressions30d: number;
  engagementRate: number;
  totalEngagements: number;
  postsPublished: number;
  avgReachPerPost: number;
  topMetricLabel: string;
  topMetricValue: string;
}

export const platformSnapshots: PlatformSnapshot[] = [
  {
    platform: "Facebook",
    color: "#7C6FD0",
    followers: 4820,
    followerGrowth: 220,
    followerGrowthPct: 4.8,
    reach30d: 7600,
    impressions30d: 21280,
    engagementRate: 2.4,
    totalEngagements: 182,
    postsPublished: 4,
    avgReachPerPost: 1900,
    topMetricLabel: "Best Eng. Rate",
    topMetricValue: "4.1% — Before & After Post",
  },
  {
    platform: "Instagram",
    color: "#E0607A",
    followers: 12450,
    followerGrowth: 650,
    followerGrowthPct: 5.5,
    reach30d: 25600,
    impressions30d: 79360,
    engagementRate: 5.8,
    totalEngagements: 1486,
    postsPublished: 5,
    avgReachPerPost: 5120,
    topMetricLabel: "Best Eng. Rate",
    topMetricValue: "8.6% — Before & After Post",
  },
  {
    platform: "LinkedIn",
    color: "#52ABC8",
    followers: 2310,
    followerGrowth: 140,
    followerGrowthPct: 6.4,
    reach30d: 7300,
    impressions30d: 17520,
    engagementRate: 4.2,
    totalEngagements: 307,
    postsPublished: 3,
    avgReachPerPost: 2433,
    topMetricLabel: "Best Eng. Rate",
    topMetricValue: "6.7% — OEM Partnership",
  },
  {
    platform: "TikTok",
    color: "#4BB893",
    followers: 8900,
    followerGrowth: 700,
    followerGrowthPct: 8.5,
    reach30d: 35000,
    impressions30d: 147000,
    engagementRate: 6.1,
    totalEngagements: 2135,
    postsPublished: 3,
    avgReachPerPost: 11667,
    topMetricLabel: "Top Video Views",
    topMetricValue: "15,200 — Synthetic Teak Worth It?",
  },
];

export interface PostPerformanceRow {
  id: string;
  title: string;
  platforms: string[];
  publishedAt: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews?: number;
  engagementRate: number;
}

export const postPerformance: PostPerformanceRow[] = [
  {
    id: "p9",
    title: "TikTok: Is synthetic teak worth it?",
    platforms: ["TikTok"],
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    reach: 22000,
    impressions: 92400,
    likes: 890,
    comments: 124,
    shares: 312,
    saves: 0,
    videoViews: 15200,
    engagementRate: 6.1,
  },
  {
    id: "p8-ig",
    title: "Before & after teak restoration (Instagram)",
    platforms: ["Instagram"],
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reach: 9800,
    impressions: 30380,
    likes: 780,
    comments: 67,
    shares: 0,
    saves: 45,
    engagementRate: 8.6,
  },
  {
    id: "p7-li",
    title: "OEM partnership announcement (LinkedIn)",
    platforms: ["LinkedIn"],
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    reach: 3400,
    impressions: 8160,
    likes: 156,
    comments: 43,
    shares: 28,
    saves: 0,
    engagementRate: 6.7,
  },
  {
    id: "p8-fb",
    title: "Before & after teak restoration (Facebook)",
    platforms: ["Facebook"],
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reach: 2600,
    impressions: 7280,
    likes: 98,
    comments: 31,
    shares: 22,
    saves: 0,
    engagementRate: 4.1,
  },
  {
    id: "p3-ig",
    title: "Maintenance tip: cleaning teak (Instagram)",
    platforms: ["Instagram"],
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reach: 4200,
    impressions: 13020,
    likes: 320,
    comments: 28,
    shares: 0,
    saves: 15,
    engagementRate: 8.4,
  },
  {
    id: "p3-li",
    title: "Maintenance tip: cleaning teak (LinkedIn)",
    platforms: ["LinkedIn"],
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reach: 1200,
    impressions: 2880,
    likes: 89,
    comments: 15,
    shares: 7,
    saves: 0,
    engagementRate: 9.3,
  },
  {
    id: "p3-fb",
    title: "Maintenance tip: cleaning teak (Facebook)",
    platforms: ["Facebook"],
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reach: 1800,
    impressions: 5040,
    likes: 45,
    comments: 12,
    shares: 8,
    saves: 0,
    engagementRate: 3.6,
  },
  {
    id: "p3-tt",
    title: "Maintenance tip: cleaning teak (TikTok)",
    platforms: ["TikTok"],
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reach: 8500,
    impressions: 35700,
    likes: 420,
    comments: 35,
    shares: 62,
    saves: 0,
    videoViews: 7200,
    engagementRate: 6.1,
  },
];

export const engagementByPlatform = [
  { platform: "LinkedIn",  rate: 4.2, color: "#52ABC8" },
  { platform: "Instagram", rate: 5.8, color: "#E0607A" },
  { platform: "TikTok",   rate: 6.1, color: "#4BB893" },
  { platform: "Facebook",  rate: 2.4, color: "#7C6FD0" },
];

export const followerDistribution = [
  { name: "Instagram", value: 12450, color: "#E0607A" },
  { name: "TikTok",   value: 8900,  color: "#4BB893" },
  { name: "Facebook",  value: 4820,  color: "#7C6FD0" },
  { name: "LinkedIn",  value: 2310,  color: "#52ABC8" },
];

export const summaryStats = {
  totalReach30d: 75500,
  totalImpressions30d: 265160,
  avgEngagementRate: 4.6,
  totalFollowers: 28480,
  followerGrowth30d: 1710,
  followerGrowthPct30d: 6.4,
  postsPublished30d: 15,
  totalEngagements30d: 4110,
};
