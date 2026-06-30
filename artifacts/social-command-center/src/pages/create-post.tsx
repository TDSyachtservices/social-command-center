import { useSearch, useLocation } from "wouter";
import { PostComposer } from "@/components/posts/PostComposer";
import { Button } from "@/components/ui/button";

export default function CreatePost() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const editPostId = new URLSearchParams(search).get("edit") ?? undefined;
  const isEditMode = !!editPostId;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditMode ? "Edit Post" : "Create Post"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isEditMode
              ? "Update your post content, schedule, or platforms."
              : "Compose and schedule content across all your connected platforms."}
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/posts")}>Cancel</Button>
      </div>

      <PostComposer editPostId={editPostId} />
    </div>
  );
}
