import { useState, useEffect, useRef } from "react";
import { Clock, Info, TrendingUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getBestTimeToPost, type BestTimeData, type BestTimeCell } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

const PLATFORM_COLOR_CSS: Record<string, string> = {
  FACEBOOK: "hsl(253, 65%, 55%)",
  INSTAGRAM: "hsl(340, 70%, 55%)",
  LINKEDIN: "hsl(200, 70%, 45%)",
};

// ─── Colour helpers ───────────────────────────────────────────────────────────

function cellBg(count: number, maxCount: number, platform: string): string {
  if (count === 0 || maxCount === 0) return "";
  const t = count / maxCount; // 0–1
  // We interpolate from very faint to the platform accent
  const base = PLATFORM_COLOR_CSS[platform] ?? "hsl(253, 65%, 55%)";
  // Use opacity to represent intensity
  return `color-mix(in srgb, ${base} ${Math.round(15 + t * 85)}%, white)`;
}

function textColor(count: number, maxCount: number): string {
  if (maxCount === 0) return "";
  return count / maxCount > 0.65 ? "text-white" : "text-foreground/70";
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface CellTooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  count: number;
}

// ─── Build grid ───────────────────────────────────────────────────────────────

function buildGrid(heatmap: BestTimeCell[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const { day, hour, count } of heatmap) {
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) grid[day][hour] = count;
  }
  return grid;
}

function topSlots(heatmap: BestTimeCell[], n = 3) {
  return [...heatmap]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((c) => ({
      ...c,
      label: `${DAYS[c.day]} at ${formatHour(c.hour)}`,
    }));
}

// ─── Heatmap component ────────────────────────────────────────────────────────

function Heatmap({
  heatmap,
  platform,
}: {
  heatmap: BestTimeCell[];
  platform: string;
}) {
  const grid = buildGrid(heatmap);
  const maxCount = Math.max(...heatmap.map((c) => c.count), 1);
  const tooltipRef = useRef<CellTooltipState | null>(null);
  const [tooltip, setTooltip] = useState<CellTooltipState>({ visible: false, x: 0, y: 0, label: "", count: 0 });

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const CELL_W = 28; // px
  const CELL_H = 26; // px
  const LABEL_W = 36; // left label column

  const totalW = LABEL_W + 24 * CELL_W;

  return (
    <div className="relative select-none">
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 px-2.5 py-1.5 bg-popover border border-border rounded-md shadow-md text-xs font-medium"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          <span className="text-foreground">{tooltip.label}</span>
          <span className="text-muted-foreground ml-1.5">· {tooltip.count} interaction{tooltip.count !== 1 ? "s" : ""}</span>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div style={{ width: totalW, minWidth: totalW }}>
          {/* Hour header */}
          <div className="flex" style={{ paddingLeft: LABEL_W }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-shrink-0 text-[9px] text-muted-foreground text-center leading-none pb-1"
                style={{ width: CELL_W }}
              >
                {h % 3 === 0 ? formatHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((day, d) => (
            <div key={day} className="flex items-center mb-0.5">
              {/* Day label */}
              <div
                className="flex-shrink-0 text-[10px] font-medium text-muted-foreground text-right pr-2 leading-none"
                style={{ width: LABEL_W, height: CELL_H, display: "flex", alignItems: "center", justifyContent: "flex-end" }}
              >
                {day}
              </div>

              {/* Hour cells */}
              {HOURS.map((h) => {
                const count = grid[d][h];
                const bg = cellBg(count, maxCount, platform);
                const tc = textColor(count, maxCount);

                return (
                  <div
                    key={h}
                    className={`flex-shrink-0 rounded-[3px] cursor-default transition-opacity hover:opacity-80 ${tc}`}
                    style={{
                      width: CELL_W - 2,
                      height: CELL_H - 2,
                      marginRight: 2,
                      backgroundColor: bg || "hsl(220, 13%, 93%)",
                    }}
                    onMouseEnter={(e) => {
                      tooltipRef.current = { visible: true, x: e.clientX, y: e.clientY, label: `${day} ${formatHour(h)}`, count };
                      setTooltip({ visible: true, x: e.clientX, y: e.clientY, label: `${day} ${formatHour(h)}`, count });
                    }}
                    onMouseLeave={() => {
                      tooltipRef.current = null;
                      setTooltip((prev) => ({ ...prev, visible: false }));
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 pl-9">
            <span className="text-[10px] text-muted-foreground">Less active</span>
            <div className="flex gap-0.5">
              {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                <div
                  key={t}
                  className="w-4 h-4 rounded-[2px]"
                  style={{
                    backgroundColor:
                      t === 0.05
                        ? "hsl(220, 13%, 93%)"
                        : `color-mix(in srgb, ${PLATFORM_COLOR_CSS[platform] ?? "hsl(253,65%,55%)"} ${Math.round(15 + t * 85)}%, white)`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">Most active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Top Slot Card ────────────────────────────────────────────────────────────

function TopSlotBadge({
  rank,
  label,
  count,
  platform,
}: {
  rank: number;
  label: string;
  count: number;
  platform: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="text-xl leading-none">{medals[rank] ?? `#${rank + 1}`}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{count} interaction{count !== 1 ? "s" : ""} avg</p>
      </div>
      <div
        className="w-2 h-8 rounded-full shrink-0"
        style={{ backgroundColor: PLATFORM_COLOR_CSS[platform] ?? "hsl(253,65%,55%)" }}
      />
    </div>
  );
}

// ─── Platform Tab ─────────────────────────────────────────────────────────────

function PlatformPanel({
  platform,
  data,
}: {
  platform: string;
  data: { heatmap: BestTimeCell[]; totalComments: number } | undefined;
}) {
  if (!data || data.heatmap.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
        <p className="font-medium text-muted-foreground">No engagement data yet for {PLATFORM_LABELS[platform] ?? platform}</p>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          As comments and replies come in via the Social Inbox, you'll see a heatmap of when your audience is most active.
        </p>
      </div>
    );
  }

  const top = topSlots(data.heatmap);

  return (
    <div className="space-y-6">
      {/* Top slots */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          Best Times to Post
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {top.map((slot, i) => (
            <TopSlotBadge
              key={`${slot.day}-${slot.hour}`}
              rank={i}
              label={slot.label}
              count={slot.count}
              platform={platform}
            />
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Audience Activity Heatmap</h3>
        <Heatmap heatmap={data.heatmap} platform={platform} />
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t">
        <Info className="w-3.5 h-3.5 shrink-0" />
        Based on {data.totalComments.toLocaleString()} comment{data.totalComments !== 1 ? "s" : ""} over the last 90 days. Times shown in UTC — adjust for your timezone as needed.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PLATFORMS = ["FACEBOOK", "INSTAGRAM", "LINKEDIN"];

export default function BestTimeToPost() {
  const [data, setData] = useState<BestTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("FACEBOOK");

  useEffect(() => {
    getBestTimeToPost()
      .then((d) => setData(d ?? {}))
      .finally(() => setIsLoading(false));
  }, []);

  // Default to first platform that has data
  useEffect(() => {
    if (!data) return;
    const firstWithData = PLATFORMS.find((p) => (data[p]?.heatmap?.length ?? 0) > 0);
    if (firstWithData) setActiveTab(firstWithData);
  }, [data]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Best Time to Post</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Discover when your audience is most active based on comment patterns across your connected platforms.
          </p>
        </div>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">
            This heatmap analyses <strong>when comments arrive</strong> on your posts — a strong proxy for when your audience is online and engaged.
            The darker a cell, the more activity that time slot has seen. Aim to publish 1–2 hours before peak engagement windows.
          </p>
        </CardContent>
      </Card>

      {/* Main content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Engagement by Day &amp; Hour</CardTitle>
          <CardDescription>Last 90 days · All connected accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                {PLATFORMS.map((p) => {
                  const hasData = (data?.[p]?.heatmap?.length ?? 0) > 0;
                  return (
                    <TabsTrigger key={p} value={p} className="gap-1.5">
                      {PLATFORM_LABELS[p]}
                      {hasData && (
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {PLATFORMS.map((p) => (
                <TabsContent key={p} value={p}>
                  <PlatformPanel platform={p} data={data?.[p]} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
