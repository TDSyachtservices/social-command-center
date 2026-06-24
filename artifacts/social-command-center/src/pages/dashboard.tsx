import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import type { PostStatus } from "@/data/mockPosts";
import type { CommentStatus } from "@/data/mockComments";
import { listPosts, listComments, listAccounts, listPublishLogs } from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CommentStatusBadge } from "@/components/shared/CommentStatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type DashPost = { id: string; title: string; status: string; scheduledAt?: string | null; platforms: string[] };
type DashComment = { id: string; platform: string; commenterName: string; commentText: string; status: string };
type DashAccount = { id: string; accountName: string; connectionStatus: string };
type DashLog = { id: string; postTitle: string; action: string; status: string; timestamp: string };

const cardStyles = [
  { card: "bg-violet-50 border-violet-200 hover:bg-violet-100/80",  num: "text-violet-700",  arrow: "text-violet-300 group-hover:text-violet-500" },
  { card: "bg-sky-50 border-sky-200 hover:bg-sky-100/80",           num: "text-sky-700",     arrow: "text-sky-300 group-hover:text-sky-500" },
  { card: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80",num: "text-emerald-700", arrow: "text-emerald-300 group-hover:text-emerald-500" },
  { card: "bg-rose-50 border-rose-200 hover:bg-rose-100/80",        num: "text-rose-700",    arrow: "text-rose-300 group-hover:text-rose-500" },
  { card: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100/80",  num: "text-indigo-700",  arrow: "text-indigo-300 group-hover:text-indigo-500" },
  { card: "bg-orange-50 border-orange-200 hover:bg-orange-100/80",  num: "text-orange-700",  arrow: "text-orange-300 group-hover:text-orange-500" },
  { card: "bg-amber-50 border-amber-200 hover:bg-amber-100/80",     num: "text-amber-700",   arrow: "text-amber-300 group-hover:text-amber-500" },
  { card: "bg-teal-50 border-teal-200 hover:bg-teal-100/80",        num: "text-teal-700",    arrow: "text-teal-300 group-hover:text-teal-500" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const [posts, setPosts] = useState<DashPost[]>([]);
  const [comments, setComments] = useState<DashComment[]>([]);
  const [accounts, setAccounts] = useState<DashAccount[]>([]);
  const [logs, setLogs] = useState<DashLog[]>([]);

  useEffect(() => {
    listPosts({ limit: 100 }).then((apiPosts) => {
      if (apiPosts !== null) {
        setPosts(apiPosts.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status.toLowerCase(),
          scheduledAt: p.scheduledAt,
          platforms: p.platforms.map(pl => pl.platform.toLowerCase()),
        })));
      }
    });
    listComments({ limit: 50 }).then((apiComments) => {
      if (apiComments !== null) {
        setComments(apiComments.map(c => ({
          id: c.id,
          platform: c.platform.toLowerCase(),
          commenterName: c.commenterName,
          commentText: c.commentText,
          status: c.status.toLowerCase(),
        })));
      }
    });
    listAccounts().then((apiAccounts) => {
      if (apiAccounts !== null) {
        setAccounts(apiAccounts.map(a => ({
          id: a.id,
          accountName: a.accountName,
          connectionStatus: a.connectionStatus,
        })));
      }
    });
    listPublishLogs().then((apiLogs) => {
      if (apiLogs !== null) {
        setLogs(apiLogs.map(l => ({
          id: l.id,
          postTitle: l.postTitle,
          action: l.action,
          status: l.status,
          timestamp: l.timestamp,
        })));
      }
    });
  }, []);

  const stats = [
    { label: "Drafts",               value: posts.filter(p => p.status === "draft").length,                               href: "/posts?status=draft",               description: "Unpublished drafts" },
    { label: "Scheduled Posts",      value: posts.filter(p => p.status === "scheduled").length,                           href: "/posts?status=scheduled",           description: "Queued for publishing" },
    { label: "Published This Month", value: posts.filter(p => p.status === "published").length,                           href: "/posts?status=published",           description: "Live across platforms" },
    { label: "Failed Posts",         value: posts.filter(p => p.status === "failed").length,                              href: "/posts?status=failed",              description: "Need attention" },
    { label: "New Comments",         value: comments.filter(c => c.status === "new").length,                              href: "/social-inbox?status=new",          description: "Awaiting first review" },
    { label: "Unreplied",            value: comments.filter(c => ["new", "needs_follow_up"].includes(c.status)).length,   href: "/social-inbox?status=unreplied",    description: "No response sent yet" },
    { label: "Needs Follow-Up",      value: comments.filter(c => c.status === "needs_follow_up").length,                  href: "/social-inbox?status=needs_follow_up", description: "Flagged for follow-up" },
    { label: "Resolved Today",       value: comments.filter(c => c.status === "resolved").length,                         href: "/social-inbox?status=resolved",     description: "Closed out" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const style = cardStyles[i] ?? cardStyles[0];
          return (
            <Link key={stat.label} href={stat.href} data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <Card className={`cursor-pointer transition-all group border ${style.card} shadow-sm hover:shadow-md`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-semibold text-foreground/70">{stat.label}</CardTitle>
                  <ArrowRight className={`h-3.5 w-3.5 transition-all group-hover:translate-x-0.5 ${style.arrow}`} />
                </CardHeader>
                <CardContent className="pb-4">
                  <div className={`text-3xl font-bold ${style.num}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Scheduled Posts</CardTitle>
            <CardDescription>Next 5 scheduled posts across all platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {posts.filter(p => p.status === "scheduled").slice(0, 5).map(post => (
              <div key={post.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{post.title}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{new Date(post.scheduledAt || "").toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {post.platforms.map(p => <PlatformBadge key={p} platform={p} showText={false} />)}
                  </div>
                </div>
                <StatusBadge status={post.status as PostStatus} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Inbox Preview</CardTitle>
            <CardDescription>Recent comments needing attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.slice(0, 3).map(comment => (
              <div key={comment.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={comment.platform} showText={false} />
                    <p className="text-sm font-medium leading-none">{comment.commenterName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{comment.commentText}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CommentStatusBadge status={comment.status as CommentStatus} />
                  <Button variant="outline" size="sm" onClick={() => setLocation("/social-inbox")}>Reply</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Publish Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <span className="font-medium">{log.postTitle}</span>
                  <span className="text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{log.action.replace("_", " ")}</span>
                  <span className={log.status === "success" ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>{log.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.map(account => (
              <div key={account.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                <span>{account.accountName}</span>
                <span className={account.connectionStatus === "connected" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                  {account.connectionStatus.replace("_", " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {posts.filter(p => p.status === "failed").map(post => (
              <div key={post.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0 last:pb-0 text-rose-600">
                <span className="font-medium">Failed to publish: {post.title}</span>
                <Button variant="outline" size="sm" className="w-fit border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setLocation("/posts?status=failed")}>Review</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
