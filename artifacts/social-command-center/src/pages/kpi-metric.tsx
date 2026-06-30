import { useRoute, Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, TrendingUp, TrendingDown, Eye, BarChart2, Heart,
  Share2, Users, ChevronUp, FileText,
} from "lucide-react";
import {
  KPI_METRICS, getPostEngagements, type MetricId, type MetricDef,
} from "@/data/kpiMetrics";
import { PLATFORM_CONFIG, postPerformance } from "@/data/mockKpi";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const ICONS: Record<string, React.ElementType> = {
  Eye, BarChart2, Heart, Share2, Users, ChevronUp, FileText, TrendingUp,
};

const fmtFull = (n: number) => n.toLocaleString();
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function CustomTooltip({ active, payload, label }: any) {
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
}

function CalcExpression({ metric }: { metric: MetricDef }) {
  if (metric.formula) {
    return <code className="text-sm font-mono text-foreground/80 break-words">{metric.formula}</code>;
  }
  if (metric.unit === "count") {
    const parts = metric.breakdown.map((b) => fmtFull(b.value)).join("  +  ");
    return (
      <code className="text-sm font-mono text-foreground/80 break-words">
        {parts}  =  {fmtFull(metric.rawTotal)}
      </code>
    );
  }
  if (metric.unit === "percent") {
    const parts = metric.breakdown.map((b) => `${b.value}`).join(" + ");
    return (
      <code className="text-sm font-mono text-foreground/80 break-words">
        ({parts}) ÷ {metric.breakdown.length} = {metric.rawTotal}%
      </code>
    );
  }
  return null;
}

function PostsTable({ metric }: { metric: NonNullable<MetricDef["posts"]> }) {
  const valueFor = (p: (typeof postPerformance)[number]) => {
    switch (metric.metric) {
      case "reach": return p.reach;
      case "impressions": return p.impressions;
      case "engagements": return getPostEngagements(p);
      case "engagementRate": return p.engagementRate;
    }
  };
  const isRate = metric.metric === "engagementRate";
  const rows = [...postPerformance].sort((a, b) =>
    metric.sort === "date"
      ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      : valueFor(b) - valueFor(a),
  );
  const colLabel =
    metric.metric === "reach" ? "Reach"
      : metric.metric === "impressions" ? "Impressions"
      : metric.metric === "engagements" ? "Engagements"
      : "Eng. Rate";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{metric.title}</CardTitle>
        <CardDescription>{metric.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Post</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">Published</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">{colLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 max-w-[260px]">
                  <span className="font-medium line-clamp-1">{p.title}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {p.platforms.map((pl) => (
                      <PlatformBadge key={pl} platform={pl.toLowerCase()} showText={false} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                  {new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  {isRate ? `${valueFor(p)}%` : fmtFull(valueFor(p))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function KpiMetric() {
  const [, params] = useRoute("/kpi/metric/:metricId");
  const metricId = params?.metricId as MetricId | undefined;
  const metric = metricId ? KPI_METRICS[metricId] : undefined;

  if (!metric) {
    return (
      <div className="space-y-4">
        <Link href="/kpi?tab=overview">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to KPI Dashboard
          </Button>
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">That metric could not be found.</p>
        </Card>
      </div>
    );
  }

  const Icon = ICONS[metric.iconName] ?? TrendingUp;
  const { theme } = metric;
  const total = metric.breakdown.reduce((a, b) => a + b.value, 0);
  const maxValue = Math.max(...metric.breakdown.map((b) => b.value));
  const shareUnit = metric.unit === "count";

  return (
    <div className="space-y-5">
      <Link href="/kpi?tab=overview">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to KPI Dashboard
        </Button>
      </Link>

      {/* Hero */}
      <Card className={theme.cardClass}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.label}</p>
              <p className={`text-4xl font-bold mt-2 leading-none ${theme.numClass}`}>{metric.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{metric.sub}</p>
              {metric.trend && (
                <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${metric.trendUp ? "text-emerald-600" : "text-red-600"}`}>
                  {metric.trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {metric.trend} vs prior period
                </div>
              )}
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
              <Icon className={`h-6 w-6 ${theme.iconText}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it's calculated */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How this is calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{metric.calc}</p>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <CalcExpression metric={metric} />
          </div>
        </CardContent>
      </Card>

      {/* Per-platform breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breakdown by Platform</CardTitle>
            <CardDescription>
              {shareUnit ? "Each platform's contribution to the total" : "Value per platform"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metric.breakdown.map((b) => {
                const barPct = shareUnit
                  ? (total ? (b.value / total) * 100 : 0)
                  : (maxValue ? (b.value / maxValue) * 100 : 0);
                return (
                  <div key={b.platform}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={b.platform.toLowerCase()} showText={false} />
                        <span className="font-medium">{b.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{b.display}</span>
                        {shareUnit && (
                          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                            {barPct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barPct}%`, backgroundColor: b.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Comparison</CardTitle>
            <CardDescription>Side-by-side view</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metric.breakdown} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (metric.unit === "percent" ? `${v}%` : v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  formatter={(v: any) => [metric.unit === "percent" ? `${v}%` : fmtFull(v), metric.label]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {metric.breakdown.map((entry) => (
                    <Cell key={entry.platform} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly trend */}
      {metric.weekly && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{metric.weekly.label}</CardTitle>
            <CardDescription>{metric.weekly.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={metric.weekly.data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  {PLATFORM_CONFIG.map((p) => (
                    <linearGradient key={p.key} id={`mgrad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={p.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={p.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {PLATFORM_CONFIG.map((p) => (
                  <Area key={p.key} type="monotone" dataKey={p.key} stroke={p.color} strokeWidth={2} fill={`url(#mgrad-${p.key})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Contributing posts */}
      {metric.posts && <PostsTable metric={metric.posts} />}

      <div className="flex items-center gap-2 pt-1">
        <Badge variant="outline" className="text-xs">Mock Data · Real API coming soon</Badge>
        <span className="text-xs text-muted-foreground">
          {metric.unit === "count" && `${fmt(total)} total across platforms`}
          {metric.unit === "percent" && `${metric.value} average across platforms`}
          {metric.unit === "avg" && `${metric.value} per post`}
        </span>
      </div>
    </div>
  );
}
