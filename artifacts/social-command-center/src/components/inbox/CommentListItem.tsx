import { MockComment } from "@/data/mockComments";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CommentStatusBadge } from "@/components/shared/CommentStatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommentListItemProps {
  comment: MockComment;
  isSelected: boolean;
  onClick: () => void;
}

export function CommentListItem({ comment, isSelected, onClick }: CommentListItemProps) {
  return (
    <div 
      className={cn(
        "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50",
        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={comment.platform} showText={false} />
          <span className="font-medium text-sm">{comment.commenterName}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
        </div>
      </div>
      
      <p className="text-sm text-foreground line-clamp-2 mb-3">
        {comment.commentText}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CommentStatusBadge status={comment.status} />
          <PriorityBadge priority={comment.priority} showText={false} />
        </div>
        
        {comment.replyCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <MessageSquare className="w-3 h-3" />
            {comment.replyCount}
          </div>
        )}
      </div>
    </div>
  );
}
