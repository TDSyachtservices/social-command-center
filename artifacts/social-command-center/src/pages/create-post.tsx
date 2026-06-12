import { useState } from "react";
import { useLocation } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { PostComposer } from "@/components/posts/PostComposer";
import { Button } from "@/components/ui/button";

export default function CreatePost() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Post</h1>
          <p className="text-muted-foreground text-sm mt-1">Compose and schedule content across all your connected platforms.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/posts")}>Cancel</Button>
      </div>

      <PostComposer />
    </div>
  );
}
