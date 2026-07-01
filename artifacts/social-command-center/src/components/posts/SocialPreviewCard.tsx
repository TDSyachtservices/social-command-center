import { Platform } from "@/data/mockPosts";
import { Image as ImageIcon, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Send, Music2, AlertTriangle } from "lucide-react";

interface SocialPreviewCardProps {
  platform: Platform;
  caption: string;
  mediaUrl: string | null;
  mediaType?: "image" | "video";
  date?: string;
  accountName?: string;
  optimizedVersion?: { width: number; height: number; qualityScore: string; cropMode: string };
}

function MediaPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`bg-muted flex items-center justify-center text-muted-foreground ${className}`}>
      <ImageIcon className="h-8 w-8 opacity-40" />
    </div>
  );
}

function MediaEl({ url, mediaType, className }: { url: string; mediaType?: "image" | "video"; className?: string }) {
  if (mediaType === "video") {
    return <video src={url} className={className} controls muted autoPlay playsInline loop />;
  }
  return <img src={url} alt="" className={className} />;
}

function Avatar({ name, size = "md", color = "bg-blue-600" }: { name?: string; size?: "sm" | "md"; color?: string }) {
  const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full ${color} text-white flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

// ── Facebook ────────────────────────────────────────────────────────────────
function FacebookPreview({ caption, mediaUrl, mediaType, date, accountName }: Omit<SocialPreviewCardProps, "platform" | "optimizedVersion">) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-[13px]">
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={accountName} color="bg-blue-600" />
          <div>
            <div className="font-semibold text-[13px] leading-tight">{accountName || "Your Page"}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              {date && date !== "Preview" ? date : "Just now"} · 🌐
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>

      {caption && <div className="px-3 pb-2 text-[13px] leading-snug whitespace-pre-wrap">{caption}</div>}

      {mediaUrl && (
        <div className="w-full overflow-hidden bg-black">
          <MediaEl url={mediaUrl} mediaType={mediaType} className="w-full h-auto block" />
        </div>
      )}

      <div className="flex divide-x border-t">
        {[
          { icon: <ThumbsUp className="h-4 w-4" />, label: "Like" },
          { icon: <MessageCircle className="h-4 w-4" />, label: "Comment" },
          { icon: <Share2 className="h-4 w-4" />, label: "Share" },
        ].map(({ icon, label }) => (
          <button key={label} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            {icon}{label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Instagram ───────────────────────────────────────────────────────────────
function InstagramPreview({ caption, mediaUrl, mediaType, date, accountName }: Omit<SocialPreviewCardProps, "platform" | "optimizedVersion">) {
  const handle = accountName ? accountName.toLowerCase().replace(/\s+/g, "_") : "your_account";
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-[13px]">
      <div className="p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
              <Avatar name={accountName} size="sm" color="bg-gradient-to-tr from-yellow-400 to-pink-500" />
            </div>
          </div>
          <div>
            <div className="font-semibold text-[12px]">{handle}</div>
            {date && date !== "Preview" && <div className="text-[10px] text-muted-foreground">{date}</div>}
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {mediaUrl ? (
        <div className="aspect-square w-full overflow-hidden">
          <MediaEl url={mediaUrl} mediaType={mediaType} className="w-full h-full object-cover" />
        </div>
      ) : (
        <MediaPlaceholder className="aspect-square" />
      )}

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Share2 className="h-5 w-5" />
          </div>
          <Bookmark className="h-5 w-5" />
        </div>
        <div className="text-[12px] font-semibold">24 likes</div>
        {caption && (
          <div className="text-[12px] leading-snug">
            <span className="font-semibold mr-1">{handle}</span>
            <span className="whitespace-pre-wrap">{caption}</span>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">View all 3 comments</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {date && date !== "Preview" ? date : "Just now"}
        </div>
      </div>
    </div>
  );
}

// ── LinkedIn ─────────────────────────────────────────────────────────────────
function LinkedInPreview({ caption, mediaUrl, mediaType, date, accountName }: Omit<SocialPreviewCardProps, "platform" | "optimizedVersion">) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-[13px]">
      <div className="p-3 flex items-start gap-2">
        <div className="w-10 h-10 rounded-sm bg-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
          {accountName ? accountName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?"}
        </div>
        <div>
          <div className="font-semibold text-[13px] leading-tight">{accountName || "Your Company"}</div>
          <div className="text-[11px] text-muted-foreground">1,234 followers</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            {date && date !== "Preview" ? date : "Just now"} · 🌐
          </div>
        </div>
      </div>

      {caption && <div className="px-3 pb-2 text-[13px] leading-snug whitespace-pre-wrap">{caption}</div>}

      {mediaUrl ? (
        <div className="aspect-[1.91/1] w-full overflow-hidden">
          <MediaEl url={mediaUrl} mediaType={mediaType} className="w-full h-full object-cover" />
        </div>
      ) : (
        <MediaPlaceholder className="aspect-[1.91/1]" />
      )}

      <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b">
        👍 ❤️ 💡 &nbsp;18 reactions · 4 comments
      </div>
      <div className="flex divide-x">
        {[
          { icon: <ThumbsUp className="h-3.5 w-3.5" />, label: "Like" },
          { icon: <MessageCircle className="h-3.5 w-3.5" />, label: "Comment" },
          { icon: <Repeat2 className="h-3.5 w-3.5" />, label: "Repost" },
          { icon: <Send className="h-3.5 w-3.5" />, label: "Send" },
        ].map(({ icon, label }) => (
          <button key={label} className="flex-1 py-2 flex flex-col items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── TikTok ───────────────────────────────────────────────────────────────────
function TikTokPreview({ caption, mediaUrl, mediaType, accountName }: Omit<SocialPreviewCardProps, "platform" | "optimizedVersion" | "date">) {
  const handle = accountName ? "@" + accountName.toLowerCase().replace(/\s+/g, "") : "@your_account";
  return (
    <div className="rounded-lg overflow-hidden bg-black shadow-sm relative font-sans" style={{ aspectRatio: "9/16", maxHeight: 480 }}>
      {mediaUrl ? (
        mediaType === "video" ? (
          <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline controls />
        ) : (
          <img src={mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <ImageIcon className="h-12 w-12" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-10 p-3 space-y-1 pointer-events-none">
        <div className="text-white font-semibold text-[12px]">{handle}</div>
        {caption && (
          <div className="text-white/90 text-[11px] leading-snug line-clamp-2 whitespace-pre-wrap">{caption}</div>
        )}
        <div className="flex items-center gap-1 text-white/80 text-[11px]">
          <Music2 className="h-3 w-3" />
          <span className="truncate">Original sound — {accountName || "Your Account"}</span>
        </div>
      </div>

      <div className="absolute right-2 bottom-12 flex flex-col items-center gap-4 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-red-500 border-2 border-white flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">+</span>
        </div>
        {[
          { icon: <Heart className="h-5 w-5 text-white" />, count: "24K" },
          { icon: <MessageCircle className="h-5 w-5 text-white" />, count: "312" },
          { icon: <Bookmark className="h-5 w-5 text-white" />, count: "1.2K" },
          { icon: <Share2 className="h-5 w-5 text-white" />, count: "Share" },
        ].map(({ icon, count }, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {icon}
            <span className="text-white text-[9px]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Website OG ───────────────────────────────────────────────────────────────
function WebsitePreview({ caption, mediaUrl, mediaType, accountName }: Omit<SocialPreviewCardProps, "platform" | "optimizedVersion" | "date">) {
  const domain = accountName ? accountName.toLowerCase().replace(/\s+/g, "") + ".com" : "yourwebsite.com";
  const title = caption ? caption.split("\n")[0].slice(0, 60) : "Your post title";
  const description = caption && caption.includes("\n") ? caption.split("\n").slice(1).join(" ").slice(0, 120) : caption?.slice(0, 120) || "";
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-[13px]">
      {mediaUrl ? (
        <div className="aspect-[1.91/1] w-full overflow-hidden">
          <MediaEl url={mediaUrl} mediaType={mediaType} className="w-full h-full object-cover" />
        </div>
      ) : (
        <MediaPlaceholder className="aspect-[1.91/1]" />
      )}
      <div className="p-3 border-t bg-muted/20 space-y-0.5">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{domain}</div>
        <div className="font-semibold text-[13px] leading-snug line-clamp-2">{title}</div>
        {description && <div className="text-[11px] text-muted-foreground line-clamp-2">{description}</div>}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function SocialPreviewCard({ platform, caption, mediaUrl, mediaType, date, accountName, optimizedVersion }: SocialPreviewCardProps) {
  const props = { caption, mediaUrl, mediaType, date, accountName, optimizedVersion };

  const preview = (() => {
    switch (platform) {
      case "Facebook":  return <FacebookPreview  {...props} />;
      case "Instagram": return <InstagramPreview {...props} />;
      case "LinkedIn":  return <LinkedInPreview  {...props} />;
      default:          return <FacebookPreview  {...props} />;
    }
  })();

  return (
    <div>
      {preview}
      {!optimizedVersion && mediaUrl && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          <span>Original asset — use the Media Optimizer to crop for this platform</span>
        </div>
      )}
    </div>
  );
}
