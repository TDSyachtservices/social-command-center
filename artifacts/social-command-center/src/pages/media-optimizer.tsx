import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { getMediaAsset } from "@/lib/api";
import type { ApiMediaVersion } from "@/lib/api";
import { ALL_PRESETS } from "@/lib/mediaPresets";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Image as ImageIcon, Film, Crop, AlertTriangle, XCircle, UploadCloud, CheckCircle2, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function MediaOptimizer() {
  const { assetId } = useParams();
  const { toast } = useToast();
  const [asset, setAsset] = useState<OptimizerAsset | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [displayedVersions, setDisplayedVersions] = useState<ApiMediaVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    setAsset(null);
    setDisplayedVersions([]);
    setSelectedPresets([]);

    getMediaAsset(assetId).then((api) => {
      if (!api) return;

      const previewUrl =
        api.originalPublicUrl ?? getLocalPreviewUrl(assetId);

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

      // Show all existing server-generated versions immediately.
      setDisplayedVersions(allVersions);
    });
  }, [assetId]);

  if (!assetId || !asset) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">No Asset Selected</h2>
          <p className="text-muted-foreground">Select an asset from the media library to optimize it for various social platforms.</p>
          <Button asChild data-testid="btn-browse-library">
            <Link href="/media-library">Browse Media Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const platforms = Array.from(new Set(ALL_PRESETS.map(p => p.platform)));

  // Match a preset to an existing server version by width + height.
  function findVersion(preset: typeof ALL_PRESETS[0]): ApiMediaVersion | undefined {
    return asset!.allVersions.find(
      (v) => v.width === preset.width && v.height === preset.height,
    );
  }

  const handleGenerate = async () => {
    if (selectedPresets.length === 0) return;
    setIsGenerating(true);

    try {
      // Resolve server versions for the selected presets.
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
        if (v) {
          matched.push(v);
        } else {
          missing.push(`${platform} ${placementLabel}`);
        }
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
          description: `No server version found for: ${missing.join(", ")}. Re-upload to generate all sizes.`,
        });
      } else {
        toast({
          title: `${matched.length} version${matched.length !== 1 ? "s" : ""} ready`,
          description: "Showing selected platform versions.",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const qualityBadge = (v: ApiMediaVersion) => {
    const label = v.qualityScoreLabel ?? "Unknown";
    const color =
      label === "Poor" ? "bg-red-500"
      : label === "Needs Review" ? "bg-amber-500"
      : label === "Excellent" ? "bg-emerald-500"
      : "bg-green-500";
    return { label, color };
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-[30%] min-w-[300px] border-r flex flex-col overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden border">
            {asset.previewUrl ? (
              asset.originalFileType === "video" ? (
                <video
                  src={asset.previewUrl}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={asset.previewUrl}
                  alt={asset.originalFileName}
                  className="w-full h-full object-contain"
                />
              )
            ) : asset.originalFileType === "video" ? (
              <Film className="w-12 h-12 text-muted-foreground opacity-50" />
            ) : (
              <ImageIcon className="w-12 h-12 text-muted-foreground opacity-50" />
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <h2 className="font-bold text-lg truncate" title={asset.originalFileName}>
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
                  {asset.allVersions.length} versions ready
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-y-1 mt-2">
              <div>Size: {(asset.originalSizeBytes / 1024 / 1024).toFixed(1)} MB</div>
              {asset.originalDuration && <div>Duration: {asset.originalDuration}s</div>}
            </div>
          </div>

          <hr />

          {/* Preset selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Output Presets</h3>
              {selectedPresets.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedPresets([])}
                >
                  Clear
                </button>
              )}
            </div>

            {platforms.map(platform => {
              const platformPresets = ALL_PRESETS.filter(
                p => p.platform === platform &&
                     (p.mediaType === "both" || p.mediaType === asset.originalFileType),
              );
              if (platformPresets.length === 0) return null;

              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={platform} showText={true} />
                  </div>
                  <div className="pl-6 space-y-2">
                    {platformPresets.map(preset => {
                      const presetId = `${preset.platform}-${preset.placement}`;
                      const hasVersion = !!findVersion(preset);
                      return (
                        <div key={presetId} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={presetId}
                            checked={selectedPresets.includes(presetId)}
                            onCheckedChange={(c) => {
                              if (c) setSelectedPresets([...selectedPresets, presetId]);
                              else setSelectedPresets(selectedPresets.filter(id => id !== presetId));
                            }}
                          />
                          <label htmlFor={presetId} className="cursor-pointer flex-1 flex items-center gap-1.5">
                            {preset.placement}
                            <span className="text-muted-foreground text-xs">({preset.width}×{preset.height})</span>
                          </label>
                          {hasVersion && (
                            <span title="Version ready on server">
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
              className="w-full mt-4"
              disabled={isGenerating || selectedPresets.length === 0}
              onClick={handleGenerate}
              data-testid="btn-generate-versions"
            >
              {isGenerating ? "Loading…" : `Show ${selectedPresets.length} Version${selectedPresets.length !== 1 ? "s" : ""}`}
            </Button>

            {asset.allVersions.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDisplayedVersions(asset.allVersions)}
              >
                Show All {asset.allVersions.length} Versions
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        <div className="p-6 border-b bg-background flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Generated Versions{" "}
            <span className="text-muted-foreground font-normal text-base ml-2">
              ({displayedVersions.length})
            </span>
          </h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {displayedVersions.map(version => {
              const { label: qLabel, color: qColor } = qualityBadge(version);
              const isCropping = activeCropId === version.id;
              // Normalise platform enum (FACEBOOK → Facebook) for PlatformBadge
              const platformDisplay =
                version.platform.charAt(0) + version.platform.slice(1).toLowerCase();

              return (
                <div
                  key={version.id}
                  className="border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col"
                  data-testid={`version-card-${version.id}`}
                >
                  <div className="p-4 border-b flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PlatformBadge platform={platformDisplay} showText={false} />
                        <span className="font-semibold capitalize">
                          {version.placement.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {version.width} × {version.height} • {version.aspectRatio} • {version.format.toUpperCase()}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full text-white font-medium ${qColor}`}>
                      {qLabel}
                    </div>
                  </div>

                  <div className="p-4 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-32 h-32 bg-muted rounded flex-shrink-0 flex items-center justify-center relative border overflow-hidden">
                      {version.publicUrl ? (
                        <img
                          src={version.publicUrl}
                          alt={`${platformDisplay} ${version.placement}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Crop className="w-8 h-8 text-muted-foreground opacity-30" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="text-xs inline-block px-2 py-1 bg-muted rounded border">
                          Crop: <span className="font-medium">{version.cropMode.replace(/_/g, " ")}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status: <span className="capitalize font-medium text-foreground">{version.processingStatus.toLowerCase()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveCropId(isCropping ? null : version.id)}
                          data-testid={`btn-edit-crop-${version.id}`}
                        >
                          {isCropping ? "Cancel" : "Edit Crop"}
                        </Button>
                        {version.publicUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={version.publicUrl} download target="_blank" rel="noopener noreferrer">
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCropping && (
                    <div className="p-4 border-t bg-muted/30 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Crop Mode</label>
                          <Select defaultValue={version.cropMode}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fit">Fit (Letterbox)</SelectItem>
                              <SelectItem value="fill">Fill (Crop to fit)</SelectItem>
                              <SelectItem value="smart_crop">Smart Crop</SelectItem>
                              <SelectItem value="manual_crop">Manual Crop</SelectItem>
                              <SelectItem value="blurred_background_fill">Blurred Background</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Focal Point X</label>
                            <Slider defaultValue={[50]} max={100} step={1} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Focal Point Y</label>
                            <Slider defaultValue={[50]} max={100} step={1} />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setActiveCropId(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => setActiveCropId(null)}>Apply Crop</Button>
                      </div>
                    </div>
                  )}
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
                    : "Select presets on the left and click Show Versions."}
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
      </div>
    </div>
  );
}
