import { Platform } from "@/data/mockPosts";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, AlertTriangle } from "lucide-react";

interface SocialPreviewCardProps {
  platform: Platform;
  caption: string;
  mediaUrl: string | null;
  date?: string;
  optimizedVersion?: { width: number; height: number; qualityScore: string; cropMode: string };
}

export function SocialPreviewCard({ platform, caption, mediaUrl, date, optimizedVersion }: SocialPreviewCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={platform} showText={false} />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Marine Decking Co</span>
            <span className="text-[10px] text-muted-foreground">{date || "Preview"}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {mediaUrl ? (
          <div className="aspect-video bg-muted relative w-full overflow-hidden">
            <img src={mediaUrl} className="w-full h-full object-cover" alt="Post preview" />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground w-full">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}
        <div className="p-3 text-sm whitespace-pre-wrap flex-1">
          {caption || <span className="text-muted-foreground italic">No caption provided</span>}
        </div>
        <div className="p-3 border-t bg-muted/10 text-xs flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Media</span>
          {optimizedVersion ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${optimizedVersion.qualityScore === 'Poor' ? 'bg-red-500' : optimizedVersion.qualityScore === 'Needs Review' ? 'bg-amber-500' : 'bg-green-500'}`} />
              <span>Platform-optimized · {optimizedVersion.width}×{optimizedVersion.height} · {optimizedVersion.qualityScore}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Original asset (not optimized)</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
