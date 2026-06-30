import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ValidationIssue } from "@/lib/platformValidation";

interface PlatformValidationNoticeProps {
  issues: ValidationIssue[];
}

export function PlatformValidationNotice({ issues }: PlatformValidationNoticeProps) {
  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm text-destructive bg-destructive/5 border border-destructive/30 rounded-md p-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Fix before publishing
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {errors.map((issue, i) => (
              <li key={`err-${i}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Heads up
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {warnings.map((issue, i) => (
              <li key={`warn-${i}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
