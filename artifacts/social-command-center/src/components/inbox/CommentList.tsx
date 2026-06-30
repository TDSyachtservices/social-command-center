import { useState, useEffect } from "react";
import { MockComment } from "@/data/mockComments";
import { listComments } from "@/lib/api";
import { CommentListItem } from "./CommentListItem";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentListProps {
  selectedCommentId: string | null;
  onSelectComment: (comment: MockComment) => void;
  initialStatusFilter?: string;
  refreshKey?: number;
}

const PLATFORM_TABS = [
  { value: "all", label: "All" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
];

export function CommentList({ selectedCommentId, onSelectComment, initialStatusFilter = "all", refreshKey = 0 }: CommentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [comments, setComments] = useState<MockComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const platform = platformFilter === "all" ? undefined : platformFilter;
    listComments({ limit: 100, platform }).then((apiComments) => {
      if (apiComments !== null) {
        const normalized: MockComment[] = apiComments.map((c) => ({
          id: c.id,
          platform: c.platform.toLowerCase() as MockComment["platform"],
          accountName: c.accountName,
          commenterName: c.commenterName,
          commenterHandle: c.commenterHandle ?? "",
          commentText: c.commentText,
          originalPostTitle: c.originalPostTitle ?? "",
          originalPostCaption: c.originalPostCaption ?? "",
          timestamp: c.timestamp,
          status: c.status.toLowerCase() as MockComment["status"],
          priority: c.priority.toLowerCase() as MockComment["priority"],
          replyCount: c.replyCount,
          assignedUser: c.assignedUser,
          mediaUrl: null,
        }));
        setComments(normalized);
      } else {
        setError("Could not load comments. Check your connection to the server.");
      }
    }).finally(() => setLoading(false));
  }, [refreshKey, platformFilter]);

  const filteredComments = comments.filter(comment => {
    const matchesSearch =
      comment.commentText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.commenterName.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus: boolean;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "unreplied") {
      matchesStatus = comment.status === "new" || comment.status === "needs_follow_up";
    } else {
      matchesStatus = comment.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const statusLabel: Record<string, string> = {
    all: "All Statuses",
    new: "New",
    unreplied: "Unreplied",
    needs_follow_up: "Needs Follow-Up",
    replied: "Replied",
    resolved: "Resolved",
    hidden: "Hidden",
    ignored: "Ignored",
    escalated: "Escalated",
  };

  return (
    <div className="flex flex-col h-full bg-card border-r overflow-hidden">
      <div className="flex border-b shrink-0">
        {PLATFORM_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setPlatformFilter(tab.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              platformFilter === tab.value
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${filteredComments.length} comment${filteredComments.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        {statusFilter !== "all" && (
          <div className="text-xs font-medium text-primary bg-primary/8 border border-primary/20 rounded px-2 py-1">
            Filtered: {statusLabel[statusFilter] ?? statusFilter}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comments..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid="input-search-comments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-comment-status">
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="unreplied">Unreplied</SelectItem>
            <SelectItem value="needs_follow_up">Needs Follow-Up</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-destructive font-medium">Failed to load</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? `No comments with status "${statusLabel[statusFilter] ?? statusFilter}"`
                : "No comments yet — sync your Facebook page to get started"}
            </p>
          </div>
        ) : (
          filteredComments.map(comment => (
            <CommentListItem
              key={comment.id}
              comment={comment}
              isSelected={comment.id === selectedCommentId}
              onClick={() => onSelectComment(comment)}
            />
          ))
        )}
      </div>
    </div>
  );
}
