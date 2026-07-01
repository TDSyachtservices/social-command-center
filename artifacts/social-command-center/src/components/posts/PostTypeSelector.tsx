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
}> = [
  {
    type: "standard",
    label: "Standard",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "Text, single photo, or video",
    platforms: ["Facebook", "Instagram"],
  },
  {
    type: "album",
    label: "Album / Carousel",
    icon: <Images className="w-4 h-4" />,
    description: "Multiple photos (FB album, IG carousel)",
    platforms: ["Facebook", "Instagram"],
  },
  {
    type: "reel",
    label: "Reel",
    icon: <Clapperboard className="w-4 h-4" />,
    description: "Short vertical video with music",
    platforms: ["Facebook", "Instagram"],
  },
  {
    type: "story",
    label: "Story",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Ephemeral 24h content",
    platforms: ["Facebook", "Instagram"],
  },
  {
    type: "event",
    label: "Event",
    icon: <CalendarDays className="w-4 h-4" />,
    description: "Facebook Event with RSVP fields",
    platforms: ["Facebook"],
  },
];

export function PostTypeSelector({ value, onChange, availablePlatforms }: PostTypeSelectorProps) {
  const relevant = ALL_TYPES.filter((t) =>
    t.platforms.some((p) => availablePlatforms.includes(p))
  );

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
              <div className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</div>
              <span className={`text-xs font-semibold ${active ? "text-primary" : ""}`}>{item.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{item.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
