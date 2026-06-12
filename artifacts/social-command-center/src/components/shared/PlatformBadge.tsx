import { Platform } from "@/data/mockPosts";
import { SiFacebook, SiInstagram, SiTiktok, SiN8N } from "react-icons/si";
import { Globe, Linkedin, Bot, ComponentIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElementType } from "react";

type ExtendedPlatform = Platform | "n8n" | "Local AI" | string;

interface PlatformBadgeProps {
  platform: ExtendedPlatform;
  className?: string;
  showText?: boolean;
}

function getPlatformConfig(platform: ExtendedPlatform): { Icon: ElementType; colorClass: string } {
  switch (platform) {
    case "Facebook":
      return { Icon: SiFacebook, colorClass: "text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20" };
    case "Instagram":
      return { Icon: SiInstagram, colorClass: "text-[#E4405F] bg-[#E4405F]/10 border-[#E4405F]/20" };
    case "LinkedIn":
      return { Icon: Linkedin, colorClass: "text-[#0A66C2] bg-[#0A66C2]/10 border-[#0A66C2]/20" };
    case "TikTok":
      return { Icon: SiTiktok, colorClass: "text-black dark:text-white bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20" };
    case "Website":
      return { Icon: Globe, colorClass: "text-teal-600 bg-teal-600/10 border-teal-600/20" };
    case "n8n":
      return { Icon: SiN8N, colorClass: "text-[#EA4B71] bg-[#EA4B71]/10 border-[#EA4B71]/20" };
    case "Local AI":
      return { Icon: Bot, colorClass: "text-violet-600 bg-violet-600/10 border-violet-600/20" };
    default:
      return { Icon: ComponentIcon, colorClass: "text-muted-foreground bg-muted border-border" };
  }
}

export function PlatformBadge({ platform, className, showText = true }: PlatformBadgeProps) {
  const { Icon, colorClass } = getPlatformConfig(platform);

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}
      data-testid={`badge-platform-${platform.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {showText && <span>{platform}</span>}
    </div>
  );
}
