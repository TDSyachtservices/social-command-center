import { useState, useEffect } from "react";
import { Hash, Plus, X, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { loadSets, parseHashtags, validateHashtag, type HashtagSet } from "@/lib/hashtagStore";

const TRENDING_SUGGESTIONS = [
  "#boating", "#yachting", "#marine", "#teak", "#luxuryyacht",
  "#sailing", "#teakdeck", "#boatlife", "#superyacht", "#seamanship",
];

interface HashtagPickerProps {
  platforms: string[];
  platformHashtags: Record<string, string[]>;
  onChange: (platform: string, tags: string[]) => void;
}

function HashtagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
      {tag}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-destructive">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function HashtagPicker({ platforms, platformHashtags, onChange }: HashtagPickerProps) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<HashtagSet[]>([]);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [activePlatform, setActivePlatform] = useState(platforms[0] ?? "");

  useEffect(() => {
    if (open) loadSets().then(setSets).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(activePlatform)) {
      setActivePlatform(platforms[0]);
    }
  }, [platforms]);

  const currentTags = platformHashtags[activePlatform] ?? [];

  const addTags = (tags: string[]) => {
    const existing = new Set(currentTags);
    const newTags = tags.filter((t) => !existing.has(t));
    if (newTags.length > 0) onChange(activePlatform, [...currentTags, ...newTags]);
  };

  const addSet = (set: HashtagSet) => addTags(set.hashtags);

  const removeTag = (tag: string) =>
    onChange(activePlatform, currentTags.filter((t) => t !== tag));

  const addCustom = () => {
    const raw = customInput.trim();
    if (!raw) return;
    const tags = parseHashtags(raw);
    if (tags.length === 0) {
      setCustomError("Invalid hashtag format");
      return;
    }
    addTags(tags);
    setCustomInput("");
    setCustomError("");
  };

  const filteredSets = search
    ? sets.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.hashtags.some((t) => t.includes(search.toLowerCase()))
      )
    : sets;

  const totalTags = platforms.reduce(
    (n, p) => n + (platformHashtags[p]?.length ?? 0),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Hash className="w-4 h-4" /> Hashtags
          {totalTags > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalTags}
            </Badge>
          )}
        </label>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Browse Library
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
            <SheetHeader className="px-5 py-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Hash className="w-4 h-4" /> Hashtag Library
              </SheetTitle>
            </SheetHeader>

            {platforms.length > 1 && (
              <div className="px-5 pt-3 pb-2 border-b">
                <p className="text-xs text-muted-foreground mb-2">Adding to:</p>
                <div className="flex gap-2 flex-wrap">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePlatform(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        activePlatform === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-3 border-b">
              <div className="flex gap-2">
                <Input
                  placeholder="#hashtag or multiple space-separated"
                  value={customInput}
                  onChange={(e) => { setCustomInput(e.target.value); setCustomError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  className="h-8 text-sm"
                />
                <Button size="sm" onClick={addCustom} className="h-8">Add</Button>
              </div>
              {customError && <p className="text-xs text-destructive mt-1">{customError}</p>}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search saved sets…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-sm pl-8"
                  />
                </div>
              </div>

              {filteredSets.length > 0 ? (
                <div className="px-5 space-y-2 pb-4">
                  {filteredSets.map((set) => (
                    <div key={set.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{set.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {set.hashtags.length} hashtag{set.hashtags.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => addSet(set)}
                        >
                          <Plus className="w-3 h-3" /> Add set
                        </Button>
                      </div>
                      {set.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {set.platforms.map((p) => (
                            <PlatformBadge key={p} platform={p} showText={true} className="text-[10px] py-0" />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {set.hashtags.slice(0, 8).map((t) => (
                          <button
                            key={t}
                            onClick={() => addTags([t])}
                            className="text-[11px] bg-muted hover:bg-primary/10 hover:text-primary px-1.5 py-0.5 rounded transition-colors font-mono"
                          >
                            {t}
                          </button>
                        ))}
                        {set.hashtags.length > 8 && (
                          <span className="text-[11px] text-muted-foreground self-center">
                            +{set.hashtags.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {sets.length === 0
                      ? "No saved sets yet. Create some in the Hashtag Library."
                      : "No sets match your search."}
                  </p>
                </div>
              )}

              <div className="px-5 pb-5">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Trending suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_SUGGESTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => addTags([t])}
                      className="text-[11px] bg-muted hover:bg-primary/10 hover:text-primary px-2 py-0.5 rounded-full transition-colors font-mono"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {platforms.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {platforms.map((p) => {
            const count = platformHashtags[p]?.length ?? 0;
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
                  activePlatform === p
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                {p}
                {count > 0 && <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-bold">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/30 rounded-md border">
          {currentTags.map((tag) => (
            <HashtagChip key={tag} tag={tag} onRemove={() => removeTag(tag)} />
          ))}
        </div>
      )}

      {currentTags.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No hashtags added for {platforms.length > 1 ? activePlatform : "this post"} yet.
        </p>
      )}
    </div>
  );
}
