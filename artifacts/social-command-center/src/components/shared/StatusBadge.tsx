import { PostStatus } from "@/data/mockPosts";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = "";
  let label = status.charAt(0).toUpperCase() + status.slice(1);
  
  switch (status) {
    case "draft":
      colorClass = "bg-muted text-muted-foreground border-border";
      break;
    case "scheduled":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      break;
    case "publishing":
      colorClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      break;
    case "published":
      colorClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      break;
    case "failed":
      colorClass = "bg-destructive/10 text-destructive border-destructive/20";
      break;
    case "archived":
      colorClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      break;
  }

  return (
    <div 
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </div>
  );
}