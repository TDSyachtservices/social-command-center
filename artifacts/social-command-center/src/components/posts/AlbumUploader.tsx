import { useState } from "react";
import { Plus, X, GripVertical, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AlbumUploaderProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxItems?: number;
  minItems?: number;
}

export function AlbumUploader({
  urls,
  onChange,
  label = "Album Photos",
  maxItems = 10,
  minItems = 2,
}: AlbumUploaderProps) {
  const [inputValue, setInputValue] = useState("");

  const addUrl = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (urls.length >= maxItems) return;
    if (urls.includes(trimmed)) return;
    onChange([...urls, trimmed]);
    setInputValue("");
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    const next = [...urls];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Images className="w-4 h-4 text-muted-foreground" />
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground ml-auto">
          {urls.length}/{maxItems} — min {minItems}
        </span>
      </div>

      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.map((url, idx) => (
            <div
              key={url + idx}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
            >
              <button
                type="button"
                className="cursor-grab text-muted-foreground hover:text-foreground"
                title="Drag to reorder"
                onClick={() => idx > 0 && move(idx, idx - 1)}
              >
                <GripVertical className="w-4 h-4" />
              </button>

              {/\.(jpe?g|png|gif|webp)$/i.test(url) ? (
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="h-12 w-12 rounded object-cover flex-shrink-0 border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Images className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              <span className="flex-1 text-xs text-muted-foreground truncate min-w-0">{url}</span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">#{idx + 1}</span>

              <button
                type="button"
                onClick={() => removeUrl(idx)}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length < maxItems && (
        <div className="flex gap-2">
          <Input
            placeholder="Paste a public image URL…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUrl}
            disabled={!inputValue.trim() || urls.length >= maxItems}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      )}

      {urls.length < minItems && urls.length > 0 && (
        <p className="text-xs text-amber-600">
          Add at least {minItems - urls.length} more photo{minItems - urls.length > 1 ? "s" : ""} to create an album.
        </p>
      )}
    </div>
  );
}
