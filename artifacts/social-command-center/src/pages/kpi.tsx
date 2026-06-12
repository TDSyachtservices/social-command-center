import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Share2,
  MessageSquare, Download, FileText, BarChart2, ChevronUp,
} from "lucide-react";
import {
  PLATFORM_CONFIG, weeklyReach, weeklyImpressions, weeklyFollowers,
  platformSnapshots, postPerformance, engagementByPlatform,
  followerDistribution, summaryStats,
} from "@/data/mockKpi";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtFull = (n: number) => n.toLocaleString();

function MetricCard({
  label, value, sub, trend, trendUp, icon: Icon, cardClass, iconBg, iconText, numClass,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  cardClass?: string;
  iconBg?: string;
  iconText?: string;
  numClass?: string;
}) {
  return (
    <Card className={cardClass ?? ""}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className={`text-2xl font-bold mt-1 leading-none ${numClass ?? ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg ?? "bg-primary/10"}`}>
            <Icon className={`h-4 w-4 ${iconText ?? "text-primary"}`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend} vs prior period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.dataKey}:</span>
          <span className="font-medium">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function OverviewTab() {
  const [metric, setMetric] = useState<"reach" | "impressions" | "followers">("reach");

  const chartData = {
    reach: weeklyReach,
    impressions: weeklyImpressions,
    followers: weeklyFollowers,
  }[metric];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Reach (30d)" value={fmt(summaryStats.totalReach30d)} sub={`${fmtFull(summaryStats.totalReach30d)} unique accounts`} trend="+18.4%" trendUp icon={Eye}
          cardClass="bg-violet-50 border-violet-200" iconBg="bg-violet-200" iconText="text-violet-600" numClass="text-violet-700" />
        <MetricCard label="Total Impressions (30d)" value={fmt(summaryStats.totalImpressions30d)} sub="Across all platforms" trend="+22.1%" trendUp icon={BarChart2}
          cardClass="bg-sky-50 border-sky-200" iconBg="bg-sky-200" iconText="text-sky-600" numClass="text-sky-700" />
        <MetricCard label="Avg Engagement Rate" value={`${summaryStats.avgEngagementRate}%`} sub="Likes + comments + shares" trend="+0.8pp" trendUp icon={Heart}
          cardClass="bg-rose-50 border-rose-200" iconBg="bg-rose-200" iconText="text-rose-600" numClass="text-rose-700" />
        <MetricCard label="Total Engagements" value={fmt(summaryStats.totalEngagements30d)} sub="Interactions this month" trend="+31%" trendUp icon={Share2}
          cardClass="bg-orange-50 border-orange-200" iconBg="bg-orange-200" iconText="text-orange-600" numClass="text-orange-700" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Followers" value={fmtFull(summaryStats.totalFollowers)} sub="Across all platforms" icon={Users}
          cardClass="bg-indigo-50 border-indigo-200" iconBg="bg-indigo-200" iconText="text-indigo-600" numClass="text-indigo-700" />
        <MetricCard label="Follower Growth (30d)" value={`+${fmtFull(summaryStats.followerGrowth30d)}`} sub={`+${summaryStats.followerGrowthPct30d}% growth rate`} trend="+6.4%" trendUp icon={ChevronUp}
          cardClass="bg-emerald-50 border-emerald-200" iconBg="bg-emerald-200" iconText="text-emerald-600" numClass="text-emerald-700" />
        <MetricCard label="Posts Published (30d)" value={String(summaryStats.postsPublished30d)} sub="Content pieces live" icon={FileText}
          cardClass="bg-amber-50 border-amber-200" iconBg="bg-amber-200" iconText="text-amber-600" numClass="text-amber-700" />
        <MetricCard label="Avg Reach / Post" value={fmt(Math.round(summaryStats.totalReach30d / summaryStats.postsPublished30d))} sub="Reach efficiency" trend="+12%" trendUp icon={TrendingUp}
          cardClass="bg-teal-50 border-teal-200" iconBg="bg-teal-200" iconText="text-teal-600" numClass="text-teal-700" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">12-Week Trend</CardTitle>
              <CardDescription>Platform performance over time</CardDescription>
            </div>
            <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reach">Reach</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                {PLATFORM_CONFIG.map(p => (
                  <linearGradient key={p.key} id={`grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={p.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={p.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              {PLATFORM_CONFIG.map(p => (
                <Area
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  stroke={p.color}
                  strokeWidth={2}
                  fill={`url(#grad-${p.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Engagement Rate by Platform</CardTitle>
            <CardDescription>Average % of reached users who engaged</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={engagementByPlatform} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: any) => [`${v}%`, "Eng. Rate"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {engagementByPlatform.map((entry) => (
                    <Cell key={entry.platform} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follower Distribution</CardTitle>
            <CardDescription>Total followers across all platforms</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={followerDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {followerDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [fmtFull(v), "Followers"]} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
              {followerDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ByPlatformTab() {
  const [selected, setSelected] = useState("Instagram");
  const snap = platformSnapshots.find(p => p.platform === selected)!;

  const weekData = weeklyReach.map(w => ({
    week: w.week,
    Reach: w[selected as keyof typeof w] as number,
    Followers: weeklyFollowers.find(f => f.week === w.week)?.[selected as keyof typeof w] as number ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {platformSnapshots.map(p => (
          <button
            key={p.platform}
            onClick={() => setSelected(p.platform)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              selected === p.platform
                ? "border-transparent text-white shadow-sm"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
            style={selected === p.platform ? { backgroundColor: p.color } : {}}
          >
            <PlatformBadge platform={p.platform.toLowerCase()} showText={false} />
            {p.platform}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Followers",      value: fmtFull(snap.followers) },
          { label: "Growth (30d)",   value: `+${fmtFull(snap.followerGrowth)}  (+${snap.followerGrowthPct}%)` },
          { label: "Reach (30d)",    value: fmt(snap.reach30d) },
          { label: "Impressions",    value: fmt(snap.impressions30d) },
          { label: "Eng. Rate",      value: `${snap.engagementRate}%` },
          { label: "Posts",          value: String(snap.postsPublished) },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
              <p className="text-lg font-bold mt-1 leading-tight">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{selected} — 12-Week Reach Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weekData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={snap.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={snap.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Reach" stroke={snap.color} strokeWidth={2.5} fill="url(#pGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform Highlight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: snap.color }} />
            <div>
              <p className="text-sm font-medium">{snap.topMetricLabel}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{snap.topMetricValue}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Avg Reach / Post</p>
              <p className="text-base font-semibold mt-0.5">{fmtFull(snap.avgReachPerPost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Engagements (30d)</p>
              <p className="text-base font-semibold mt-0.5">{fmtFull(snap.totalEngagements)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type SortKey = "engagementRate" | "reach" | "impressions" | "likes";

function TopContentTab() {
  const [sort, setSort] = useState<SortKey>("engagementRate");
  const [platformFilter, setPlatformFilter] = useState("all");

  const sorted = [...postPerformance]
    .filter(p => platformFilter === "all" || p.platforms.includes(platformFilter))
    .sort((a, b) => (b[sort] as number) - (a[sort] as number));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagementRate">Engagement Rate</SelectItem>
            <SelectItem value="reach">Reach</SelectItem>
            <SelectItem value="impressions">Impressions</SelectItem>
            <SelectItem value="likes">Likes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Instagram">Instagram</SelectItem>
            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {sorted.map((post, i) => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                  i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                  i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {post.platforms.map(p => (
                          <PlatformBadge key={p} platform={p.toLowerCase()} showText={false} />
                        ))}
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-semibold">
                      {post.engagementRate}% Eng.
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</p>
                      <p className="text-sm font-semibold">{fmtFull(post.reach)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions</p>
                      <p className="text-sm font-semibold">{fmtFull(post.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {post.videoViews ? "Video Views" : "Likes"}
                      </p>
                      <p className="text-sm font-semibold">
                        {fmtFull(post.videoViews ?? post.likes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comments</p>
                      <p className="text-sm font-semibold">{fmtFull(post.comments)}</p>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((post.engagementRate / 10) * 100, 100)}%`,
                        backgroundColor: PLATFORM_CONFIG.find(p => p.key === post.platforms[0])?.color ?? "#6B7280",
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type Period = "7d" | "30d" | "90d";

function ReportsTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const [platforms, setPlatforms] = useState(["Facebook", "Instagram", "LinkedIn", "TikTok"]);
  const [generated, setGenerated] = useState(false);

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const periodLabel: Record<Period, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

  const reportRows = platformSnapshots.filter(p => platforms.includes(p.platform)).map(p => ({
    Platform: p.platform,
    Followers: fmtFull(p.followers),
    "Follower Growth": `+${fmtFull(p.followerGrowth)}`,
    "Reach (30d)": fmtFull(p.reach30d),
    "Impressions (30d)": fmtFull(p.impressions30d),
    "Avg Engagement Rate": `${p.engagementRate}%`,
    "Total Engagements": fmtFull(p.totalEngagements),
    "Posts Published": p.postsPublished,
  }));

  const downloadCsv = () => {
    if (reportRows.length === 0) return;
    const headers = Object.keys(reportRows[0]).join(",");
    const rows = reportRows.map(r => Object.values(r).map(v => `"${v}"`).join(","));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Configuration</CardTitle>
          <CardDescription>Choose the period and platforms to include in your report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Period</label>
            <div className="flex gap-2 flex-wrap">
              {(["7d", "30d", "90d"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setGenerated(false); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    period === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {platformSnapshots.map(p => (
                <button
                  key={p.platform}
                  onClick={() => { togglePlatform(p.platform); setGenerated(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
                    platforms.includes(p.platform)
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  style={platforms.includes(p.platform) ? { backgroundColor: p.color } : {}}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${platforms.includes(p.platform) ? "bg-white" : "bg-muted-foreground"}`} />
                  {p.platform}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setGenerated(true)} disabled={platforms.length === 0}>
              Preview Report
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={!generated || platforms.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && reportRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              KPI Report — {periodLabel[period]}
            </CardTitle>
            <CardDescription>
              Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {Object.keys(reportRows[0]).map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className="px-4 py-3 whitespace-nowrap">
                        {k === "Platform" ? (
                          <div className="flex items-center gap-2">
                            <PlatformBadge platform={String(v).toLowerCase()} showText={false} />
                            <span className="font-medium">{v}</span>
                          </div>
                        ) : (
                          <span className={k === "Avg Engagement Rate" ? "font-semibold text-primary" : ""}>{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t">
                <tr>
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">TOTALS / AVG</td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {fmtFull(reportRows.reduce((acc, r) => acc + parseInt(r.Followers.replace(/,/g, "")), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">—</td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {fmtFull(reportRows.reduce((acc, r) => acc + parseInt(r["Reach (30d)"].replace(/,/g, "")), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {fmtFull(reportRows.reduce((acc, r) => acc + parseInt(r["Impressions (30d)"].replace(/,/g, "")), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {(reportRows.reduce((acc, r) => acc + parseFloat(r["Avg Engagement Rate"]), 0) / reportRows.length).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {fmtFull(reportRows.reduce((acc, r) => acc + parseInt(r["Total Engagements"].replace(/,/g, "")), 0))}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {reportRows.reduce((acc, r) => acc + Number(r["Posts Published"]), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {generated && platforms.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Select at least one platform to generate a report.</p>
        </Card>
      )}
    </div>
  );
}

export default function KPI() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const tab = params.get("tab") || "overview";

  const setTab = (t: string) => setLocation(`/kpi?tab=${t}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Social media performance metrics and reports</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Mock Data · Real API coming soon
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="flex flex-row w-full overflow-x-auto justify-start h-auto p-1 gap-1 bg-muted rounded-lg">
          <TabsTrigger value="overview"      className="shrink-0 px-3 py-1.5 text-sm">Overview</TabsTrigger>
          <TabsTrigger value="platform"      className="shrink-0 px-3 py-1.5 text-sm">By Platform</TabsTrigger>
          <TabsTrigger value="top-content"   className="shrink-0 px-3 py-1.5 text-sm">Top Content</TabsTrigger>
          <TabsTrigger value="reports"       className="shrink-0 px-3 py-1.5 text-sm">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"    className="m-0"><OverviewTab /></TabsContent>
        <TabsContent value="platform"    className="m-0"><ByPlatformTab /></TabsContent>
        <TabsContent value="top-content" className="m-0"><TopContentTab /></TabsContent>
        <TabsContent value="reports"     className="m-0"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
