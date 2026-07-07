import { Platform } from "@/data/mockPosts";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Zap } from "lucide-react";

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onChange: (platforms: Platform[]) => void;
}

const AVAILABLE_PLATFORMS: Platform[] = ["Facebook", "Instagram", "LinkedIn"];

interface PlatformInfo {
  postTypes: string[];
  liveApi: boolean;
  note?: string;
}

const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  Facebook: {
    postTypes: ["Standard", "Album", "Story", "Event"],
    liveApi: true,
  },
  Instagram: {
    postTypes: ["Standard", "Carousel", "Reel"],
    liveApi: true,
  },
  LinkedIn: {
    postTypes: ["Standard"],
    liveApi: false,
    note: "Integration coming soon",
  },
};

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      onChange(selectedPlatforms.filter(p => p !== platform));
    } else {
      onChange([...selectedPlatforms, platform]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">
        Select Platforms
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AVAILABLE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform);
          const info = PLATFORM_INFO[platform];
          return (
            <div
              key={platform}
              className={`flex flex-col gap-2 border rounded-md p-3 cursor-pointer transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => togglePlatform(platform)}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => togglePlatform(platform)}
                  id={`platform-${platform}`}
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={`platform-${platform}`}
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 flex-1"
                  onClick={(e) => e.preventDefault()}
                >
                  <PlatformBadge platform={platform} showText={false} />
                  {platform}
                </label>
                {info.liveApi && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                    <Zap className="w-2.5 h-2.5" />
                    Live
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 pl-6">
                {info.postTypes.map((type) => (
                  <span
                    key={type}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
                  >
                    {type}
                  </span>
                ))}
              </div>

              {info.note && (
                <p className="text-[10px] text-muted-foreground pl-6 leading-tight">{info.note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
