import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Users, Eye, Heart, FileText,
  BarChart2, Info, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import {
  listAccounts, listPosts, getFacebookInsights, getInstagramInsights,
  type ApiAccount, type ApiPost, type ApiFacebookInsights, type ApiInstagramInsights,
} from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const PLATFORM_COLOR: Record<string, string> = {
  facebook:  "#7C6FD0",
  instagram: "#E0607A",
  linkedin:  "#52ABC8",
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtFull = (n: number) => n.toLocaleString();
const pct = (n: number) => `${n >= 0 ? "+" : ""}${fmtFull(n)}`;

function StatCard({
  label, value, sub, colorClass, loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <p className={`text-2xl font-bold mt-1 ${colorClass ?? ""}`}>{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function UnavailableCard({ label, sub }: { label: string; sub?: string }) {
  return (
    <Card className="opacity-60">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-1 text-muted-foreground">—</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function InsightsUnavailableNote({ platform }: { platform: string }) {
  const scopeMap: Record<string, string> = {
    instagram: "instagram_manage_insights",
    linkedin: "r_organization_social_feed (requires LinkedIn Marketing API partner access)",
  };
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <Info className="h-4 w-4 text-amber-600 shrink-0" />
      <AlertDescription className="text-xs">
        {platform} Insights require the <code className="font-mono">{scopeMap[platform.toLowerCase()] ?? "analytics"}</code> scope. Connect the account with that scope to see live metrics.
      </AlertDescription>
    </Alert>
  );
}

// Group daily data points into weeks (label = last day of each 7-day group)
function toWeekly(daily: { date: string; value: number }[]) {
  const weeks: { week: string; value: number }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    const total = chunk.reduce((s, p) => s + p.value, 0);
    const label = chunk.at(-1)?.date.slice(5) ?? `W${Math.floor(i / 7) + 1}`; // MM-DD
    weeks.push({ week: label, value: total });
  }
  return weeks;
}

export default function KPI() {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [insights, setInsights] = useState<Record<string, ApiFacebookInsights>>({});
  const [insightsLoading, setInsightsLoading] = useState<Record<string, boolean>>({});
  const [insightsError, setInsightsError] = useState<Record<string, string>>({});
  const [igInsights, setIgInsights] = useState<Record<string, ApiInstagramInsights>>({});
  const [igInsightsLoading, setIgInsightsLoading] = useState<Record<string, boolean>>({});
  const [igInsightsError, setIgInsightsError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAccounts(), listPosts({ limit: 100 })]).then(([accs, ps]) => {
      const connectedFb = (accs ?? []).filter(
        a => a.platform === "FACEBOOK" && a.connectionStatus === "connected",
      );
      const connectedIg = (accs ?? []).filter(
        a => a.platform === "INSTAGRAM" && a.connectionStatus === "connected",
      );
      if (accs) setAccounts(accs);
      if (ps) setPosts(ps);
      setLoading(false);

      connectedFb.forEach(acc => {
        setInsightsLoading(prev => ({ ...prev, [acc.id]: true }));
        getFacebookInsights(acc.id).then(result => {
          if (result && "data" in result) {
            setInsights(prev => ({ ...prev, [acc.id]: result.data }));
            setInsightsError(prev => { const n = { ...prev }; delete n[acc.id]; return n; });
          } else {
            const msg = (result && "error" in result && result.error) || "Could not load Facebook insights";
            setInsightsError(prev => ({ ...prev, [acc.id]: msg }));
          }
        }).finally(() => {
          setInsightsLoading(prev => { const n = { ...prev }; delete n[acc.id]; return n; });
        });
      });

      connectedIg.forEach(acc => {
        setIgInsightsLoading(prev => ({ ...prev, [acc.id]: true }));
        getInstagramInsights(acc.id).then(result => {
          if (result && "data" in result) {
            setIgInsights(prev => ({ ...prev, [acc.id]: result.data }));
            setIgInsightsError(prev => { const n = { ...prev }; delete n[acc.id]; return n; });
          } else {
            const msg = (result && "error" in result && result.error) || "Could not load Instagram insights";
            setIgInsightsError(prev => ({ ...prev, [acc.id]: msg }));
          }
        }).finally(() => {
          setIgInsightsLoading(prev => { const n = { ...prev }; delete n[acc.id]; return n; });
        });
      });
    });
  }, []);

  const refreshInsights = (accountId: string) => {
    setInsightsLoading(prev => ({ ...prev, [accountId]: true }));
    setInsightsError(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    getFacebookInsights(accountId).then(result => {
      if (result && "data" in result) {
        setInsights(prev => ({ ...prev, [accountId]: result.data }));
        setInsightsError(prev => { const n = { ...prev }; delete n[accountId]; return n; });
      } else {
        const msg = (result && "error" in result && result.error) || "Could not load Facebook insights";
        setInsightsError(prev => ({ ...prev, [accountId]: msg }));
      }
    }).finally(() => {
      setInsightsLoading(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    });
  };

  const refreshIgInsights = (accountId: string) => {
    setIgInsightsLoading(prev => ({ ...prev, [accountId]: true }));
    setIgInsightsError(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    getInstagramInsights(accountId).then(result => {
      if (result && "data" in result) {
        setIgInsights(prev => ({ ...prev, [accountId]: result.data }));
        setIgInsightsError(prev => { const n = { ...prev }; delete n[accountId]; return n; });
      } else {
        const msg = (result && "error" in result && result.error) || "Could not load Instagram insights";
        setIgInsightsError(prev => ({ ...prev, [accountId]: msg }));
      }
    }).finally(() => {
      setIgInsightsLoading(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    });
  };

  const connectedAccounts = accounts.filter(a => a.connectionStatus === "connected");
  const connectedFbAccounts = connectedAccounts.filter(a => a.platform === "FACEBOOK");
  const connectedIgAccounts = connectedAccounts.filter(a => a.platform === "INSTAGRAM");
  const connectedPlatforms = [...new Set(connectedAccounts.map(a => a.platform.toLowerCase()))];

  const publishedPosts = posts.filter(p => p.status.toLowerCase() === "published");
  const scheduledPosts = posts.filter(p => p.status.toLowerCase() === "scheduled");
  const draftPosts     = posts.filter(p => p.status.toLowerCase() === "draft");
  const failedPosts    = posts.filter(p => p.status.toLowerCase() === "failed");

  // Facebook aggregates
  const allFbInsights    = Object.values(insights);
  const totalFollowers   = allFbInsights.reduce((s, i) => s + i.followers, 0);
  const totalGrowth      = allFbInsights.reduce((s, i) => s + i.followerGrowth30d, 0);
  const totalReach       = allFbInsights.reduce((s, i) => s + i.reach30d, 0);
  const totalImpressions = allFbInsights.reduce((s, i) => s + i.impressions30d, 0);
  const totalEngaged     = allFbInsights.reduce((s, i) => s + i.engagedUsers30d, 0);
  const avgEngRate       = totalReach > 0 ? Math.round((totalEngaged / totalReach) * 1000) / 10 : 0;
  const hasFbInsights    = allFbInsights.length > 0;
  const fbInsightsLoading = Object.keys(insightsLoading).length > 0;

  // Instagram aggregates
  const allIgInsights      = Object.values(igInsights);
  const igTotalFollowers   = allIgInsights.reduce((s, i) => s + i.followers, 0);
  const igTotalGrowth      = allIgInsights.reduce((s, i) => s + i.followerGrowth30d, 0);
  const igTotalReach       = allIgInsights.reduce((s, i) => s + i.reach30d, 0);
  const igTotalImpressions = allIgInsights.reduce((s, i) => s + i.impressions30d, 0);
  const igTotalProfileViews = allIgInsights.reduce((s, i) => s + i.profileViews30d, 0);
  const hasIgInsights      = allIgInsights.length > 0;
  const igInsightsLoadingAny = Object.keys(igInsightsLoading).length > 0;

  const postsByPlatform = connectedPlatforms.map(platform => ({
    platform,
    published: publishedPosts.filter(p => p.platforms.some(pl => pl.platform.toLowerCase() === platform)).length,
    scheduled: scheduledPosts.filter(p => p.platforms.some(pl => pl.platform.toLowerCase() === platform)).length,
  }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Social media performance metrics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasFbInsights && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Facebook Insights live
            </Badge>
          )}
          {hasIgInsights && (
            <Badge className="bg-pink-100 text-pink-800 border-pink-200 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Instagram Insights live
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">By Platform</TabsTrigger>
          <TabsTrigger value="content">Published Posts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">

          {/* Post counts — always real */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Posts Published" value={loading ? "…" : publishedPosts.length}
              sub="All time, all platforms" colorClass="text-violet-700" loading={loading} />
            <StatCard label="Scheduled" value={loading ? "…" : scheduledPosts.length}
              sub="Queued for publishing" colorClass="text-sky-700" loading={loading} />
            <StatCard label="Drafts" value={loading ? "…" : draftPosts.length}
              sub="Unpublished" colorClass="text-emerald-700" loading={loading} />
            <StatCard label="Failed" value={loading ? "…" : failedPosts.length}
              sub="Need attention" colorClass="text-rose-700" loading={loading} />
          </div>

          {/* Facebook Insights — real if connected */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <PlatformBadge platform="facebook" showText={false} />
              Facebook Page Insights (30 days)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {fbInsightsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-7 w-16" /></CardContent></Card>
                ))
              ) : hasFbInsights ? (
                <>
                  <StatCard label="Followers" value={fmtFull(totalFollowers)} sub="Current page followers" colorClass="text-indigo-700" />
                  <StatCard label="Fan Growth (30d)" value="—" sub="Not tracked — Meta removed this metric" colorClass="text-muted-foreground" />
                  <StatCard label="Page Views (30d)" value={fmt(totalReach)} sub="Total visits to your page" colorClass="text-sky-700" />
                  <StatCard label="Post Engagements (30d)" value={fmt(totalEngaged)} sub="Likes, comments & shares on posts" colorClass="text-orange-700" />
                  <StatCard label="Connected Accounts" value={connectedAccounts.length} sub="Active connections" colorClass="text-indigo-700" />
                  <StatCard label="FB Accounts" value={connectedFbAccounts.length} sub="With insights access" colorClass="text-indigo-700" />
                </>
              ) : connectedFbAccounts.length === 0 ? (
                <div className="col-span-4">
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <AlertDescription className="text-xs">
                      No Facebook account is connected. <Link href="/connected-accounts" className="underline font-medium">Connect Facebook</Link> to see Page Insights.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                Object.entries(insightsError).map(([id, err]) => (
                  <div key={id} className="col-span-4">
                    <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                      <Info className="h-4 w-4 text-rose-600 shrink-0" />
                      <AlertDescription className="text-xs flex items-center justify-between gap-2">
                        <span>{err}</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs shrink-0 border-rose-300" onClick={() => refreshInsights(id)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instagram Insights — real if connected */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <PlatformBadge platform="instagram" showText={false} />
              Instagram Account Insights (30 days)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {igInsightsLoadingAny ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-7 w-16" /></CardContent></Card>
                ))
              ) : hasIgInsights ? (
                <>
                  <StatCard label="Followers" value={fmtFull(igTotalFollowers)} sub="Current followers" colorClass="text-pink-700" />
                  <StatCard label="Growth (30d)" value={pct(igTotalGrowth)} sub="Net new followers" colorClass={igTotalGrowth >= 0 ? "text-emerald-700" : "text-rose-700"} />
                  <StatCard label="Reach (30d)" value={fmt(igTotalReach)} sub="Unique accounts reached" colorClass="text-sky-700" />
                  <StatCard label="Impressions (30d)" value={fmt(igTotalImpressions)} sub="Total content views" colorClass="text-violet-700" />
                  <StatCard label="Profile Views (30d)" value={fmt(igTotalProfileViews)} sub="Profile page visits" colorClass="text-orange-700" />
                  <StatCard label="IG Accounts" value={connectedIgAccounts.length} sub="Connected" colorClass="text-pink-700" />
                </>
              ) : connectedIgAccounts.length === 0 ? (
                <div className="col-span-4">
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <AlertDescription className="text-xs">
                      No Instagram account is connected. <Link href="/connected-accounts" className="underline font-medium">Connect Instagram</Link> to see Account Insights.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                Object.entries(igInsightsError).map(([id, err]) => (
                  <div key={id} className="col-span-4">
                    <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                      <Info className="h-4 w-4 text-rose-600 shrink-0" />
                      <AlertDescription className="text-xs flex items-center justify-between gap-2">
                        <span>{err}</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs shrink-0 border-rose-300" onClick={() => refreshIgInsights(id)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Facebook Reach trend chart */}
          {hasFbInsights && allFbInsights[0]?.dailyReach.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Facebook Page Views — Last 30 Days</CardTitle>
                <CardDescription>Total page visits per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={allFbInsights[0].dailyReach.map(d => ({ date: d.date.slice(5), value: d.value }))}
                    margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fbReachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C6FD0" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#7C6FD0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [fmtFull(v), "Page Views"]} />
                    <Area type="monotone" dataKey="value" stroke="#7C6FD0" strokeWidth={2.5} fill="url(#fbReachGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Instagram Reach trend chart */}
          {hasIgInsights && allIgInsights[0]?.dailyReach.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Instagram Reach — Last 30 Days</CardTitle>
                <CardDescription>Unique accounts reached per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={allIgInsights[0].dailyReach.map(d => ({ date: d.date.slice(5), value: d.value }))}
                    margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="igReachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E0607A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#E0607A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [fmtFull(v), "Reach"]} />
                    <Area type="monotone" dataKey="value" stroke="#E0607A" strokeWidth={2.5} fill="url(#igReachGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Posts by platform bar chart */}
          {postsByPlatform.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posts by Platform</CardTitle>
                <CardDescription>Published across connected accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={postsByPlatform} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="published" name="Published" radius={[4, 4, 0, 0]}>
                      {postsByPlatform.map(entry => (
                        <Cell key={entry.platform} fill={PLATFORM_COLOR[entry.platform] ?? "#6B7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── BY PLATFORM ── */}
        <TabsContent value="platforms" className="space-y-5 mt-4">
          {connectedPlatforms.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No platforms connected</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/connected-accounts">Connect an account</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            connectedPlatforms.map(platform => {
              const color = PLATFORM_COLOR[platform] ?? "#6B7280";
              const platformAccounts = connectedAccounts.filter(a => a.platform.toLowerCase() === platform);
              const platformPublished = publishedPosts.filter(p => p.platforms.some(pl => pl.platform.toLowerCase() === platform)).length;
              const platformScheduled = scheduledPosts.filter(p => p.platforms.some(pl => pl.platform.toLowerCase() === platform)).length;

              // Facebook: show real insights per account
              if (platform === "facebook") {
                return (
                  <div key={platform} className="space-y-3">
                    {platformAccounts.map(acc => {
                      const ins = insights[acc.id];
                      const isLoading = !!insightsLoading[acc.id];
                      const err = insightsError[acc.id];
                      const weeklyReach = ins ? toWeekly(ins.dailyReach) : [];

                      return (
                        <Card key={acc.id} className="overflow-hidden">
                          <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${color}` }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <PlatformBadge platform="facebook" showText={false} />
                                <CardTitle className="text-base">{acc.accountName}</CardTitle>
                                <Badge variant="secondary" className="text-xs">Facebook Page</Badge>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => refreshInsights(acc.id)} disabled={isLoading}>
                                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                                Refresh
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {err && (
                              <Alert className="border-rose-200 bg-rose-50 text-rose-900 mb-4">
                                <Info className="h-4 w-4 text-rose-600 shrink-0" />
                                <AlertDescription className="text-xs">{err}</AlertDescription>
                              </Alert>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                              {[
                                { label: "Followers",          value: isLoading ? null : ins ? fmtFull(ins.followers) : "—" },
                                { label: "Fan Growth (30d)",   value: "—" },
                                { label: "Page Views (30d)",   value: isLoading ? null : ins ? fmt(ins.reach30d) : "—" },
                                { label: "Post Engagements",   value: isLoading ? null : ins ? fmt(ins.engagedUsers30d) : "—" },
                                { label: "Published",          value: platformPublished, accent: color },
                              ].map(m => (
                                <Card key={m.label}>
                                  <CardContent className="p-3">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
                                    {m.value === null
                                      ? <Skeleton className="h-6 w-12 mt-1" />
                                      : <p className="text-lg font-bold mt-1 leading-tight" style={m.accent ? { color: m.accent } : {}}>{m.value}</p>
                                    }
                                  </CardContent>
                                </Card>
                              ))}
                            </div>

                            {weeklyReach.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Reach Trend</p>
                                <ResponsiveContainer width="100%" height={160}>
                                  <AreaChart data={weeklyReach} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [fmtFull(v), "Reach"]} />
                                    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${acc.id})`} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}

                            {platformScheduled > 0 && (
                              <p className="text-xs text-muted-foreground mt-3">{platformScheduled} post{platformScheduled !== 1 ? "s" : ""} scheduled</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              }

              // Instagram: show real insights per account
              if (platform === "instagram") {
                return (
                  <div key={platform} className="space-y-3">
                    {platformAccounts.map(acc => {
                      const ins = igInsights[acc.id];
                      const isLoading = !!igInsightsLoading[acc.id];
                      const err = igInsightsError[acc.id];
                      const weeklyReach = ins ? toWeekly(ins.dailyReach) : [];

                      return (
                        <Card key={acc.id} className="overflow-hidden">
                          <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${color}` }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <PlatformBadge platform="instagram" showText={false} />
                                <CardTitle className="text-base">{acc.accountName}</CardTitle>
                                <Badge variant="secondary" className="text-xs">Instagram Account</Badge>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => refreshIgInsights(acc.id)} disabled={isLoading}>
                                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                                Refresh
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {err && (
                              <Alert className="border-rose-200 bg-rose-50 text-rose-900 mb-4">
                                <Info className="h-4 w-4 text-rose-600 shrink-0" />
                                <AlertDescription className="text-xs">{err}</AlertDescription>
                              </Alert>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                              {[
                                { label: "Followers",       value: isLoading ? null : ins ? fmtFull(ins.followers) : "—" },
                                { label: "Growth (30d)",    value: isLoading ? null : ins ? pct(ins.followerGrowth30d) : "—" },
                                { label: "Reach (30d)",     value: isLoading ? null : ins ? fmt(ins.reach30d) : "—" },
                                { label: "Impressions",     value: isLoading ? null : ins ? fmt(ins.impressions30d) : "—" },
                                { label: "Profile Views",   value: isLoading ? null : ins ? fmt(ins.profileViews30d) : "—" },
                                { label: "Published",       value: platformPublished, accent: color },
                              ].map(m => (
                                <Card key={m.label}>
                                  <CardContent className="p-3">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
                                    {m.value === null
                                      ? <Skeleton className="h-6 w-12 mt-1" />
                                      : <p className="text-lg font-bold mt-1 leading-tight" style={m.accent ? { color: m.accent } : {}}>{m.value}</p>
                                    }
                                  </CardContent>
                                </Card>
                              ))}
                            </div>

                            {weeklyReach.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Reach Trend</p>
                                <ResponsiveContainer width="100%" height={160}>
                                  <AreaChart data={weeklyReach} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={`ig-grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [fmtFull(v), "Reach"]} />
                                    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#ig-grad-${acc.id})`} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}

                            {platformScheduled > 0 && (
                              <p className="text-xs text-muted-foreground mt-3">{platformScheduled} post{platformScheduled !== 1 ? "s" : ""} scheduled</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              }

              // Other platforms — show unavailability note
              return (
                <Card key={platform} className="overflow-hidden">
                  <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={platform} showText={false} />
                      <CardTitle className="text-base capitalize">{platform}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{platformAccounts.length} account{platformAccounts.length !== 1 ? "s" : ""}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InsightsUnavailableNote platform={platform} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {["Followers", "Growth (30d)", "Reach (30d)", "Impressions", "Eng. Rate"].map(label => (
                        <UnavailableCard key={label} label={label} />
                      ))}
                      <Card>
                        <CardContent className="p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Published</p>
                          <p className="text-lg font-bold mt-1" style={{ color }}>{platformPublished}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── PUBLISHED POSTS ── */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <Alert className="border-sky-200 bg-sky-50 text-sky-900">
            <Info className="h-4 w-4 text-sky-600 shrink-0" />
            <AlertDescription className="text-xs">
              Post-level reach, impressions and engagement require the Facebook Post Insights API (per-post metrics). Page-level insights are shown above.
            </AlertDescription>
          </Alert>

          {publishedPosts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No published posts yet</p>
                <Button variant="outline" size="sm" asChild><Link href="/create-post">Create a post</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {publishedPosts.slice(0, 20).map((post, i) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-gray-100 text-gray-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {post.platforms.map(pl => (
                            <PlatformBadge key={pl.platform} platform={pl.platform.toLowerCase()} showText={false} />
                          ))}
                          <span className="text-xs text-muted-foreground">
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-x-6 gap-y-1 mt-3">
                          {["Reach", "Impressions", "Likes", "Comments"].map(label => (
                            <div key={label}>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                              <p className="text-sm font-semibold text-muted-foreground">—</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {publishedPosts.length > 20 && (
                <p className="text-xs text-center text-muted-foreground">Showing 20 of {publishedPosts.length} posts</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── ACCOUNTS ── */}
        <TabsContent value="accounts" className="space-y-4 mt-4">
          {accounts.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No accounts configured</p>
                <Button variant="outline" size="sm" asChild><Link href="/connected-accounts">Go to Settings</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map(account => {
                const isConnected = account.connectionStatus === "connected";
                const fbIns = insights[account.id];
                const igIns = igInsights[account.id];
                const insightData = fbIns ?? igIns;
                return (
                  <Card key={account.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformBadge platform={account.platform.toLowerCase()} showText={false} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{account.accountName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{account.platform.toLowerCase()}</p>
                          </div>
                        </div>
                        {isConnected
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                      </div>
                      {insightData && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Followers</p>
                            <p className="font-semibold mt-0.5">{fmtFull(insightData.followers)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reach (30d)</p>
                            <p className="font-semibold mt-0.5">{fmt(insightData.reach30d)}</p>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className={`font-medium capitalize mt-0.5 ${isConnected ? "text-emerald-600" : "text-amber-600"}`}>
                            {account.connectionStatus.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Sync</p>
                          <p className="font-medium mt-0.5">
                            {account.lastSync
                              ? new Date(account.lastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "Never"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {account.postingCapability && <Badge variant="secondary" className="text-[10px]">Posting</Badge>}
                        {account.commentReadCapability && <Badge variant="secondary" className="text-[10px]">Comments</Badge>}
                        {account.commentReplyCapability && <Badge variant="secondary" className="text-[10px]">Replies</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
