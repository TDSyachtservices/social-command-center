import { CommentPriority } from "@/data/mockComments";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, AlertCircle, DollarSign } from "lucide-react";

interface PriorityBadgeProps {
  priority: CommentPriority;
  className?: string;
  showText?: boolean;
}

export function PriorityBadge({ priority, className, showText = true }: PriorityBadgeProps) {
  let Icon = Minus;
  let colorClass = "";
  let label = priority.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  switch (priority) {
    case "low":
      Icon = ArrowDown;
      colorClass = "text-muted-foreground bg-muted border-border";
      break;
    case "normal":
      Icon = Minus;
      colorClass = "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700";
      break;
    case "high":
      Icon = ArrowUp;
      colorClass = "text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800";
      break;
    case "urgent":
      Icon = AlertCircle;
      colorClass = "text-destructive bg-destructive/10 border-destructive/20";
      break;
    case "sales_opportunity":
      Icon = DollarSign;
      colorClass = "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800";
      break;
  }

  return (
    <div 
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}
      title={`Priority: ${label}`}
      data-testid={`badge-priority-${priority}`}
    >
      <Icon className="w-3 h-3" />
      {showText && <span>{label}</span>}
    </div>
  );
}