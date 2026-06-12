import { cn } from "@/lib/utils";

type PostStatus = string;

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = "";
  let label = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case "draft":
      colorClass = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case "scheduled":
      colorClass = "bg-sky-100 text-sky-700 border-sky-200";
      break;
    case "publishing":
      colorClass = "bg-violet-100 text-violet-700 border-violet-200";
      break;
    case "published":
      colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
      break;
    case "failed":
      colorClass = "bg-rose-100 text-rose-700 border-rose-200";
      break;
    case "archived":
      colorClass = "bg-slate-100 text-slate-500 border-slate-200";
      break;
    default:
      colorClass = "bg-muted text-muted-foreground border-border";
  }

  return (
    <div
      className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", colorClass, className)}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </div>
  );
}
