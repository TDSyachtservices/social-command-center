import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Check, X, Loader2, RefreshCw } from "lucide-react";
import { improveCaption } from "@/lib/api";

interface AiCaptionReviserProps {
  caption: string;
  platforms: string[];
  onAccept: (revised: string) => void;
  disabled?: boolean;
}

const TONES = [
  {
    value: "professional",
    label: "Professional",
    instructions: "Rewrite in a professional and polished tone suitable for business audiences. Keep it authoritative and credible.",
  },
  {
    value: "friendly",
    label: "Friendly",
    instructions: "Rewrite in a warm, friendly, and conversational tone. Make it feel approachable and human.",
  },
  {
    value: "sales",
    label: "Sales-Oriented",
    instructions: "Rewrite with a sales focus — highlight value, build desire, and include a clear call-to-action.",
  },
  {
    value: "educational",
    label: "Educational",
    instructions: "Rewrite in an educational, informative tone that teaches the audience something useful about the topic.",
  },
  {
    value: "casual",
    label: "Casual",
    instructions: "Rewrite in a casual, relaxed tone — short sentences, natural language, like talking to a friend.",
  },
];

export function AiCaptionReviser({ caption, platforms, onAccept, disabled }: AiCaptionReviserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [revised, setRevised] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!caption.trim()) return;
    setIsGenerating(true);
    setError(null);
    setRevised(null);
    const toneObj = TONES.find((t) => t.value === tone);
    const instructions = toneObj?.instructions ?? "Rewrite in a professional tone.";
    const platformHint = platforms.length > 0 ? platforms.join(" and ") : undefined;
    try {
      const result = await improveCaption({
        caption,
        instructions: platformHint
          ? `${instructions} Optimise for ${platformHint}.`
          : instructions,
      });
      if (!result) throw new Error("No result returned");
      setRevised(result.caption);
    } catch {
      setError("Failed to generate revision. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (revised) {
      onAccept(revised);
      setIsOpen(false);
      setRevised(null);
      setError(null);
    }
  };

  const handleDiscard = () => {
    setIsOpen(false);
    setRevised(null);
    setError(null);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
        onClick={() => setIsOpen(true)}
        disabled={disabled || !caption.trim()}
        title={!caption.trim() ? "Write a caption first" : "Revise caption with AI"}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Revise with AI
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/10 space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Caption Revision
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          onClick={handleDiscard}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={tone} onValueChange={(v) => { setTone(v); setRevised(null); setError(null); }}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            {TONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || !caption.trim()}
          className="shrink-0"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : revised !== null ? (
            <RefreshCw className="h-4 w-4 mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? "Revising…" : revised !== null ? "Re-generate" : "Generate"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {revised !== null && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Original
              </p>
              <div className="text-sm border rounded-md p-3 bg-background min-h-[100px] max-h-[200px] overflow-y-auto whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {caption}
              </div>
              <p className="text-[11px] text-muted-foreground">{caption.length} chars</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Revised · {TONES.find((t) => t.value === tone)?.label}
              </p>
              <div className="text-sm border border-primary/30 rounded-md p-3 bg-background min-h-[100px] max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {revised}
              </div>
              <p className="text-[11px] text-muted-foreground">{revised.length} chars</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Accepting will update the master caption and apply to all platforms.
          </p>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleDiscard}>
              <X className="h-4 w-4 mr-1.5" />
              Keep Original
            </Button>
            <Button type="button" size="sm" onClick={handleAccept}>
              <Check className="h-4 w-4 mr-1.5" />
              Use This
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
