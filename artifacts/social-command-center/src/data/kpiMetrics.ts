import {
  platformSnapshots,
  weeklyReach,
  weeklyImpressions,
  weeklyFollowers,
  postPerformance,
  summaryStats,
  type WeeklyDataPoint,
} from "./mockKpi";

export type MetricId =
  | "reach"
  | "impressions"
  | "engagement-rate"
  | "engagements"
  | "followers"
  | "follower-growth"
  | "posts-published"
  | "avg-reach-per-post";

export type MetricUnit = "count" | "percent" | "avg";

export type PostMetric = "reach" | "impressions" | "engagements" | "engagementRate";

export interface MetricTheme {
  cardClass: string;
  iconBg: string;
  iconText: string;
  numClass: string;
  accent: string;
}

export interface BreakdownRow {
  platform: string;
  color: string;
  value: number;
  display: string;
}

export interface MetricDef {
  id: MetricId;
  label: string;
  iconName: string;
  value: string;
  rawTotal: number;
  unit: MetricUnit;
  sub: string;
  trend?: string;
  trendUp?: boolean;
  theme: MetricTheme;
  calc: string;
  formula?: string;
  breakdown: BreakdownRow[];
  weekly?: { data: WeeklyDataPoint[]; label: string; description: string };
  posts?: { metric: PostMetric; title: string; description: string; sort?: "value" | "date" };
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const fmtFull = (n: number) => n.toLocaleString();

function buildBreakdown(
  getValue: (s: (typeof platformSnapshots)[number]) => number,
  unit: MetricUnit,
): BreakdownRow[] {
  return platformSnapshots
    .map((s) => ({
      platform: s.platform,
      color: s.color,
      value: getValue(s),
    }))
    .sort((a, b) => b.value - a.value)
    .map((r) => ({
      ...r,
      display: unit === "percent" ? `${r.value}%` : fmtFull(r.value),
    }));
}

export const weeklyFollowerGrowth: WeeklyDataPoint[] = weeklyFollowers
  .slice(1)
  .map((w, i) => {
    const prev = weeklyFollowers[i];
    return {
      week: w.week,
      Facebook: w.Facebook - prev.Facebook,
      Instagram: w.Instagram - prev.Instagram,
      LinkedIn: w.LinkedIn - prev.LinkedIn,
    };
  });

const avgReachPerPost = Math.round(
  summaryStats.totalReach30d / summaryStats.postsPublished30d,
);

export const KPI_METRICS: Record<MetricId, MetricDef> = {
  reach: {
    id: "reach",
    label: "Total Reach (30d)",
    iconName: "Eye",
    value: fmt(summaryStats.totalReach30d),
    rawTotal: summaryStats.totalReach30d,
    unit: "count",
    sub: `${fmtFull(summaryStats.totalReach30d)} unique accounts reached`,
    trend: "+18.4%",
    trendUp: true,
    theme: {
      cardClass: "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-200",
      iconText: "text-violet-600",
      numClass: "text-violet-700",
      accent: "#7C6FD0",
    },
    calc: "The number of unique accounts that saw your content, summed across every connected platform over the last 30 days.",
    breakdown: buildBreakdown((s) => s.reach30d, "count"),
    weekly: {
      data: weeklyReach,
      label: "Weekly Reach by Platform",
      description: "Unique accounts reached each week over the last 12 weeks",
    },
    posts: {
      metric: "reach",
      title: "Reach by Post",
      description: "Individual posts contributing to total reach",
    },
  },
  impressions: {
    id: "impressions",
    label: "Total Impressions (30d)",
    iconName: "BarChart2",
    value: fmt(summaryStats.totalImpressions30d),
    rawTotal: summaryStats.totalImpressions30d,
    unit: "count",
    sub: "Total times your content was displayed",
    trend: "+22.1%",
    trendUp: true,
    theme: {
      cardClass: "bg-sky-50 border-sky-200",
      iconBg: "bg-sky-200",
      iconText: "text-sky-600",
      numClass: "text-sky-700",
      accent: "#52ABC8",
    },
    calc: "The total number of times your content was displayed on screen (including repeat views), summed across all platforms over the last 30 days.",
    breakdown: buildBreakdown((s) => s.impressions30d, "count"),
    weekly: {
      data: weeklyImpressions,
      label: "Weekly Impressions by Platform",
      description: "Content displays each week over the last 12 weeks",
    },
    posts: {
      metric: "impressions",
      title: "Impressions by Post",
      description: "Individual posts contributing to total impressions",
    },
  },
  "engagement-rate": {
    id: "engagement-rate",
    label: "Avg Engagement Rate",
    iconName: "Heart",
    value: `${summaryStats.avgEngagementRate}%`,
    rawTotal: summaryStats.avgEngagementRate,
    unit: "percent",
    sub: "Likes + comments + shares ÷ reach",
    trend: "+0.8pp",
    trendUp: true,
    theme: {
      cardClass: "bg-rose-50 border-rose-200",
      iconBg: "bg-rose-200",
      iconText: "text-rose-600",
      numClass: "text-rose-700",
      accent: "#E0607A",
    },
    calc: "The average share of reached users who interacted with your content (likes, comments, shares, saves), averaged across all platforms.",
    breakdown: buildBreakdown((s) => s.engagementRate, "percent"),
    posts: {
      metric: "engagementRate",
      title: "Engagement Rate by Post",
      description: "How each post performed against its own reach",
    },
  },
  engagements: {
    id: "engagements",
    label: "Total Engagements",
    iconName: "Share2",
    value: fmt(summaryStats.totalEngagements30d),
    rawTotal: summaryStats.totalEngagements30d,
    unit: "count",
    sub: "Likes, comments, shares & saves",
    trend: "+31%",
    trendUp: true,
    theme: {
      cardClass: "bg-orange-50 border-orange-200",
      iconBg: "bg-orange-200",
      iconText: "text-orange-600",
      numClass: "text-orange-700",
      accent: "#E8924A",
    },
    calc: "Every interaction with your content — likes, comments, shares and saves — summed across all platforms over the last 30 days.",
    breakdown: buildBreakdown((s) => s.totalEngagements, "count"),
    posts: {
      metric: "engagements",
      title: "Engagements by Post",
      description: "Total interactions per post (likes + comments + shares + saves)",
    },
  },
  followers: {
    id: "followers",
    label: "Total Followers",
    iconName: "Users",
    value: fmtFull(summaryStats.totalFollowers),
    rawTotal: summaryStats.totalFollowers,
    unit: "count",
    sub: "Across all connected platforms",
    theme: {
      cardClass: "bg-indigo-50 border-indigo-200",
      iconBg: "bg-indigo-200",
      iconText: "text-indigo-600",
      numClass: "text-indigo-700",
      accent: "#6366F1",
    },
    calc: "The combined audience following your accounts across every connected platform.",
    breakdown: buildBreakdown((s) => s.followers, "count"),
    weekly: {
      data: weeklyFollowers,
      label: "Follower Count by Platform",
      description: "Cumulative followers each week over the last 12 weeks",
    },
  },
  "follower-growth": {
    id: "follower-growth",
    label: "Follower Growth (30d)",
    iconName: "ChevronUp",
    value: `+${fmtFull(summaryStats.followerGrowth30d)}`,
    rawTotal: summaryStats.followerGrowth30d,
    unit: "count",
    sub: `+${summaryStats.followerGrowthPct30d}% growth rate`,
    trend: "+6.4%",
    trendUp: true,
    theme: {
      cardClass: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-200",
      iconText: "text-emerald-600",
      numClass: "text-emerald-700",
      accent: "#10B981",
    },
    calc: "Net new followers gained across all platforms over the last 30 days.",
    breakdown: buildBreakdown((s) => s.followerGrowth, "count"),
    weekly: {
      data: weeklyFollowerGrowth,
      label: "Weekly Net New Followers",
      description: "Followers gained week over week",
    },
  },
  "posts-published": {
    id: "posts-published",
    label: "Posts Published (30d)",
    iconName: "FileText",
    value: String(summaryStats.postsPublished30d),
    rawTotal: summaryStats.postsPublished30d,
    unit: "count",
    sub: "Content pieces published",
    theme: {
      cardClass: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-200",
      iconText: "text-amber-600",
      numClass: "text-amber-700",
      accent: "#F59E0B",
    },
    calc: "The number of posts published across all platforms in the last 30 days.",
    breakdown: buildBreakdown((s) => s.postsPublished, "count"),
    posts: {
      metric: "reach",
      title: "Recent Published Posts",
      description: "A sample of posts that went live, newest first (reach shown for context)",
      sort: "date",
    },
  },
  "avg-reach-per-post": {
    id: "avg-reach-per-post",
    label: "Avg Reach / Post",
    iconName: "TrendingUp",
    value: fmt(avgReachPerPost),
    rawTotal: avgReachPerPost,
    unit: "avg",
    sub: "Reach efficiency per post",
    trend: "+12%",
    trendUp: true,
    theme: {
      cardClass: "bg-teal-50 border-teal-200",
      iconBg: "bg-teal-200",
      iconText: "text-teal-600",
      numClass: "text-teal-700",
      accent: "#14B8A6",
    },
    calc: "Average unique accounts reached per published post — a measure of how efficiently each piece of content performs.",
    formula: `${fmtFull(summaryStats.totalReach30d)} total reach ÷ ${summaryStats.postsPublished30d} posts = ${fmtFull(avgReachPerPost)}`,
    breakdown: buildBreakdown((s) => s.avgReachPerPost, "avg"),
    posts: {
      metric: "reach",
      title: "Reach by Post",
      description: "Per-post reach used to compute the average",
    },
  },
};

export const METRIC_ORDER: MetricId[] = [
  "reach",
  "impressions",
  "engagement-rate",
  "engagements",
  "followers",
  "follower-growth",
  "posts-published",
  "avg-reach-per-post",
];

export function getPostEngagements(p: (typeof postPerformance)[number]): number {
  return p.likes + p.comments + p.shares + p.saves;
}
