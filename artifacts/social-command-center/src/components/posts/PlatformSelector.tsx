import { ReactNode } from "react";
import { Platform } from "@/data/mockPosts";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onChange: (platforms: Platform[]) => void;
}

const AVAILABLE_PLATFORMS: Platform[] = ["Facebook", "Instagram", "LinkedIn", "TikTok", "Website"];

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
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Select Platforms
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AVAILABLE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform);
          return (
            <div
              key={platform}
              className={`flex items-center space-x-3 border rounded-md p-3 cursor-pointer transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => togglePlatform(platform)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => togglePlatform(platform)}
                id={`platform-${platform}`}
              />
              <label
                htmlFor={`platform-${platform}`}
                className="text-sm font-medium leading-none cursor-pointer flex-1 flex items-center gap-2"
                onClick={(e) => e.preventDefault()}
              >
                <PlatformBadge platform={platform} showText={false} />
                {platform}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
