import { Platform } from "@/data/mockPosts";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Copy } from "lucide-react";
import { MediaUploadCard } from "./MediaUploadCard";

export interface PlatformMediaValue {
  url: string;
  type: "image" | "video";
}

interface PlatformMediaTabsProps {
  platforms: Platform[];
  platformMedia: Record<string, PlatformMediaValue | null>;
  onChange: (platform: Platform, value: PlatformMediaValue | null) => void;
  onApplyToAll: (value: PlatformMediaValue) => void;
  onUploadPendingChange?: (platform: Platform, pending: boolean) => void;
}

export function PlatformMediaTabs({ platforms, platformMedia, onChange, onApplyToAll, onUploadPendingChange }: PlatformMediaTabsProps) {
  if (platforms.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Media — per platform</label>
      <p className="text-xs text-muted-foreground">
        Pick a separate photo or video for each platform. Use “Choose from Library” to grab the
        platform-optimized crop you generated in the Media Optimizer.
      </p>

      <Tabs defaultValue={platforms[0]} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 flex-wrap">
          {platforms.map((platform) => {
            const hasMedia = !!platformMedia[platform]?.url;
            return (
              <TabsTrigger key={platform} value={platform} className="gap-2">
                <PlatformBadge platform={platform} showText={false} className="border-none bg-transparent p-0" />
                {platform}
                {hasMedia && <CheckCircle2 className="w-3 h-3 text-green-500" aria-label="Media selected" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {platforms.map((platform) => {
          const value = platformMedia[platform] ?? null;
          return (
            <TabsContent key={platform} value={platform} className="space-y-3 mt-4">
              <MediaUploadCard
                label=""
                initialPreview={value?.url ?? null}
                initialType={value?.type ?? "image"}
                onMediaSelect={(url, type) => onChange(platform, url ? { url, type } : null)}
                onUploadPendingChange={(pending) => onUploadPendingChange?.(platform, pending)}
              />

              {value?.url && platforms.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => onApplyToAll(value)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Use this for all selected platforms
                </Button>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
