import { useState, useRef, useEffect } from "react";
import { Music, Search, Play, Pause, Check, X, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface MusicTrack {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
  tags: string[];
  license: string;
  attribution: string;
}

export interface SelectedMusic {
  trackId: string;
  trackName: string;
  artistName: string;
  audioUrl: string;
  attribution: string;
}

interface MusicPickerProps {
  selected: SelectedMusic | null;
  onSelect: (music: SelectedMusic | null) => void;
}

const PRESET_TAGS = ["upbeat", "ambient", "cinematic", "electronic", "acoustic", "pop", "jazz", "relaxing"];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function searchTracks(q: string, tags: string): Promise<{ tracks: MusicTrack[]; error?: string }> {
  const qs = new URLSearchParams({ q, tags, limit: "18" });
  const res = await fetch(`${API_BASE}/api/music/search?${qs}`);
  const data = await res.json() as { success?: boolean; data?: MusicTrack[]; error?: string; message?: string };
  if (!res.ok || !data.success) {
    return { tracks: [], error: data.message ?? data.error ?? "Music search failed" };
  }
  return { tracks: data.data ?? [] };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicPicker({ selected, onSelect }: MusicPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const doSearch = async (q: string, tags: string) => {
    setLoading(true);
    setErrorMsg(null);
    const { tracks: results, error } = await searchTracks(q, tags);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      setTracks([]);
    } else {
      setTracks(results);
    }
  };

  useEffect(() => {
    if (expanded && tracks.length === 0 && !errorMsg) {
      doSearch("", "upbeat");
    }
  }, [expanded]);

  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? "" : tag;
    setActiveTag(next);
    doSearch(query, next);
  };

  const handleSearch = () => doSearch(query, activeTag);

  const togglePlay = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = track.audioUrl;
        audioRef.current.play().catch(() => {});
      }
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: MusicTrack) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect({
      trackId: track.id,
      trackName: track.name,
      artistName: track.artistName,
      audioUrl: track.audioUrl,
      attribution: track.attribution,
    });
    setExpanded(false);
  };

  const handleClear = () => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect(null);
  };

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", () => setPlayingId(null));
    return () => { audioRef.current?.pause(); };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-muted-foreground" />
        <label className="text-sm font-medium">Royalty-Free Music</label>
        <span className="text-[10px] text-muted-foreground">(bake audio into video before upload)</span>
      </div>

      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.trackName}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.artistName}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{selected.attribution}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>Change</Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(true)}
        >
          <Music className="w-4 h-4 mr-2" />
          Browse Royalty-Free Music
        </Button>
      )}

      {expanded && (
        <div className="rounded-lg border border-border bg-background shadow-sm space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search tracks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="text-sm"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={[
                  "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {errorMsg.includes("JAMENDO_CLIENT_ID") || errorMsg.includes("not configured")
                ? <>Music search requires a free Jamendo API key. Add <code className="font-mono">JAMENDO_CLIENT_ID</code> to your Railway environment variables (<a href="https://developer.jamendo.com" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">developer.jamendo.com <ExternalLink className="w-3 h-3" /></a>).</>
                : errorMsg}
            </div>
          )}

          {!loading && !errorMsg && tracks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No tracks found — try a different search or tag.</p>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {tracks.map((track) => {
              const isSelected = selected?.trackId === track.id;
              const isPlaying = playingId === track.id;
              return (
                <div
                  key={track.id}
                  className={[
                    "flex items-center gap-2 rounded-md p-2 border transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
                  ].join(" ")}
                >
                  <img
                    src={track.imageUrl}
                    alt={track.albumName}
                    className="h-10 w-10 rounded object-cover flex-shrink-0 bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />

                  <button
                    type="button"
                    onClick={() => togglePlay(track)}
                    className="flex-shrink-0 h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{track.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artistName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{formatDuration(track.duration)}</span>
                      {track.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1">{t}</Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className="flex-shrink-0 h-7 text-xs"
                    onClick={() => handleSelect(track)}
                  >
                    {isSelected ? <><Check className="w-3 h-3 mr-1" />Selected</> : "Use"}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Music from <a href="https://jamendo.com" target="_blank" rel="noreferrer" className="underline">Jamendo</a> — Creative Commons licensed.
            Mix your selected track into the video before uploading to apply it to your Reel.
          </p>
        </div>
      )}
    </div>
  );
}
