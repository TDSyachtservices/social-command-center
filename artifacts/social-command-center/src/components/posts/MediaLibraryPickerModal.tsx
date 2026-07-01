import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Library, Film, Image as ImageIcon, CheckCircle2, ChevronLeft, ExternalLink, Play } from "lucide-react";
import { Link } from "wouter";
import { listMedia, getMediaAsset, type ApiMediaAsset, type ApiMediaVersion } from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

// ─── Static fallback specs (shown when no optimized versions exist) ────────────
const FALLBACK_SPECS = [
  { platform: "Facebook",  label: "Feed Post",   platformKey: "FACEBOOK",  w: 1200, h: 630  },
  { platform: "Instagram", label: "Square Post", platformKey: "INSTAGRAM", w: 1080, h: 1080 },
  { platform: "Instagram", label: "Story",       platformKey: "INSTAGRAM", w: 1080, h: 1920 },
  { platform: "LinkedIn",  label: "Post",        platformKey: "LINKEDIN",  w: 1200, h: 627  },
];

const PLATFORM_DISPLAY: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

const PLATFORM_ORDER = ["FACEBOOK", "INSTAGRAM", "LINKEDIN"];

interface PickerAsset {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalWidth: number;
  originalHeight: number;
  originalPublicUrl: string | null;
  previewUrl?: string;
}

interface MediaLibraryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, type: "image" | "video") => void;
}

const MEDIA_LIBRARY_KEY = "scc:media-library:v1";

function loadLocalAssets(): PickerAsset[] {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PickerAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ─── Single version preview card ─────────────────────────────────────────────
function VersionCard({
  label,
  w,
  h,
  imageUrl,
  isVideo,
  isOptimized,
  onUse,
}: {
  label: string;
  w: number;
  h: number;
  imageUrl: string | null;
  isVideo: boolean;
  isOptimized: boolean;
  onUse?: () => void;
}) {
  const maxH = 160;
  const maxW = Math.round(maxH * w / h);

  return (
    <div className="border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col">
      <div className="px-3 py-1.5 border-b flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-xs">{label}</span>
          <span className="text-[11px] text-muted-foreground ml-1.5">{w}×{h}</span>
        </div>
        {isOptimized && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-label="Optimized" />
        )}
      </div>

      <div className="flex justify-center items-center bg-muted/60 py-2">
        <div
          className="relative overflow-hidden"
          style={{ width: maxW, height: maxH }}
        >
          {imageUrl ? (
            isVideo ? (
              <video src={imageUrl} className="w-full h-full object-cover" controls muted playsInline />
            ) : (
              <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="w-6 h-6 opacity-30" />
            </div>
          )}
          {!isOptimized && imageUrl && (
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">
              Simulated
            </div>
          )}
        </div>
      </div>

      <div className="p-2">
        {isOptimized && onUse ? (
          <Button size="sm" className="w-full h-7 text-xs" onClick={onUse}>
            Use this version
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-0.5">
            Not optimized — use the Media Optimizer to generate this crop
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Platform section with all its versions ───────────────────────────────────
function PlatformSection({
  platformKey,
  versions,
  fallbackImageUrl,
  assetId,
  isVideo,
  onUse,
  onOpenChange,
}: {
  platformKey: string;
  versions: ApiMediaVersion[];
  fallbackImageUrl: string | null;
  assetId: string;
  isVideo: boolean;
  onUse: (url: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const displayName = PLATFORM_DISPLAY[platformKey] ?? platformKey;
  const fallbacks = FALLBACK_SPECS.filter((s) => s.platformKey === platformKey);
  const readyVersions = versions.filter((v) => v.publicUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <PlatformBadge platform={displayName} showText={true} />
        {readyVersions.length > 0 && (
          <span className="text-[11px] text-green-600 dark:text-green-400">
            {readyVersions.length} optimized
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {readyVersions.length > 0 ? (
          readyVersions.map((v) => {
            const placement = v.placement
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ");
            return (
              <VersionCard
                key={v.id}
                label={placement}
                w={v.width}
                h={v.height}
                imageUrl={v.publicUrl}
                isVideo={isVideo}
                isOptimized={true}
                onUse={() => onUse(v.publicUrl!)}
              />
            );
          })
        ) : (
          fallbacks.map((spec) => (
            <VersionCard
              key={`${spec.platformKey}-${spec.label}`}
              label={spec.label}
              w={spec.w}
              h={spec.h}
              imageUrl={fallbackImageUrl}
              isVideo={isVideo}
              isOptimized={false}
            />
          ))
        )}
      </div>

      {readyVersions.length === 0 && (
        <Link
          href={`/media-optimizer/${assetId}`}
          onClick={() => onOpenChange(false)}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Generate {displayName} crops in Media Optimizer
        </Link>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function MediaLibraryPickerModal({ open, onOpenChange, onSelect }: MediaLibraryPickerModalProps) {
  const [assets, setAssets] = useState<PickerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<PickerAsset | null>(null);
  const [versions, setVersions] = useState<ApiMediaVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setVersions([]);
    setIsLoading(true);
    listMedia().then((apiAssets) => {
      if (apiAssets && apiAssets.length > 0) {
        const fromApi: PickerAsset[] = apiAssets.map((a: ApiMediaAsset) => ({
          id: a.id,
          originalFileName: a.originalFileName,
          originalFileType: (a.originalFileType === "video" ? "video" : "image") as "image" | "video",
          originalWidth: a.originalWidth ?? 0,
          originalHeight: a.originalHeight ?? 0,
          originalPublicUrl: a.originalPublicUrl,
        }));
        const apiIds = new Set(fromApi.map((a) => a.id));
        const localOnly = loadLocalAssets().filter(
          (a) => !apiIds.has(a.id) && typeof a.previewUrl === "string" && a.previewUrl.startsWith("blob:")
        );
        setAssets([...localOnly, ...fromApi]);
      } else {
        setAssets(loadLocalAssets());
      }
    }).catch(() => setAssets(loadLocalAssets())).finally(() => setIsLoading(false));
  }, [open]);

  const handleAssetClick = async (asset: PickerAsset) => {
    setSelected(asset);
    setVersions([]);
    setIsLoadingVersions(true);
    try {
      const full = await getMediaAsset(asset.id);
      setVersions((full?.versions ?? []).filter((v) => v.processingStatus === "READY"));
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleUseVersion = (url: string) => {
    if (!selected) return;
    onSelect(url, selected.originalFileType);
    onOpenChange(false);
  };

  const handleUseOriginal = () => {
    if (!selected) return;
    const url = selected.originalPublicUrl ?? selected.previewUrl ?? null;
    if (!url) return;
    onSelect(url, selected.originalFileType);
    onOpenChange(false);
  };

  const bestUrl = selected ? (selected.originalPublicUrl ?? selected.previewUrl ?? null) : null;

  // Group versions by platform, in display order
  const versionsByPlatform: Record<string, ApiMediaVersion[]> = {};
  for (const v of versions) {
    if (!versionsByPlatform[v.platform]) versionsByPlatform[v.platform] = [];
    versionsByPlatform[v.platform].push(v);
  }
  const activePlatforms = PLATFORM_ORDER.filter(
    (pk) => versionsByPlatform[pk]?.length || FALLBACK_SPECS.some((s) => s.platformKey === pk)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden" style={{ height: "88vh" }}>
        <div className="flex h-full overflow-hidden">
          {/* LEFT: asset list */}
          <div className="w-52 border-r flex flex-col flex-shrink-0">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle className="text-sm font-semibold">Media Library</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3 text-center px-2">
                  <Library className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Your library is empty.</p>
                  <Button variant="outline" size="sm" asChild onClick={() => onOpenChange(false)}>
                    <Link href="/media-library">Go to Library</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {assets.map((asset) => {
                    const thumb = asset.originalPublicUrl ?? asset.previewUrl;
                    const isSelected = selected?.id === asset.id;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => handleAssetClick(asset)}
                        className={`relative rounded overflow-hidden border aspect-square bg-muted hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : ""}`}
                      >
                        {thumb ? (
                          asset.originalFileType === "video" ? (
                            <video src={thumb} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={thumb} alt={asset.originalFileName} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {asset.originalFileType === "video"
                              ? <Film className="h-5 w-5 text-muted-foreground opacity-50" />
                              : <ImageIcon className="h-5 w-5 text-muted-foreground opacity-50" />
                            }
                          </div>
                        )}
                        {/* Video play badge */}
                        {asset.originalFileType === "video" && (
                          <div className="absolute bottom-1 left-1 bg-black/70 rounded-full p-0.5">
                            <Play className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {/* GIF badge */}
                        {asset.originalFileName.toLowerCase().endsWith(".gif") && (
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
                            GIF
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/10 flex items-end justify-end p-1">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: version picker */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
                <ChevronLeft className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">Select an image from the library</p>
                <p className="text-xs opacity-70">Choose a platform-optimized version or use the original</p>
              </div>
            ) : (
              <>
                {/* Header bar */}
                <div className="px-5 py-3 border-b bg-background flex items-center gap-3 flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{selected.originalFileName}</p>
                    {selected.originalWidth > 0 && (
                      <p className="text-xs text-muted-foreground">{selected.originalWidth} × {selected.originalHeight} original</p>
                    )}
                  </div>
                  {isLoadingVersions && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0" />
                  )}
                  <Button variant="outline" size="sm" onClick={handleUseOriginal} disabled={!bestUrl}>
                    Use original
                  </Button>
                </div>

                {/* Platform sections */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {activePlatforms.map((platformKey) => (
                    <PlatformSection
                      key={platformKey}
                      platformKey={platformKey}
                      versions={versionsByPlatform[platformKey] ?? []}
                      fallbackImageUrl={bestUrl}
                      assetId={selected.id}
                      isVideo={selected.originalFileType === "video"}
                      onUse={handleUseVersion}
                      onOpenChange={onOpenChange}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
