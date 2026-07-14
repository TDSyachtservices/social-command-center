import { useState, useEffect, useCallback, useRef } from "react";
import { useSearch } from "wouter";
import { MockComment } from "@/data/mockComments";
import { CommentList } from "@/components/inbox/CommentList";
import { CommentDetailPanel } from "@/components/inbox/CommentDetailPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft, RefreshCw } from "lucide-react";
import { syncFacebookInbox, isApiConfigured } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function useRelativeTime(date: Date | null): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [date]);
  if (!date) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}m ago`;
}

export default function SocialInbox() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialStatus = params.get("status") || "all";

  const [selectedComment, setSelectedComment] = useState<MockComment | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncingRef = useRef(false); // prevents overlapping background syncs

  const handleSelectComment = (comment: MockComment) => {
    setSelectedComment(comment);
    setMobileView("detail");
  };

  const handleCommentFieldChange = (fields: Partial<Pick<MockComment, "status" | "priority" | "assignedUser">>) => {
    setSelectedComment(prev => prev ? { ...prev, ...fields } : prev);
    setRefreshKey(k => k + 1);
  };

  const handleBack = () => {
    setMobileView("list");
  };

  const runSync = useCallback(async (silent = false) => {
    if (!isApiConfigured()) return;
    if (syncingRef.current) return; // already in-flight
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncFacebookInbox();
      if (result) {
        setLastSynced(new Date());
        setRefreshKey(k => k + 1);
        // Only show a toast when new comments actually arrived — skip it for
        // background auto-syncs that found nothing new (silent or not).
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

  // Initial sync on mount
  useEffect(() => {
    runSync(true);
  }, [runSync]);

  // Background auto-sync every 2 minutes while the page is open
  useEffect(() => {
    if (!isApiConfigured()) return;
    const id = setInterval(() => runSync(true), AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runSync]);

  const lastSyncedLabel = useRelativeTime(lastSynced);

  const handleSync = () => runSync(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Social Inbox</h1>
          <p className="text-sm text-muted-foreground">Manage comments and messages across platforms</p>
        </div>
        {isApiConfigured() && (
          <div className="flex items-center gap-2">
            {lastSyncedLabel && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Synced {lastSyncedLabel}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-card flex">
        {/* Left: comment list */}
        <div className={`w-full md:w-[33%] shrink-0 overflow-hidden flex flex-col ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
          <CommentList
            selectedCommentId={selectedComment?.id || null}
            onSelectComment={handleSelectComment}
            initialStatusFilter={initialStatus}
            refreshKey={refreshKey}
          />
        </div>

        {/* Right: detail panel */}
        <div className={`flex-1 min-w-0 overflow-hidden bg-background flex flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
          {mobileView === "detail" && (
            <div className="md:hidden flex items-center gap-2 border-b px-4 py-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 pl-0">
                <ArrowLeft className="h-4 w-4" />
                All Comments
              </Button>
            </div>
          )}

          {selectedComment ? (
            <div className="flex-1 overflow-y-auto">
              <CommentDetailPanel comment={selectedComment} onFieldChange={handleCommentFieldChange} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={<MessageSquare className="w-8 h-8" />}
                title="Select a comment"
                description="Choose a comment from the list to view details and reply."
                className="border-none bg-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
