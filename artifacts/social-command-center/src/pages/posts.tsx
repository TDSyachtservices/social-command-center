import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import type { PostStatus } from "@/data/mockPosts";
import { listPosts, deletePost, publishPost, pollUntilPublishSettled } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

type DisplayPost = {
  id: string;
  title: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
};

export default function Posts() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(search);
  const initialStatus = params.get("status") || "all";

  const [filter, setFilter] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      listPosts({ status: filter === "all" ? undefined : filter.toUpperCase() }).then((apiPosts) => {
        if (cancelled || apiPosts === null) return;
        const mapped = apiPosts.map((p) => ({
          id: p.id,
          title: p.title,
          platforms: p.platforms.map((pl) => pl.platform.toLowerCase()),
          status: p.status.toLowerCase(),
          scheduledAt: p.scheduledAt ?? null,
        }));
        setPosts(mapped);

        // Publishing happens asynchronously on the server, so a post can sit
        // in "publishing" for a few seconds. Keep polling while that's the
        // case so the badge flips to published/failed on its own — no manual
        // refresh needed.
        if (mapped.some((p) => p.status === "publishing")) {
          pollTimer = setTimeout(load, 2000);
        }

        // Toast when a publishing post settles
        setPosts((prev) => {
          const wasPublishing = new Set(prev.filter((p) => p.status === "publishing").map((p) => p.id));
          for (const p of mapped) {
            if (!wasPublishing.has(p.id)) continue;
            if (p.status === "published") {
              toast({ title: "Post published", description: `"${p.title}" is now live.` });
            } else if (p.status === "failed") {
              toast({ title: "Publish failed", description: `"${p.title}" could not be published. Check Publish Logs for details.`, variant: "destructive" });
            }
          }
          return mapped;
        });
      });
    };

    load();
    return () => { cancelled = true; if (pollTimer) clearTimeout(pollTimer); };
  }, [filter]);

  const filteredPosts = posts.filter(p => {
    const matchesStatus = filter === "all" || p.status === filter;
    const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleRetry = async (postId: string, postTitle: string) => {
    setRetryingId(postId);
    try {
      const triggered = await publishPost(postId);
      if (!triggered) {
        toast({ title: "Retry failed", description: "Could not trigger publishing. Try again.", variant: "destructive" });
        return;
      }
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "publishing" } : p));
      toast({ title: "Retrying…", description: `Sending "${postTitle}" to your platforms.` });
      const final = await pollUntilPublishSettled(postId);
      if (final?.status === "PUBLISHED") {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "published" } : p));
        toast({ title: "Post published", description: `"${postTitle}" is now live.` });
      } else {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "failed" } : p));
        toast({ title: "Publish failed", description: `"${postTitle}" could not be published. Check Publish Logs for details.`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error retrying publish.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const ok = await deletePost(deletingId);
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deletingId));
        toast({ title: "Post deleted", description: "The post has been permanently removed." });
      } else {
        toast({ title: "Delete failed", description: "Could not delete the post. Try again.", variant: "destructive" });
      }
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const statusLabel: Record<string, string> = {
    all: "All Statuses",
    draft: "Drafts",
    scheduled: "Scheduled",
    published: "Published",
    failed: "Failed",
    archived: "Archived",
  };

  const deletingPost = posts.find((p) => p.id === deletingId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          {filter !== "all" && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Showing: <span className="font-medium text-foreground">{statusLabel[filter] ?? filter}</span>
            </p>
          )}
        </div>
        <Button onClick={() => setLocation("/create-post")} className="shrink-0">Create Post</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <Input
          placeholder="Search posts..."
          className="sm:max-w-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          data-testid="input-search-posts"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Scheduled Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No posts found{filter !== "all" ? ` with status "${statusLabel[filter] ?? filter}"` : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map(post => (
                  <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                    <TableCell className="font-medium max-w-[160px] truncate">{post.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {post.platforms.map(p => (
                          <PlatformBadge key={p} platform={p} showText={false} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={post.status as PostStatus} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/create-post?edit=${post.id}`)}
                          data-testid={`btn-edit-${post.id}`}
                        >
                          Edit
                        </Button>
                        {post.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30"
                            disabled={retryingId === post.id}
                            onClick={() => handleRetry(post.id, post.title)}
                            data-testid={`btn-retry-${post.id}`}
                          >
                            {retryingId === post.id ? "Retrying…" : "Retry"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(post.id)}
                          data-testid={`btn-delete-${post.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deletingPost?.title}&rdquo; will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
