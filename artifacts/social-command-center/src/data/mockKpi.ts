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
];

export interface WeeklyDataPoint {
  week: string;
  Facebook: number;
  Instagram: number;
  LinkedIn: number;
}

export const weeklyReach: WeeklyDataPoint[] = [
  { week: "Mar 23", Facebook: 1200, Instagram: 3800, LinkedIn:  800 },
  { week: "Mar 30", Facebook: 1350, Instagram: 4200, LinkedIn:  950 },
  { week: "Apr 6",  Facebook: 1100, Instagram: 3600, LinkedIn:  880 },
  { week: "Apr 13", Facebook: 1600, Instagram: 4800, LinkedIn: 1400 },
  { week: "Apr 20", Facebook: 1300, Instagram: 4100, LinkedIn: 1000 },
  { week: "Apr 27", Facebook: 1500, Instagram: 5200, LinkedIn: 1200 },
  { week: "May 4",  Facebook: 1800, Instagram: 4600, LinkedIn: 1600 },
  { week: "May 11", Facebook: 1400, Instagram: 5800, LinkedIn: 1100 },
  { week: "May 18", Facebook: 2100, Instagram: 6200, LinkedIn: 2800 },
  { week: "May 25", Facebook: 1700, Instagram: 5400, LinkedIn: 1300 },
  { week: "Jun 1",  Facebook: 1600, Instagram: 7200, LinkedIn: 1500 },
  { week: "Jun 8",  Facebook: 2200, Instagram: 6800, LinkedIn: 1800 },
];

export const weeklyImpressions: WeeklyDataPoint[] = weeklyReach.map(w => ({
  week: w.week,
  Facebook:  Math.round(w.Facebook  * 2.8),
  Instagram: Math.round(w.Instagram * 3.1),
  LinkedIn:  Math.round(w.LinkedIn  * 2.4),
}));

export const weeklyFollowers: WeeklyDataPoint[] = [
  { week: "Mar 23", Facebook:  4600, Instagram: 11800, LinkedIn: 2170 },
  { week: "Mar 30", Facebook:  4618, Instagram: 11870, LinkedIn: 2185 },
  { week: "Apr 6",  Facebook:  4636, Instagram: 11934, LinkedIn: 2199 },
  { week: "Apr 13", Facebook:  4652, Instagram: 12002, LinkedIn: 2214 },
  { week: "Apr 20", Facebook:  4668, Instagram: 12061, LinkedIn: 2228 },
  { week: "Apr 27", Facebook:  4682, Instagram: 12128, LinkedIn: 2242 },
  { week: "May 4",  Facebook:  4696, Instagram: 12192, LinkedIn: 2255 },
  { week: "May 11", Facebook:  4709, Instagram: 12248, LinkedIn: 2268 },
  { week: "May 18", Facebook:  4724, Instagram: 12308, LinkedIn: 2281 },
  { week: "May 25", Facebook:  4748, Instagram: 12368, LinkedIn: 2292 },
  { week: "Jun 1",  Facebook:  4782, Instagram: 12418, LinkedIn: 2303 },
  { week: "Jun 8",  Facebook:  4820, Instagram: 12450, LinkedIn: 2310 },
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
    id: "p3-li2",
    title: "Synthetic teak: pros and cons (LinkedIn)",
    platforms: ["LinkedIn"],
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    reach: 2800,
    impressions: 6720,
    likes: 112,
    comments: 31,
    shares: 19,
    saves: 0,
    engagementRate: 5.8,
  },
];

export const engagementByPlatform = [
  { platform: "LinkedIn",  rate: 4.2, color: "#52ABC8" },
  { platform: "Instagram", rate: 5.8, color: "#E0607A" },
  { platform: "Facebook",  rate: 2.4, color: "#7C6FD0" },
];

export const followerDistribution = [
  { name: "Instagram", value: 12450, color: "#E0607A" },
  { name: "Facebook",  value: 4820,  color: "#7C6FD0" },
  { name: "LinkedIn",  value: 2310,  color: "#52ABC8" },
];

export const summaryStats = {
  totalReach30d: 40500,
  totalImpressions30d: 118160,
  avgEngagementRate: 4.1,
  totalFollowers: 19580,
  followerGrowth30d: 1010,
  followerGrowthPct30d: 5.4,
  postsPublished30d: 12,
  totalEngagements30d: 1975,
};
