import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { getMediaAsset, patchFocalPoint } from "@/lib/api";
import type { ApiMediaVersion } from "@/lib/api";
import { ALL_PRESETS } from "@/lib/mediaPresets";
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
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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

// ─── Crop Editor ──────────────────────────────────────────────────────────────
interface CropEditorProps {
  asset: OptimizerAsset;
  version: ApiMediaVersion;
  onClose: () => void;
  onSaved: (versionId: string, x: number, y: number) => void;
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const ok = await patchFocalPoint(asset.id, version.id, focalX / 100, focalY / 100);
      if (!ok) throw new Error("Request failed");
      toast({ title: "Crop saved", description: "Focal point updated on the server." });
      onSaved(version.id, focalX / 100, focalY / 100);
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
                className="overflow-hidden shadow-lg border border-border"
                style={{
                  // Scale preview to fit the available space while maintaining exact ratio.
                  aspectRatio: `${version.width} / ${version.height}`,
                  maxWidth: "min(100%, 440px)",
                  maxHeight: "calc(100vh - 260px)",
                  width: "100%",
                }}
              >
                <img
                  src={sourceUrl}
                  alt="Cropped preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `${focalX}% ${focalY}%`,
                    display: "block",
                  }}
                />
              </div>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MediaOptimizer() {
  const { assetId } = useParams();
  const { toast } = useToast();
  const [asset, setAsset] = useState<OptimizerAsset | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [displayedVersions, setDisplayedVersions] = useState<ApiMediaVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ApiMediaVersion | null>(null);

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

  const handleFocalPointSaved = useCallback(
    (versionId: string, x: number, y: number) => {
      const merge = (v: ApiMediaVersion): ApiMediaVersion =>
        v.id === versionId ? { ...v, focalPointJson: { x, y } } : v;
      setDisplayedVersions((prev) => prev.map(merge));
      setAsset((prev) =>
        prev ? { ...prev, allVersions: prev.allVersions.map(merge) } : prev,
      );
    },
    [],
  );

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

  const platforms = Array.from(new Set(ALL_PRESETS.map((p) => p.platform)));

  function findVersion(preset: (typeof ALL_PRESETS)[0]): ApiMediaVersion | undefined {
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
        const preset = ALL_PRESETS.find(
          (p) => p.platform === platform && p.placement === placementLabel,
        );
        if (!preset) continue;
        const v = findVersion(preset);
        if (v) matched.push(v);
        else missing.push(`${platform} ${placementLabel}`);
      }

      setDisplayedVersions(matched.length > 0 ? matched : asset!.allVersions);

      if (missing.length > 0 && matched.length === 0) {
        toast({
          title: "Versions not yet generated",
          description:
            "Upload this asset from the Media Library first so the server can generate resized versions.",
          variant: "destructive",
        });
      } else if (missing.length > 0) {
        toast({
          title: `${matched.length} version${matched.length !== 1 ? "s" : ""} ready`,
          description: `No version found for: ${missing.join(", ")}.`,
        });
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
              const platformPresets = ALL_PRESETS.filter(
                (p) =>
                  p.platform === platform &&
                  (p.mediaType === "both" || p.mediaType === asset.originalFileType),
              );
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
            <div className="p-5 border-b bg-background flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">
                Versions
                <span className="text-muted-foreground font-normal text-base ml-2">
                  ({displayedVersions.length})
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">Click <strong>Edit Crop</strong> on any version to adjust the focal point</p>
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
                      <div className="relative bg-muted flex items-center justify-center overflow-hidden" style={{ aspectRatio: `${version.width}/${version.height}`, maxHeight: 180 }}>
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

                      {/* Actions */}
                      <div className="p-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => setEditingVersion(version)}
                          data-testid={`btn-edit-crop-${version.id}`}
                        >
                          <Crop className="w-3.5 h-3.5" />
                          Edit Crop
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
                  <div className="col-span-full p-10 text-center text-muted-foreground border-2 border-dashed rounded-lg space-y-3">
                    <Crop className="w-10 h-10 mx-auto opacity-30" />
                    <p className="font-medium">No versions yet</p>
                    <p className="text-sm">
                      {asset.allVersions.length === 0
                        ? "Upload this asset from the Media Library to generate platform-specific versions."
                        : "Select platforms on the left and click Show Versions."}
                    </p>
                    {asset.allVersions.length === 0 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/media-library">Go to Media Library</Link>
                      </Button>
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
