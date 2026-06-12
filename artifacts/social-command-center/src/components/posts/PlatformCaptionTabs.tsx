import { Platform } from "@/data/mockPosts";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Wand2 } from "lucide-react";

interface PlatformCaptionTabsProps {
  platforms: Platform[];
  masterCaption: string;
  platformCaptions: Record<Platform, string>;
  onChange: (platform: Platform, caption: string) => void;
}

export function PlatformCaptionTabs({ platforms, masterCaption, platformCaptions, onChange }: PlatformCaptionTabsProps) {
  if (platforms.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Platform-Specific Content</label>
      <Tabs defaultValue={platforms[0]} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 flex-wrap">
          {platforms.map(platform => (
            <TabsTrigger key={platform} value={platform} className="gap-2">
              <PlatformBadge platform={platform} showText={false} className="border-none bg-transparent p-0" />
              {platform}
            </TabsTrigger>
          ))}
        </TabsList>
        {platforms.map(platform => (
          <TabsContent key={platform} value={platform} className="space-y-3 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">
                {platform === "Instagram" ? "Max 2200 chars • Up to 30 hashtags" : 
                 platform === "TikTok" ? "Max 2200 chars" : 
                 platform === "LinkedIn" ? "Professional tone recommended" : ""}
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
              value={platformCaptions[platform] || ""}
              onChange={(e) => onChange(platform, e.target.value)}
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {(platformCaptions[platform] || "").length} chars
              </span>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
