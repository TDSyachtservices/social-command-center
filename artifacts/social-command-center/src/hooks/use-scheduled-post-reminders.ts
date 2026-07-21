import { useEffect, useRef } from "react";
import { useToast } from "./use-toast";
import { listPosts } from "@/lib/api";

const REMIND_WINDOW_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 60 * 1000;
const STORAGE_KEY = "scc_reminded_posts";

function getNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markNotified(postId: string) {
  const set = getNotified();
  set.add(postId);
  const arr = [...set].slice(-500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

export function useScheduledPostReminders() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    async function check() {
      const posts = await listPosts({ status: "SCHEDULED" });
      if (!posts) return;

      const now = Date.now();
      const notified = getNotified();

      for (const post of posts) {
        if (!post.scheduledAt) continue;
        const msUntil = new Date(post.scheduledAt).getTime() - now;
        if (msUntil < 0 || msUntil > REMIND_WINDOW_MS) continue;
        if (notified.has(post.id)) continue;

        markNotified(post.id);

        const minutesAway = Math.ceil(msUntil / 60_000);
        const when = minutesAway <= 1 ? "less than a minute" : `${minutesAway} minute${minutesAway !== 1 ? "s" : ""}`;
        const title = "Scheduled post going live soon";
        const body = `"${post.title}" publishes in ${when}.`;

        toastRef.current({ title, description: body });

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      }
    }

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
}
