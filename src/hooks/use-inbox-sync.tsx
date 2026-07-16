import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { syncFacebookInbox, isApiConfigured } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between syncs
const SYNC_TIMEOUT_MS = 45_000;               // abort a hung sync after 45s

interface InboxSyncContextValue {
  syncing: boolean;
  lastSynced: Date | null;
  refreshKey: number;
  sync: () => void;
}

const InboxSyncContext = createContext<InboxSyncContextValue>({
  syncing: false,
  lastSynced: null,
  refreshKey: 0,
  sync: () => {},
});

export function InboxSyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const syncingRef = useRef(false);

  const runSync = useCallback(async (silent = false) => {
    if (!isApiConfigured()) return;
    if (syncingRef.current) return; // already in-flight, skip this tick
    syncingRef.current = true;
    setSyncing(true);

    // Race the real request against a timeout so a hanging Facebook/Instagram
    // API call can never permanently lock the mutex or stick the spinner.
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SYNC_TIMEOUT_MS),
    );

    try {
      const result = await Promise.race([syncFacebookInbox(), timeoutPromise]);

      if (result) {
        setLastSynced(new Date());
        // Only bump refreshKey when new comments actually arrived — avoids
        // an unnecessary list re-fetch on quiet background ticks.
        if (result.totalNew > 0) {
          setRefreshKey((k) => k + 1);
          toast({
            title: silent ? "New comments" : "Sync complete",
            description: `${result.totalNew} new comment${result.totalNew !== 1 ? "s" : ""} pulled from connected accounts.`,
          });
        } else if (!silent) {
          // Manual sync with no new comments — give quiet confirmation.
          toast({ title: "Up to date", description: "No new comments since last sync." });
        }
      } else if (!silent) {
        // null = API unavailable or timed out
        toast({
          title: "Sync unavailable",
          description: "Could not reach the server — will retry automatically.",
          variant: "destructive",
        });
      }
    } catch {
      // Unexpected error — don't surface to user on silent background syncs.
      if (!silent) {
        toast({ title: "Sync failed", description: "An unexpected error occurred.", variant: "destructive" });
      }
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, []);

  // Initial sync on mount
  useEffect(() => {
    runSync(true);
  }, [runSync]);

  // Background auto-sync — fires every 2 minutes while the app is open.
  // The mutex inside runSync prevents overlapping calls; missed ticks due to a
  // slow in-flight request are simply dropped (the next tick picks up instead).
  useEffect(() => {
    if (!isApiConfigured()) return;
    const id = setInterval(() => runSync(true), AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runSync]);

  return (
    <InboxSyncContext.Provider value={{ syncing, lastSynced, refreshKey, sync: () => runSync(false) }}>
      {children}
    </InboxSyncContext.Provider>
  );
}

export function useInboxSync() {
  return useContext(InboxSyncContext);
}
