import { ReactNode } from "react";
import { Platform } from "@/data/mockPosts";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import { Globe, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
  showText?: boolean;
}

export function PlatformBadge({ platform, className, showText = true }: PlatformBadgeProps) {
  let Icon;
  let colorClass = "";
  
  switch (platform) {
    case "Facebook":
      Icon = SiFacebook;
      colorClass = "text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20";
      break;
    case "Instagram":
      Icon = SiInstagram;
      colorClass = "text-[#E4405F] bg-[#E4405F]/10 border-[#E4405F]/20";
      break;
    case "LinkedIn":
      Icon = Linkedin;
      colorClass = "text-[#0A66C2] bg-[#0A66C2]/10 border-[#0A66C2]/20";
      break;
    case "TikTok":
      Icon = SiTiktok;
      colorClass = "text-black dark:text-white bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20";
      break;
    case "Website":
      Icon = Globe;
      colorClass = "text-teal-600 bg-teal-600/10 border-teal-600/20";
      break;
  }

  return (
    <div 
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}
      data-testid={`badge-platform-${platform.toLowerCase()}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {showText && <span>{platform}</span>}
    </div>
  );
}