import { useState } from "react";
import { mockComments, MockComment } from "@/data/mockComments";
import { CommentListItem } from "./CommentListItem";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommentListProps {
  selectedCommentId: string | null;
  onSelectComment: (comment: MockComment) => void;
  initialStatusFilter?: string;
}

export function CommentList({ selectedCommentId, onSelectComment, initialStatusFilter = "all" }: CommentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  const filteredComments = mockComments.filter(comment => {
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
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b space-y-3">
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

      <ScrollArea className="flex-1">
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
      </ScrollArea>
    </div>
  );
}
