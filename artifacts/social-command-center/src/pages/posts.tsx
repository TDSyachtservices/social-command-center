import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { mockPosts } from "@/data/mockPosts";
import type { PostStatus } from "@/data/mockPosts";
import { listPosts } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DisplayPost = {
  id: string;
  title: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
};

const toDisplayPosts = (): DisplayPost[] =>
  mockPosts.map((p) => ({
    id: p.id,
    title: p.title,
    platforms: p.platforms,
    status: p.status,
    scheduledAt: p.scheduledAt ?? null,
  }));

export default function Posts() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialStatus = params.get("status") || "all";

  const [filter, setFilter] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [posts, setPosts] = useState<DisplayPost[]>(toDisplayPosts());

  useEffect(() => {
    listPosts({ status: filter === "all" ? undefined : filter.toUpperCase() }).then((apiPosts) => {
      if (apiPosts !== null) {
        setPosts(apiPosts.map((p) => ({
          id: p.id,
          title: p.title,
          platforms: p.platforms.map((pl) => pl.platform.toLowerCase()),
          status: p.status.toLowerCase(),
          scheduledAt: p.scheduledAt ?? null,
        })));
      }
    });
  }, [filter]);

  const filteredPosts = posts.filter(p => {
    const matchesStatus = filter === "all" || p.status === filter;
    const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusLabel: Record<string, string> = {
    all: "All Statuses",
    draft: "Drafts",
    scheduled: "Scheduled",
    published: "Published",
    failed: "Failed",
    archived: "Archived",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          {filter !== "all" && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Showing: <span className="font-medium text-foreground">{statusLabel[filter] ?? filter}</span>
            </p>
          )}
        </div>
        <Button>Create Post</Button>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search posts..."
          className="max-w-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          data-testid="input-search-posts"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Date</TableHead>
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
                    <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {post.platforms.map(p => (
                          <PlatformBadge key={p} platform={p} showText={false} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={post.status as PostStatus} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid={`btn-edit-${post.id}`}>Edit</Button>
                        {post.status === "failed" && (
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30" data-testid={`btn-retry-${post.id}`}>
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
