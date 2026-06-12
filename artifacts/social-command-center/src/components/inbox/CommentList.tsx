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
}

export function CommentList({ selectedCommentId, onSelectComment }: CommentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredComments = mockComments.filter(comment => {
    const matchesSearch = comment.commentText.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          comment.commenterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || comment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search comments..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No comments found.
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
