import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, MessageSquare, Heart, UserPlus, AtSign, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  ApiNotification,
  isApiConfigured,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface NotificationFeedProps {
  platform?: string;
  pollIntervalMs?: number;
  className?: string;
}

const typeIcon: Record<string, React.ElementType> = {
  comment: MessageSquare,
  mention: AtSign,
  reaction: Heart,
  follow: UserPlus,
  message: MessageCircle,
};

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    comment: "Comment",
    mention: "Mention",
    reaction: "Reaction",
    follow: "Follow",
    message: "Message",
  };
  return map[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationFeed({
  platform,
  pollIntervalMs = 30_000,
  className,
}: NotificationFeedProps) {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const fetchNotifications = async (silent = false) => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const data = await listNotifications({ platform, limit: 100 });
    if (data) setItems(data);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    void fetchNotifications(false);

    intervalRef.current = setInterval(() => {
      void fetchNotifications(true);
    }, pollIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [platform, pollIntervalMs]);

  const handleMarkRead = async (id: string) => {
    const ok = await markNotificationRead(id);
    if (ok) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const ok = await markAllNotificationsRead(platform);
    if (ok) {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast({ title: "All notifications marked as read" });
    } else {
      toast({ title: "Could not mark all read", variant: "destructive" });
    }
    setMarkingAll(false);
  };

  if (!isApiConfigured()) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm", className)}>
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>API not configured — notifications unavailable</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card flex flex-col", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No notifications yet
          </div>
        ) : (
          items.map((n) => {
            const Icon = typeIcon[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
                  !n.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    !n.isRead
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      {typeLabel(n.type)}
                    </span>
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm leading-snug mt-0.5 line-clamp-2">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {n.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(n.occurredAt)}
                  </p>
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
                    title="Mark read"
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
