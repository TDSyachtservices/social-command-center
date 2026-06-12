import { useState, useEffect } from "react";
import { mockPublishLogs } from "@/data/mockLogs";
import { listPublishLogs } from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type DisplayLog = {
  id: string;
  timestamp: string;
  postTitle: string;
  platform: string;
  action: string;
  status: string;
  errorMessage: string | null;
};

const toDisplay = (): DisplayLog[] =>
  mockPublishLogs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp,
    postTitle: l.postTitle,
    platform: l.platform,
    action: l.action,
    status: l.status,
    errorMessage: l.errorMessage ?? null,
  }));

export default function PublishLogs() {
  const [logs, setLogs] = useState<DisplayLog[]>(toDisplay());

  useEffect(() => {
    listPublishLogs().then((api) => {
      if (api !== null) {
        setLogs(
          api.map((l) => ({
            id: l.id,
            timestamp: l.timestamp,
            postTitle: l.postTitle,
            platform: l.platform.toLowerCase(),
            action: l.action,
            status: l.status.toLowerCase(),
            errorMessage: l.errorMessage ?? null,
          })),
        );
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Publish Logs</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Post Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={log.postTitle}>{log.postTitle}</TableCell>
                  <TableCell><PlatformBadge platform={log.platform as any} showText={false} /></TableCell>
                  <TableCell>{log.action.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.status === "success" ? "bg-green-100 text-green-800" :
                      log.status === "failed" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-destructive" title={log.errorMessage || ""}>
                    {log.errorMessage || "-"}
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
