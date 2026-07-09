import { ImageIcon, Images, Clapperboard, Sparkles, CalendarDays } from "lucide-react";

export type PostType = "standard" | "album" | "story" | "reel" | "event";

interface PostTypeSelectorProps {
  value: PostType;
  onChange: (type: PostType) => void;
  availablePlatforms: string[];
}

const ALL_TYPES: Array<{
  type: PostType;
  label: string;
  icon: React.ReactNode;
  description: string;
  platforms: string[];
  platformLabel: string;
}> = [
  {
    type: "standard",
    label: "Standard",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "Text, photo, or video post",
    platforms: ["Facebook", "Instagram", "LinkedIn"],
    platformLabel: "All platforms",
  },
  {
    type: "album",
    label: "Album",
    icon: <Images className="w-4 h-4" />,
    description: "Multiple photos (FB album / IG carousel)",
    platforms: ["Facebook", "Instagram"],
    platformLabel: "FB · IG",
  },
  {
    type: "reel",
    label: "Reel",
    icon: <Clapperboard className="w-4 h-4" />,
    description: "Short vertical video",
    platforms: ["Facebook", "Instagram"],
    platformLabel: "FB · IG",
  },
  {
    type: "story",
    label: "Story",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Ephemeral 24-hour content",
    platforms: ["Facebook"],
    platformLabel: "Facebook only",
  },
  {
    type: "event",
    label: "Event",
    icon: <CalendarDays className="w-4 h-4" />,
    description: "Facebook Event with RSVP fields",
    platforms: ["Facebook"],
    platformLabel: "Facebook only",
  },
];

/**
 * Only post types supported by EVERY selected platform are shown — when
 * multiple platforms are picked, options are intersected (not unioned) so
 * the user never selects a type that would silently fail/skip on one of
 * their chosen platforms.
 */
export function getAllowedPostTypes(availablePlatforms: string[]): PostType[] {
  if (availablePlatforms.length === 0) return ALL_TYPES.map((t) => t.type);
  return ALL_TYPES
    .filter((t) => availablePlatforms.every((p) => t.platforms.includes(p)))
    .map((t) => t.type);
}

export function PostTypeSelector({ value, onChange, availablePlatforms }: PostTypeSelectorProps) {
  const allowedTypes = getAllowedPostTypes(availablePlatforms);
  const relevant = ALL_TYPES.filter((t) => allowedTypes.includes(t.type));

  if (availablePlatforms.length > 1 && relevant.length === 1) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Post Type</label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-md px-3 py-2">
          <ImageIcon className="w-4 h-4 shrink-0" />
          <span>Only Standard posts are supported across all selected platforms</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Post Type</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {relevant.map((item) => {
          const active = value === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onChange(item.type)}
              className={[
                "flex flex-col gap-1 rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-1">
                <div className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</div>
                <span className={`text-[9px] font-medium px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border/60`}>
                  {item.platformLabel}
                </span>
              </div>
              <span className={`text-xs font-semibold ${active ? "text-primary" : ""}`}>{item.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{item.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
