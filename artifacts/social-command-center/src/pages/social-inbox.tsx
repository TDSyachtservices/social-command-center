import { useState } from "react";
import { useSearch } from "wouter";
import { MockComment } from "@/data/mockComments";
import { CommentList } from "@/components/inbox/CommentList";
import { CommentDetailPanel } from "@/components/inbox/CommentDetailPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageSquare } from "lucide-react";

export default function SocialInbox() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialStatus = params.get("status") || "all";

  const [selectedComment, setSelectedComment] = useState<MockComment | null>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-2 border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        <div className="md:col-span-1 h-full">
          <CommentList
            selectedCommentId={selectedComment?.id || null}
            onSelectComment={setSelectedComment}
            initialStatusFilter={initialStatus}
          />
        </div>
        <div className="md:col-span-2 h-full bg-background hidden md:block">
          {selectedComment ? (
            <CommentDetailPanel comment={selectedComment} />
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<MessageSquare className="w-8 h-8" />}
                title="Select a comment"
                description="Choose a comment from the list to view details and reply."
                className="border-none bg-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
