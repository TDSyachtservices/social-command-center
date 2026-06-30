import { useEffect, useRef, useState } from "react";
import { Users, TrendingUp, RefreshCw, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";
import { listAccounts, isApiConfigured, getLatestPlatformStats, ApiAccount } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, sub }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function FacebookPage() {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [followers, setFollowers] = useState<number | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fbAccounts = accounts.filter((a) => a.platform === "FACEBOOK" && a.connectionStatus === "connected");

  const fetchStats = async (silent = false) => {
    if (!isApiConfigured()) return;
    if (!silent) setRefreshing(true);
    try {
      const firstAccount = fbAccounts[0];
      if (firstAccount) {
        const stats = await getLatestPlatformStats("FACEBOOK", firstAccount.id);
        if (stats !== null) setFollowers(stats);
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    const data = await listAccounts();
    if (data) setAccounts(data);
    setLoadingAccounts(false);
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (fbAccounts.length > 0) {
      void fetchStats(true);
    }
  }, [fbAccounts.length]);

  useEffect(() => {
    pollRef.current = setInterval(() => void fetchStats(true), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fbAccounts.length]);

  const handleRefresh = async () => {
    await fetchStats(false);
    toast({ title: "Facebook stats refreshed" });
  };

  const connected = fbAccounts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Facebook</h1>
          <p className="text-sm text-muted-foreground">
            {connected
              ? `Connected as ${fbAccounts.map((a) => a.accountName).join(", ")}`
              : "No Facebook page connected"}
          </p>
        </div>
        {isApiConfigured() && connected && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {!loadingAccounts && !connected && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <Facebook className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No Facebook page connected</p>
          <p className="text-sm mt-1">
            Go to <a href="/connected-accounts" className="underline">Connected Accounts</a> to link your Facebook page.
          </p>
        </div>
      )}

      {connected && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Page Fans"
            value={followers !== null ? followers.toLocaleString() : "—"}
            icon={Users}
            sub="Latest polled count"
          />
          <StatCard
            label="Pages"
            value={fbAccounts.length}
            icon={TrendingUp}
            sub="Connected Facebook pages"
          />
          <StatCard
            label="Status"
            value="Active"
            icon={RefreshCw}
            sub="Polling every hour"
          />
        </div>
      )}

      <NotificationFeed
        platform="FACEBOOK"
        pollIntervalMs={30_000}
        className="min-h-[400px]"
      />
    </div>
  );
}
