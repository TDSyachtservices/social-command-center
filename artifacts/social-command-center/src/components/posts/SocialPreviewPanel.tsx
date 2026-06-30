import { Platform } from "@/data/mockPosts";
import { SocialPreviewCard } from "./SocialPreviewCard";

interface SocialPreviewPanelProps {
  platforms: Platform[];
  masterCaption: string;
  platformCaptions: Record<Platform, string>;
  mediaUrl: string | null;
  platformMedia?: Record<string, { url: string; type: "image" | "video" } | null>;
  date?: string;
  accountNames?: Partial<Record<Platform, string>>;
}

export function SocialPreviewPanel({ platforms, masterCaption, platformCaptions, mediaUrl, platformMedia, date, accountNames }: SocialPreviewPanelProps) {
  if (platforms.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground p-8 text-center">
        Select platforms to see live previews
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold tracking-tight">Live Previews</h3>
      <div className="grid gap-6">
        {platforms.map(platform => (
          <div key={platform} className="space-y-2">
            <div className="font-medium text-sm text-muted-foreground">{platform} Preview</div>
            <SocialPreviewCard
              platform={platform}
              caption={platformCaptions[platform] || masterCaption}
              mediaUrl={platformMedia?.[platform]?.url ?? mediaUrl}
              date={date}
              accountName={accountNames?.[platform]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
