import { useState, useEffect } from "react";
import { MockComment, mockComments } from "@/data/mockComments";
import { listComments, isApiConfigured } from "@/lib/api";
import { CommentListItem } from "./CommentListItem";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface CommentListProps {
  selectedCommentId: string | null;
  onSelectComment: (comment: MockComment) => void;
  initialStatusFilter?: string;
  refreshKey?: number;
}

export function CommentList({ selectedCommentId, onSelectComment, initialStatusFilter = "all", refreshKey = 0 }: CommentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [comments, setComments] = useState<MockComment[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) {
      setComments(mockComments);
      setIsLive(false);
      return;
    }
    listComments({ limit: 100 }).then((apiComments) => {
      if (apiComments !== null) {
        const normalized: MockComment[] = apiComments.map((c) => ({
          id: c.id,
          platform: c.platform.toLowerCase() as MockComment["platform"],
          accountName: c.accountName,
          commenterName: c.commenterName,
          commenterHandle: c.commenterHandle ?? "",
          commentText: c.commentText,
          originalPostTitle: c.originalPostTitle ?? "",
          originalPostCaption: "",
          timestamp: c.timestamp,
          status: c.status.toLowerCase() as MockComment["status"],
          priority: c.priority.toLowerCase() as MockComment["priority"],
          replyCount: c.replyCount,
          assignedUser: c.assignedUser,
          mediaUrl: null,
        }));
        setComments(normalized.length > 0 ? normalized : mockComments);
        setIsLive(normalized.length > 0);
      } else {
        setComments(mockComments);
        setIsLive(false);
      }
    });
  }, [refreshKey]);

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
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {isLive ? "● Live" : "Mock Data"}
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
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No comments found{statusFilter !== "all" ? ` with status "${statusLabel[statusFilter] ?? statusFilter}"` : ""}.
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
