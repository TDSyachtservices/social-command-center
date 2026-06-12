import { useState } from "react";
import { useLocation } from "wouter";
import { mockPosts } from "@/data/mockPosts";
import { mockComments } from "@/data/mockComments";
import { mockAccounts } from "@/data/mockAccounts";
import { mockPublishLogs } from "@/data/mockLogs";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CommentStatusBadge } from "@/components/shared/CommentStatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const stats = [
    { label: "Drafts", value: mockPosts.filter(p => p.status === "draft").length },
    { label: "Scheduled Posts", value: mockPosts.filter(p => p.status === "scheduled").length },
    { label: "Published This Month", value: mockPosts.filter(p => p.status === "published").length },
    { label: "Failed Posts", value: mockPosts.filter(p => p.status === "failed").length },
    { label: "New Comments", value: mockComments.filter(c => c.status === "new").length },
    { label: "Unreplied", value: mockComments.filter(c => ["new", "needs_follow_up"].includes(c.status)).length },
    { label: "Needs Follow-Up", value: mockComments.filter(c => c.status === "needs_follow_up").length },
    { label: "Resolved Today", value: mockComments.filter(c => c.status === "resolved").length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Scheduled Posts</CardTitle>
            <CardDescription>Next 5 scheduled posts across all platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockPosts.filter(p => p.status === "scheduled").slice(0, 5).map(post => (
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
                <StatusBadge status={post.status} />
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
            {mockComments.slice(0, 3).map(comment => (
              <div key={comment.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={comment.platform} showText={false} />
                    <p className="text-sm font-medium leading-none">{comment.commenterName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{comment.commentText}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CommentStatusBadge status={comment.status} />
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
            {mockPublishLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <span className="font-medium">{log.postTitle}</span>
                  <span className="text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{log.action.replace('_', ' ')}</span>
                  <span className={log.status === "success" ? "text-green-600" : "text-destructive"}>{log.status}</span>
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
            {mockAccounts.map(account => (
              <div key={account.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                <span>{account.accountName}</span>
                <span className={account.connectionStatus === "connected" ? "text-green-600" : "text-amber-600"}>
                  {account.connectionStatus.replace('_', ' ')}
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
            {mockPosts.filter(p => p.status === "failed").map(post => (
              <div key={post.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0 last:pb-0 text-destructive">
                <span className="font-medium">Failed to publish: {post.title}</span>
                <Button variant="outline" size="sm" className="w-fit" onClick={() => setLocation("/posts")}>Review</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
