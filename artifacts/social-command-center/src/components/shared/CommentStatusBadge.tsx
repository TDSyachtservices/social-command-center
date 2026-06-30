import { cn } from "@/lib/utils";

type CommentStatus = string;

interface CommentStatusBadgeProps {
  status: CommentStatus;
  className?: string;
}

export function CommentStatusBadge({ status, className }: CommentStatusBadgeProps) {
  let colorClass = "";
  const label = status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  switch (status) {
    case "new":
      colorClass = "bg-violet-100 text-violet-700 border-violet-200";
      break;
    case "needs_follow_up":
      colorClass = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "replied":
      colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
      break;
    case "resolved":
      colorClass = "bg-teal-100 text-teal-700 border-teal-200";
      break;
    case "escalated":
      colorClass = "bg-orange-100 text-orange-700 border-orange-200";
      break;
    case "failed_reply":
      colorClass = "bg-rose-100 text-rose-700 border-rose-200";
      break;
    case "hidden":
    case "ignored":
      colorClass = "bg-slate-100 text-slate-500 border-slate-200";
      break;
    default:
      colorClass = "bg-muted text-muted-foreground border-border";
  }

  return (
    <div
      className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", colorClass, className)}
      data-testid={`badge-comment-status-${status}`}
    >
      {label}
    </div>
  );
}
