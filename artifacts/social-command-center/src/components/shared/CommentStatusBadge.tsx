import { CommentStatus } from "@/data/mockComments";
import { cn } from "@/lib/utils";

interface CommentStatusBadgeProps {
  status: CommentStatus;
  className?: string;
}

export function CommentStatusBadge({ status, className }: CommentStatusBadgeProps) {
  let colorClass = "";
  let label = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  switch (status) {
    case "new":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      break;
    case "needs_follow_up":
      colorClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      break;
    case "replied":
    case "resolved":
      colorClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      break;
    case "escalated":
    case "failed_reply":
      colorClass = "bg-destructive/10 text-destructive border-destructive/20";
      break;
    case "hidden":
    case "ignored":
      colorClass = "bg-muted text-muted-foreground border-border";
      break;
  }

  return (
    <div 
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}
      data-testid={`badge-comment-status-${status}`}
    >
      {label}
    </div>
  );
}