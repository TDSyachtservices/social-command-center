import { useState } from "react";
import { MockComment } from "@/data/mockComments";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CommentStatusBadge } from "@/components/shared/CommentStatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { ReplyComposer } from "./ReplyComposer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, ExternalLink, RefreshCw, CheckCircle, Flag, EyeOff, ArchiveX } from "lucide-react";
import { mockUpdateCommentStatus } from "@/lib/mockActions";

interface CommentDetailPanelProps {
  comment: MockComment;
}

export function CommentDetailPanel({ comment }: CommentDetailPanelProps) {
  const [status, setStatus] = useState(comment.status);
  const [priority, setPriority] = useState(comment.priority);
  const [assignedUser, setAssignedUser] = useState(comment.assignedUser || "unassigned");
  const [internalNotes, setInternalNotes] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleStatusChange = async (newStatus: any) => {
    setStatus(newStatus);
    await mockUpdateCommentStatus(comment.id, newStatus);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={comment.platform} showText={false} className="h-8 w-8 justify-center [&_svg]:h-5 [&_svg]:w-5" />
            <div>
              <div className="font-semibold">{comment.commenterName}</div>
              <div className="text-xs text-muted-foreground">{comment.commenterHandle} • {new Date(comment.timestamp).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> View
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center p-3 bg-muted/20 rounded-md border">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="sales_opportunity">Sales Opportunity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Assignee</label>
            <Select value={assignedUser} onValueChange={setAssignedUser}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="Sales Team">Sales Team</SelectItem>
                <SelectItem value="Support Team">Support Team</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Original Post Reference */}
        <div className="flex gap-4 p-3 border rounded-md bg-muted/10">
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
            {comment.mediaUrl ? (
              <img src={comment.mediaUrl} alt="Post media" className="w-full h-full object-cover rounded" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground opacity-50" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">On post:</div>
            <div className="font-medium text-sm">{comment.originalPostTitle}</div>
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{comment.originalPostCaption}</div>
          </div>
        </div>

        {/* Comment Thread */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
              {comment.commenterName.charAt(0)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="bg-muted/20 border p-3 rounded-2xl rounded-tl-none">
                <p className="text-sm">{comment.commentText}</p>
              </div>
            </div>
          </div>
          
          {/* Internal Notes */}
          <div className="space-y-2 pt-4">
            <label className="text-xs font-medium text-muted-foreground">Internal Notes (Not visible to user)</label>
            <Textarea 
              placeholder="Add notes for the team..." 
              className="min-h-[80px] text-xs bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <ReplyComposer 
            commentId={comment.id} 
            commentText={comment.commentText}
            onSuccess={() => handleStatusChange("replied")}
          />
        </div>
      </div>
      
      <div className="p-4 border-t flex flex-wrap gap-2 justify-end bg-muted/10">
        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => handleStatusChange("resolved")}>
          <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
        </Button>
        <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => handleStatusChange("needs_follow_up")}>
          <Flag className="w-4 h-4 mr-2" /> Needs Follow Up
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange("hidden")}>
          <EyeOff className="w-4 h-4 mr-2" /> Hide
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleStatusChange("ignored")}>
          <ArchiveX className="w-4 h-4 mr-2" /> Ignore
        </Button>
      </div>
    </div>
  );
}
