import { useState, useEffect } from "react";
import { listCommentLogs } from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type DisplayLog = {
  id: string;
  timestamp: string;
  platform: string;
  account: string;
  actionType: string;
  status: string;
  relatedPost: string | null;
  relatedCommenter: string | null;
  errorMessage: string | null;
};

export default function CommentLogs() {
  const [logs, setLogs] = useState<DisplayLog[]>([]);

  useEffect(() => {
    listCommentLogs().then((api) => {
      if (api !== null) {
        setLogs(
          (api as Array<Record<string, unknown>>).map((l) => ({
            id: String(l.id ?? ""),
            timestamp: String(l.timestamp ?? new Date().toISOString()),
            platform: String(l.platform ?? "").toLowerCase(),
            account: String(l.accountId ?? l.account ?? ""),
            actionType: String(l.actionType ?? ""),
            status: String(l.status ?? "").toLowerCase(),
            relatedPost: l.relatedPost != null ? String(l.relatedPost) : null,
            relatedCommenter: l.relatedCommenter != null ? String(l.relatedCommenter) : null,
            errorMessage: l.errorMessage != null ? String(l.errorMessage) : null,
          })),
        );
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Comment Logs</h1>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell><PlatformBadge platform={log.platform as any} showText={false} /></TableCell>
                  <TableCell className="truncate max-w-[140px]">{log.account}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.actionType.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      log.status === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      log.status === "failed" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={log.relatedPost || log.relatedCommenter || ""}>
                    {log.relatedCommenter || log.relatedPost || "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-destructive" title={log.errorMessage || ""}>
                    {log.errorMessage || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === "failed" && (
                      <Button variant="outline" size="sm">Retry</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
