import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  getMediaAsset,
  getMediaSpecs,
  patchFocalPoint,
  uploadFile,
  scoreImageWithAi,
  patchVersionScore,
} from "@/lib/api";
import type { ApiMediaVersion, ApiMediaSpec } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import {
  Image as ImageIcon,
  Film,
  Crop,
  UploadCloud,
  CheckCircle2,
  Download,
  ArrowLeft,
  Move,
  Loader2,
  Wand2,
  Sparkles,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// ─── Platform spec helpers ────────────────────────────────────────────────────
interface DisplaySpec {
  platform: string;
  placement: string;
  width: number;
  height: number;
  aspectRatio: string;
}

const PLATFORM_DISPLAY: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

const HIDDEN_PLATFORMS = new Set(["TIKTOK", "WEBSITE"]);

function toDisplaySpec(s: ApiMediaSpec): DisplaySpec {
  return {
    platform: PLATFORM_DISPLAY[s.platform] ?? s.platform,
    placement: s.placement
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    width: s.width,
    height: s.height,
    aspectRatio: s.aspectRatio,
  };
}

const MEDIA_LIBRARY_KEY = "scc:media-library:v1";

type OptimizerAsset = {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalDuration?: number | null;
  processingStatus: string;
  previewUrl: string | null;
  allVersions: ApiMediaVersion[];
};

function getLocalPreviewUrl(assetId: string): string | null {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as Array<{ id: string; previewUrl?: string }>;
    return list.find((a) => a.id === assetId)?.previewUrl ?? null;
  } catch {
    return null;
  }
}

/** Append a fresh cache-busting query so re-cut images reload in the browser. */
function withCacheBust(url: string): string {
  return `${url.split("?")[0]}?t=${Date.now()}`;
}

/** Tailwind classes for a quality label badge. */
function qualityBadgeClasses(label: string | null): string {
  switch (label) {
    case "Excellent":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "Good":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "Needs Review":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "Poor":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ─── Crop Editor ──────────────────────────────────────────────────────────────
interface CropEditorProps {
  asset: OptimizerAsset;
  version: ApiMediaVersion;
  onClose: () => void;
  onSaved: (version: ApiMediaVersion) => void;
}

function CropEditor({ asset, version, onClose, onSaved }: CropEditorProps) {
  const { toast } = useToast();
  // Focal point 0–100, default to stored value or centre.
  const stored = version.focalPointJson as { x?: number; y?: number } | null;
  const [focalX, setFocalX] = useState<number>(
    stored?.x != null ? Math.round(stored.x * 100) : 50,
  );
  const [focalY, setFocalY] = useState<number>(
    stored?.y != null ? Math.round(stored.y * 100) : 50,
  );
  const [isSaving, setIsSaving] = useState(false);

  const platformDisplay =
    version.platform.charAt(0) + version.platform.slice(1).toLowerCase();
  const label = `${platformDisplay} — ${version.placement.replace(/_/g, " ")}`;

  // The crop overlay rectangle, expressed as percentages of the source image.
  // For a cover-crop: we need to fit the target ratio inside the source while covering it.
  const srcW = asset.originalWidth || 1;
  const srcH = asset.originalHeight || 1;
  const tgtW = version.width;
  const tgtH = version.height;

  // Scale factor: scale the source so the target box is inscribed.
  // cover-crop means scale = max(tgtW/srcW, tgtH/srcH)
  const scaleX = tgtW / srcW;
  const scaleY = tgtH / srcH;
  const scale = Math.max(scaleX, scaleY);

  // Visible area in source pixels at this scale.
  const visW = tgtW / scale; // width of the crop window in source px
  const visH = tgtH / scale; // height of the crop window in source px

  // Focal point clamped so the crop window doesn't go outside the source.
  const halfW = visW / 2;
  const halfH = visH / 2;
  const cx = Math.min(Math.max(focalX / 100, halfW / srcW), 1 - halfW / srcW);
  const cy = Math.min(Math.max(focalY / 100, halfH / srcH), 1 - halfH / srcH);

  // Crop rect in % of source dimensions.
  const rectLeft = (cx - halfW / srcW) * 100;
  const rectTop = (cy - halfH / srcH) * 100;
  const rectWidth = (visW / srcW) * 100;
  const rectHeight = (visH / srcH) * 100;

  // Background size/position that render the EXACT same crop window the server
  // writes. We render the live preview with background-image rather than
  // <img object-position>, because object-position uses p*(scaled-target) while
  // both this overlay and the server crop the window centred on the focal point
  // (p*scaled - target/2, clamped). Using object-position would show a different
  // crop than the saved output for off-centre focal points.
  const bgSizeX = (srcW / visW) * 100;
  const bgSizeY = (srcH / visH) * 100;
  const denomX = srcW - visW;
  const denomY = srcH - visH;
  const bgPosX = denomX > 0.0001 ? ((cx * srcW - halfW) / denomX) * 100 : 50;
  const bgPosY = denomY > 0.0001 ? ((cy * srcH - halfH) / denomY) * 100 : 50;

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updated = await patchFocalPoint(asset.id, version.id, focalX / 100, focalY / 100);
      if (!updated) throw new Error("Request failed");
      toast({ title: "Crop saved", description: "The image was re-cut around your focal point." });
      onSaved(updated);
      onClose();
    } catch {
      toast({ title: "Save failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [asset.id, version.id, focalX, focalY, onSaved, onClose, toast]);

  const sourceUrl = asset.previewUrl;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="h-5 border-l" />
        <div>
          <span className="font-semibold">{label}</span>
          <span className="text-muted-foreground text-sm ml-2">
            {version.width} × {version.height}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Source image + overlay */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Original — drag focal point with sliders
            </span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center bg-muted/20 overflow-hidden">
            {sourceUrl ? (
              <div className="relative max-w-full max-h-full" style={{ display: "inline-block" }}>
                <img
                  src={sourceUrl}
                  alt="Original"
                  className="max-w-full max-h-[calc(100vh-260px)] object-contain block"
                  style={{ userSelect: "none" }}
                />
                {/* Dark overlay outside the crop window */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `
                      linear-gradient(to bottom,
                        rgba(0,0,0,0.5) ${rectTop}%,
                        transparent ${rectTop}%,
                        transparent ${rectTop + rectHeight}%,
                        rgba(0,0,0,0.5) ${rectTop + rectHeight}%
                      ),
                      linear-gradient(to right,
                        rgba(0,0,0,0.5) ${rectLeft}%,
                        transparent ${rectLeft}%,
                        transparent ${rectLeft + rectWidth}%,
                        rgba(0,0,0,0.5) ${rectLeft + rectWidth}%
                      )
                    `,
                  }}
                />
                {/* Crop border */}
                <div
                  className="absolute border-2 border-white pointer-events-none"
                  style={{
                    left: `${rectLeft}%`,
                    top: `${rectTop}%`,
                    width: `${rectWidth}%`,
                    height: `${rectHeight}%`,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                  }}
                />
                {/* Focal point crosshair */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${focalX}%`,
                    top: `${focalY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="relative w-5 h-5">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-80" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-black/30" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm text-center space-y-2">
                <ImageIcon className="w-12 h-12 mx-auto opacity-30" />
                <p>Original image not available</p>
                <p className="text-xs">Upload from the Media Library first</p>
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-muted/30">
            <span className="text-xs text-muted-foreground font-medium">Live Preview — {version.width} × {version.height}</span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center bg-muted/20 overflow-hidden">
            {sourceUrl ? (
              <div
                className="overflow-hidden shadow-lg border border-border bg-muted"
                role="img"
                aria-label="Cropped preview"
                style={{
                  // Scale preview to fit the available space while maintaining exact ratio.
                  aspectRatio: `${version.width} / ${version.height}`,
                  maxWidth: "min(100%, 440px)",
                  maxHeight: "calc(100vh - 260px)",
                  width: "100%",
                  // Render the exact crop window the server writes (see bgPos math above).
                  backgroundImage: `url("${sourceUrl}")`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
                  backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                }}
              />
            ) : (
              <div className="text-muted-foreground text-sm text-center space-y-2">
                <Crop className="w-12 h-12 mx-auto opacity-30" />
                <p>No preview available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sliders + actions */}
      <div className="p-5 border-t bg-background flex-shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Horizontal position</label>
              <span className="text-sm tabular-nums text-muted-foreground">{focalX}%</span>
            </div>
            <Slider
              value={[focalX]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setFocalX(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Left</span>
              <span>Centre</span>
              <span>Right</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Vertical position</label>
              <span className="text-sm tabular-nums text-muted-foreground">{focalY}%</span>
            </div>
            <Slider
              value={[focalY]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setFocalY(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Top</span>
              <span>Centre</span>
              <span>Bottom</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFocalX(50); setFocalY(50); }}
          >
            Reset to centre
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save crop"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Derive a MIME type from the file's extension, fallback to a safe default. */
function getMimeType(fileName: string, fileType: "image" | "video"): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext] ?? (fileType === "video" ? "video/mp4" : "image/jpeg");
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MediaOptimizer() {
  const { assetId } = useParams();
  const { toast } = useToast();
  const [specs, setSpecs] = useState<DisplaySpec[]>([]);
  const [asset, setAsset] = useState<OptimizerAsset | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [displayedVersions, setDisplayedVersions] = useState<ApiMediaVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ApiMediaVersion | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  useEffect(() => {
    getMediaSpecs().then((raw) =>
      setSpecs(raw.filter((s) => !HIDDEN_PLATFORMS.has(s.platform)).map(toDisplaySpec))
    );
  }, []);

  useEffect(() => {
    if (!assetId) return;
    setAsset(null);
    setDisplayedVersions([]);
    setSelectedPresets([]);
    setEditingVersion(null);

    getMediaAsset(assetId).then((api) => {
      if (!api) return;
      const previewUrl = api.originalPublicUrl ?? getLocalPreviewUrl(assetId);
      const allVersions: ApiMediaVersion[] = api.versions ?? [];
      setAsset({
        id: api.id,
        originalFileName: api.originalFileName,
        originalFileType: (api.originalFileType === "video" ? "video" : "image") as "image" | "video",
        originalSizeBytes: api.originalSizeBytes,
        originalWidth: api.originalWidth ?? 0,
        originalHeight: api.originalHeight ?? 0,
        processingStatus: api.processingStatus,
        previewUrl,
        allVersions,
      });
      setDisplayedVersions(allVersions);
    });
  }, [assetId]);

  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [isScoringAll, setIsScoringAll] = useState(false);

  /** Merge a partial update into a version in both the displayed and full lists. */
  const applyVersionUpdate = useCallback(
    (versionId: string, patch: Partial<ApiMediaVersion>) => {
      const merge = (v: ApiMediaVersion): ApiMediaVersion =>
        v.id === versionId ? { ...v, ...patch } : v;
      setDisplayedVersions((prev) => prev.map(merge));
      setAsset((prev) => (prev ? { ...prev, allVersions: prev.allVersions.map(merge) } : prev));
    },
    [],
  );

  const handleFocalPointSaved = useCallback(
    (updated: ApiMediaVersion) => {
      // The file at publicUrl changed but the URL didn't — bust the browser
      // cache so the freshly re-cut image is shown instead of the stale one.
      const busted: ApiMediaVersion = {
        ...updated,
        publicUrl: updated.publicUrl ? withCacheBust(updated.publicUrl) : null,
      };
      const merge = (v: ApiMediaVersion): ApiMediaVersion =>
        v.id === updated.id ? busted : v;
      setDisplayedVersions((prev) => prev.map(merge));
      setAsset((prev) => (prev ? { ...prev, allVersions: prev.allVersions.map(merge) } : prev));
    },
    [],
  );

  /** Score one version with the AI vision model, persist it, and reflect locally. */
  const scoreVersion = useCallback(
    async (version: ApiMediaVersion): Promise<boolean> => {
      if (!version.publicUrl) return false;
      const result = await scoreImageWithAi({
        imageUrl: version.publicUrl.split("?")[0], // drop any cache-bust query
        platform: version.platform,
        placement: version.placement,
        width: version.width,
        height: version.height,
      });
      if (!result) return false;
      await patchVersionScore(version.id, result); // best-effort persist to Railway
      applyVersionUpdate(version.id, {
        qualityScore: result.score,
        qualityScoreLabel: result.label,
        qualityScoreReason: result.reason,
        validationStatus:
          result.label === "Poor" || result.label === "Needs Review"
            ? "NEEDS_REVIEW"
            : "READY",
      });
      return true;
    },
    [applyVersionUpdate],
  );

  const handleAiCheck = useCallback(
    async (version: ApiMediaVersion) => {
      if (!version.publicUrl) {
        toast({
          title: "Nothing to check",
          description: "Generate this version before running the AI quality check.",
          variant: "destructive",
        });
        return;
      }
      setScoringIds((prev) => new Set(prev).add(version.id));
      try {
        const ok = await scoreVersion(version);
        if (!ok) {
          toast({
            title: "AI check failed",
            description: "Couldn't score this image. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setScoringIds((prev) => {
          const next = new Set(prev);
          next.delete(version.id);
          return next;
        });
      }
    },
    [scoreVersion, toast],
  );

  const handleCheckAll = useCallback(async () => {
    const targets = displayedVersions.filter((v) => v.publicUrl);
    if (targets.length === 0 || isScoringAll) return;
    setIsScoringAll(true);
    setScoringIds(new Set(targets.map((v) => v.id)));
    let ok = 0;
    let fail = 0;
    let cursor = 0;
    const CONCURRENCY = 2;
    const worker = async () => {
      while (cursor < targets.length) {
        const v = targets[cursor++];
        try {
          if (await scoreVersion(v)) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
        setScoringIds((prev) => {
          const next = new Set(prev);
          next.delete(v.id);
          return next;
        });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker),
    );
    setIsScoringAll(false);
    setScoringIds(new Set());
    toast({
      title: "AI quality check complete",
      description: `${ok} scored${fail ? `, ${fail} failed` : ""}.`,
    });
  }, [displayedVersions, isScoringAll, scoreVersion, toast]);

  /**
   * Given the raw platform/placement values from a MediaVersion, return the
   * presetId string used by the selection checkboxes (display-name format).
   */
  function versionToPresetId(v: { platform: string; placement: string }): string {
    const displayPlatform = PLATFORM_DISPLAY[v.platform] ?? v.platform;
    const displayPlacement = v.placement
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${displayPlatform}-${displayPlacement}`;
  }

  /**
   * Generate platform versions by sending the image from localStorage (blob URL)
   * to Railway's ImageMagick pipeline. No need to re-open a file picker.
   */
  const handleProcessImage = useCallback(async () => {
    if (!asset || isProcessing) return;

    const blobUrl = asset.previewUrl;
    if (!blobUrl) {
      toast({
        title: "Image not available",
        description: "The original file is no longer cached. Please re-add it from the Media Library.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Reading image…");
    try {
      // Fetch the blob URL to get raw bytes (works as long as it's still in memory).
      let response: Response;
      try {
        response = await fetch(blobUrl);
        if (!response.ok) throw new Error("blob fetch failed");
      } catch {
        toast({
          title: "Image expired from memory",
          description: "Please re-add the photo from the Media Library — the browser cleared its temporary cache.",
          variant: "destructive",
        });
        return;
      }

      const blob = await response.blob();
      const mimeType = getMimeType(asset.originalFileName, asset.originalFileType);
      const file = new File([blob], asset.originalFileName, { type: mimeType });

      setProcessingStep("Generating platform versions…");
      const result = await uploadFile(asset.id, file);

      if (!result) {
        toast({
          title: "Processing failed",
          description: "The server couldn't process this image. It may have already been processed — try refreshing the page.",
          variant: "destructive",
        });
        return;
      }

      // Convert the upload result into ApiMediaVersion shape.
      const newVersions: ApiMediaVersion[] = result.versions.map((v) => ({
        id: v.id,
        platform: v.platform,
        placement: v.placement,
        width: v.width,
        height: v.height,
        aspectRatio: "",
        format: "jpeg",
        mimeType: "image/jpeg",
        publicUrl: v.url,
        storageKey: null,
        processingStatus: "READY",
        cropMode: "fill",
        focalPointJson: null,
        qualityScore: v.qualityScore,
        qualityScoreLabel: v.qualityScoreLabel,
        qualityScoreReason: null,
        validationStatus: "READY",
      }));

      setAsset((prev) => prev ? { ...prev, allVersions: newVersions, processingStatus: "READY" } : prev);

      // If the user had a selection active, filter down to only those versions
      // so we don't override their choice and show all 9.
      const filtered =
        selectedPresets.length > 0
          ? newVersions.filter((v) => selectedPresets.includes(versionToPresetId(v)))
          : newVersions;
      setDisplayedVersions(filtered.length > 0 ? filtered : newVersions);

      toast({
        title: `${newVersions.length} version${newVersions.length !== 1 ? "s" : ""} generated`,
        description:
          filtered.length < newVersions.length
            ? `Showing ${filtered.length} selected. Click Show All to see every size.`
            : "All platform sizes are ready — click Edit Crop to adjust any of them.",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [asset, isProcessing, selectedPresets, toast]);

  if (!assetId || !asset) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">No Asset Selected</h2>
          <p className="text-muted-foreground">
            Select an asset from the media library to optimize it for various social platforms.
          </p>
          <Button asChild data-testid="btn-browse-library">
            <Link href="/media-library">Browse Media Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const platforms = Array.from(new Set(specs.map((p) => p.platform)));

  function findVersion(preset: DisplaySpec): ApiMediaVersion | undefined {
    return asset!.allVersions.find(
      (v) => v.width === preset.width && v.height === preset.height,
    );
  }

  const handleGenerate = async () => {
    if (selectedPresets.length === 0) return;
    setIsGenerating(true);
    try {
      const matched: ApiMediaVersion[] = [];
      const missing: string[] = [];

      for (const presetId of selectedPresets) {
        const [platform, ...rest] = presetId.split("-");
        const placementLabel = rest.join("-");
        const preset = specs.find(
          (p) => p.platform === platform && p.placement === placementLabel,
        );
        if (!preset) continue;
        const v = findVersion(preset);
        if (v) matched.push(v);
        else missing.push(`${platform} ${placementLabel}`);
      }

      if (asset!.allVersions.length === 0) {
        // Truly no server versions exist yet — generate them now.
        // handleProcessImage will filter by selectedPresets after generation.
        void handleProcessImage();
      } else {
        // Versions exist — show only the matched subset. Never fall back to
        // showing all versions when the user has made a selection.
        setDisplayedVersions(matched);
        if (missing.length > 0) {
          toast({
            title: `${matched.length} version${matched.length !== 1 ? "s" : ""} shown`,
            description: `No version found for: ${missing.join(", ")}.`,
          });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-[28%] min-w-[280px] border-r flex flex-col overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden border">
            {asset.previewUrl ? (
              asset.originalFileType === "video" ? (
                <video src={asset.previewUrl} className="w-full h-full object-contain" muted playsInline />
              ) : (
                <img src={asset.previewUrl} alt={asset.originalFileName} className="w-full h-full object-contain" />
              )
            ) : asset.originalFileType === "video" ? (
              <Film className="w-12 h-12 text-muted-foreground opacity-50" />
            ) : (
              <ImageIcon className="w-12 h-12 text-muted-foreground opacity-50" />
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1.5">
            <h2 className="font-bold text-base truncate" title={asset.originalFileName}>
              {asset.originalFileName}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                {asset.originalFileType}
              </span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded border">
                {asset.originalWidth} × {asset.originalHeight}
              </span>
              {asset.allVersions.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded border border-green-200 dark:border-green-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {asset.allVersions.length} sizes
                </span>
              )}
            </div>
          </div>

          <hr />

          {/* Preset selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filter by platform</h3>
              {selectedPresets.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setSelectedPresets([]); setDisplayedVersions(asset.allVersions); }}
                >
                  Clear
                </button>
              )}
            </div>

            {platforms.map((platform) => {
              const platformPresets = specs.filter((p) => p.platform === platform);
              if (platformPresets.length === 0) return null;
              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={platform} showText={true} />
                  </div>
                  <div className="pl-6 space-y-2">
                    {platformPresets.map((preset) => {
                      const presetId = `${preset.platform}-${preset.placement}`;
                      const hasVersion = !!findVersion(preset);
                      return (
                        <div key={presetId} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={presetId}
                            checked={selectedPresets.includes(presetId)}
                            onCheckedChange={(c) => {
                              if (c) setSelectedPresets([...selectedPresets, presetId]);
                              else setSelectedPresets(selectedPresets.filter((id) => id !== presetId));
                            }}
                          />
                          <label htmlFor={presetId} className="cursor-pointer flex-1 flex items-center gap-1.5">
                            {preset.placement}
                            <span className="text-muted-foreground text-xs">({preset.width}×{preset.height})</span>
                          </label>
                          {hasVersion && (
                            <span title="Version ready">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <Button
              className="w-full mt-2"
              disabled={isGenerating || selectedPresets.length === 0}
              onClick={handleGenerate}
              data-testid="btn-generate-versions"
            >
              {isGenerating ? "Loading…" : `Show ${selectedPresets.length || ""} Version${selectedPresets.length !== 1 ? "s" : ""}`}
            </Button>

            {asset.allVersions.length > 0 && selectedPresets.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSelectedPresets([]); setDisplayedVersions(asset.allVersions); }}
              >
                Show All {asset.allVersions.length} Versions
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
        {editingVersion ? (
          <CropEditor
            asset={asset}
            version={editingVersion}
            onClose={() => setEditingVersion(null)}
            onSaved={handleFocalPointSaved}
          />
        ) : (
          <>
            <div className="p-5 border-b bg-background flex items-center justify-between gap-3 flex-shrink-0">
              <h2 className="text-xl font-bold">
                Versions
                <span className="text-muted-foreground font-normal text-base ml-2">
                  ({displayedVersions.length})
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <p className="hidden lg:block text-sm text-muted-foreground">
                  Click <strong>Edit Crop</strong> to adjust the focal point
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isScoringAll || displayedVersions.every((v) => !v.publicUrl)}
                  onClick={handleCheckAll}
                  data-testid="btn-ai-check-all"
                >
                  {isScoringAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isScoringAll ? "Checking…" : "AI check all"}
                </Button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {displayedVersions.map((version) => {
                  const platformDisplay =
                    version.platform.charAt(0) + version.platform.slice(1).toLowerCase();
                  const fp = version.focalPointJson as { x?: number; y?: number } | null;
                  const hasFocalPoint = fp?.x != null && fp?.y != null;

                  return (
                    <div
                      key={version.id}
                      className="border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col"
                      data-testid={`version-card-${version.id}`}
                    >
                      {/* Card header */}
                      <div className="p-3 border-b flex items-center gap-2">
                        <PlatformBadge platform={platformDisplay} showText={false} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold capitalize text-sm truncate">
                            {version.placement.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {version.width} × {version.height} · {version.aspectRatio}
                          </div>
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative bg-muted flex items-center justify-center overflow-hidden" style={{ aspectRatio: `${version.width}/${version.height}` }}>
                        {version.publicUrl ? (
                          <img
                            src={version.publicUrl}
                            alt={`${platformDisplay} ${version.placement}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Crop className="w-8 h-8 text-muted-foreground opacity-30" />
                        )}
                        {hasFocalPoint && (
                          <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {Math.round((fp!.x ?? 0.5) * 100)}% · {Math.round((fp!.y ?? 0.5) * 100)}%
                          </div>
                        )}
                      </div>

                      {/* Quality */}
                      <div className="px-3 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${qualityBadgeClasses(version.qualityScoreLabel)}`}
                          >
                            {version.qualityScoreLabel ?? "Not scored"}
                          </span>
                          {version.qualityScore != null && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {Math.round(version.qualityScore * 100)}%
                            </span>
                          )}
                        </div>
                        {version.qualityScoreReason && (
                          <p
                            className="text-[11px] text-muted-foreground mt-1 line-clamp-2"
                            title={version.qualityScoreReason}
                          >
                            {version.qualityScoreReason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="p-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          // Block crop edits while this version is being scored so a
                          // late-returning AI result can't overwrite the score that the
                          // re-crop is about to invalidate.
                          disabled={scoringIds.has(version.id) || isScoringAll}
                          onClick={() => setEditingVersion(version)}
                          data-testid={`btn-edit-crop-${version.id}`}
                        >
                          <Crop className="w-3.5 h-3.5" />
                          Edit Crop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={!version.publicUrl || scoringIds.has(version.id)}
                          onClick={() => handleAiCheck(version)}
                          data-testid={`btn-ai-check-${version.id}`}
                        >
                          {scoringIds.has(version.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          AI
                        </Button>
                        {version.publicUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={version.publicUrl} download target="_blank" rel="noopener noreferrer">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {displayedVersions.length === 0 && (
                  <div className="col-span-full p-10 text-center border-2 border-dashed rounded-lg space-y-4">
                    {asset.allVersions.length === 0 ? (
                      // No server versions exist — offer to generate them inline.
                      isProcessing ? (
                        <div className="space-y-3">
                          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                          <p className="font-medium text-foreground">{processingStep}</p>
                          <p className="text-sm text-muted-foreground">
                            ImageMagick is resizing your image for every platform. This takes about 10–20 seconds.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                            <Wand2 className="w-7 h-7 text-primary" />
                          </div>
                          <p className="font-semibold text-foreground text-base">Ready to generate platform versions</p>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Your image will be automatically cropped and resized for Facebook, Instagram, and LinkedIn.
                          </p>
                          <Button
                            onClick={handleProcessImage}
                            className="gap-2"
                            data-testid="btn-generate-versions"
                          >
                            <Wand2 className="w-4 h-4" />
                            Generate All Platform Versions
                          </Button>
                          {!asset.previewUrl && (
                            <p className="text-xs text-muted-foreground pt-1">
                              Image not in memory —{" "}
                              <Link href="/media-library" className="underline">re-add it from the Media Library</Link>
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      // Versions exist but are filtered — just nudge them.
                      <div className="space-y-2 text-muted-foreground">
                        <Crop className="w-8 h-8 mx-auto opacity-30" />
                        <p className="font-medium">Select platforms on the left and click Show Versions</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
