import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { syncFacebookInbox, isApiConfigured } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000;

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
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncFacebookInbox();
      if (result) {
        setLastSynced(new Date());
        setRefreshKey(k => k + 1);
        if (result.totalNew > 0) {
          toast({
            title: silent ? "New comments" : "Sync complete",
            description: `${result.totalNew} new comment${result.totalNew !== 1 ? "s" : ""} pulled from connected accounts.`,
          });
        }
      } else if (!silent) {
        toast({
          title: "Sync unavailable",
          description: "Could not reach the server.",
          variant: "destructive",
        });
      }
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    runSync(true);
  }, [runSync]);

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
