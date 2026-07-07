import { SiFacebook, SiInstagram, SiN8N } from "react-icons/si";
import { Linkedin, Bot, ComponentIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElementType } from "react";

type ExtendedPlatform = string;

interface PlatformBadgeProps {
  platform: ExtendedPlatform;
  className?: string;
  showText?: boolean;
}

function getPlatformConfig(platform: ExtendedPlatform): { Icon: ElementType; colorClass: string; label: string } {
  switch (platform.toLowerCase()) {
    case "facebook":
      return { Icon: SiFacebook, colorClass: "text-[#1877F2] bg-[#1877F2]/12 border-[#1877F2]/25", label: "Facebook" };
    case "instagram":
      return { Icon: SiInstagram, colorClass: "text-[#E4405F] bg-[#E4405F]/12 border-[#E4405F]/25", label: "Instagram" };
    case "linkedin":
      return { Icon: Linkedin, colorClass: "text-[#0A66C2] bg-[#0A66C2]/12 border-[#0A66C2]/25", label: "LinkedIn" };
    case "n8n":
      return { Icon: SiN8N, colorClass: "text-[#EA4B71] bg-[#EA4B71]/12 border-[#EA4B71]/25", label: "n8n" };
    case "local ai":
      return { Icon: Bot, colorClass: "text-violet-600 bg-violet-500/12 border-violet-500/25", label: "Local AI" };
    default:
      return { Icon: ComponentIcon, colorClass: "text-muted-foreground bg-muted border-border", label: platform };
  }
}

export function PlatformBadge({ platform, className, showText = true }: PlatformBadgeProps) {
  const { Icon, colorClass, label } = getPlatformConfig(platform);

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border", colorClass, className)}
      data-testid={`badge-platform-${platform.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {showText && <span>{label}</span>}
    </div>
  );
}
