import { useState } from "react";
import { useSearch } from "wouter";
import { MockComment } from "@/data/mockComments";
import { CommentList } from "@/components/inbox/CommentList";
import { CommentDetailPanel } from "@/components/inbox/CommentDetailPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft } from "lucide-react";

export default function SocialInbox() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialStatus = params.get("status") || "all";

  const [selectedComment, setSelectedComment] = useState<MockComment | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const handleSelectComment = (comment: MockComment) => {
    setSelectedComment(comment);
    setMobileView("detail");
  };

  const handleBack = () => {
    setMobileView("list");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-2 border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        <div className={`md:col-span-1 h-full ${mobileView === "detail" ? "hidden md:block" : "block"}`}>
          <CommentList
            selectedCommentId={selectedComment?.id || null}
            onSelectComment={handleSelectComment}
            initialStatusFilter={initialStatus}
          />
        </div>

        <div className={`md:col-span-2 h-full bg-background flex flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
          {mobileView === "detail" && (
            <div className="md:hidden flex items-center gap-2 border-b px-4 py-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 pl-0">
                <ArrowLeft className="h-4 w-4" />
                All Comments
              </Button>
            </div>
          )}

          {selectedComment ? (
            <div className="flex-1 overflow-y-auto">
              <CommentDetailPanel comment={selectedComment} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
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
