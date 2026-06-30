import { Platform } from "@/data/mockPosts";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, AlertTriangle, Info } from "lucide-react";
import { HASHTAG_RULES } from "@/lib/hashtagStore";

interface PlatformCaptionTabsProps {
  platforms: Platform[];
  masterCaption: string;
  platformCaptions: Record<Platform, string>;
  platformHashtags: Record<string, string[]>;
  onChange: (platform: Platform, caption: string) => void;
}

export function PlatformCaptionTabs({
  platforms,
  masterCaption,
  platformCaptions,
  platformHashtags,
  onChange,
}: PlatformCaptionTabsProps) {
  if (platforms.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Platform-Specific Content</label>
      <Tabs defaultValue={platforms[0]} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 flex-wrap">
          {platforms.map((platform) => {
            const tags = platformHashtags[platform] ?? [];
            const rules = HASHTAG_RULES[platform];
            const overHard = rules?.hardLimit != null && tags.length > rules.hardLimit;
            const overSoft = rules?.softLimit != null && tags.length > rules.softLimit;
            return (
              <TabsTrigger key={platform} value={platform} className="gap-2">
                <PlatformBadge platform={platform} showText={false} className="border-none bg-transparent p-0" />
                {platform}
                {(overHard || overSoft) && (
                  <AlertTriangle className={`w-3 h-3 ${overHard ? "text-destructive" : "text-amber-500"}`} />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {platforms.map((platform) => {
          const caption = platformCaptions[platform] || "";
          const tags = platformHashtags[platform] ?? [];
          const rules = HASHTAG_RULES[platform];
          const charCount = caption.length + (tags.length > 0 ? 2 + tags.join(" ").length : 0);

          const hardLimit = rules?.hardLimit;
          const softLimit = rules?.softLimit;
          const overHard = hardLimit != null && tags.length > hardLimit;
          const overSoft = softLimit != null && tags.length > softLimit && !overHard;

          return (
            <TabsContent key={platform} value={platform} className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {platform === "Instagram"
                    ? "Max 2200 chars"
                    : platform === "LinkedIn"
                    ? "Professional tone recommended"
                    : ""}
                </span>
                <div className="space-x-2 flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onChange(platform, masterCaption)}
                  >
                    Use Master Caption
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled>
                    <Bot className="h-3 w-3" /> AI
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder={`Write a caption for ${platform}...`}
                className="min-h-[120px]"
                value={caption}
                onChange={(e) => onChange(platform, e.target.value)}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {hardLimit != null && (
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        overHard ? "text-destructive" : tags.length > hardLimit * 0.8 ? "text-amber-500" : "text-muted-foreground"
                      }`}
                    >
                      {tags.length}/{hardLimit} hashtags
                    </span>
                  )}
                  {softLimit != null && !hardLimit && (
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        overSoft ? "text-amber-500" : "text-muted-foreground"
                      }`}
                    >
                      {tags.length} hashtag{tags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{charCount} chars</span>
              </div>

              {overHard && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{rules?.tip}</span>
                </div>
              )}
              {overSoft && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{rules?.tip}</span>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
