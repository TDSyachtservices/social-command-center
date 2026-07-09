import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X, ChevronDown, ChevronUp, Library, Film } from "lucide-react";
import { uploadMediaIntent, uploadFile, uploadViaPresignedUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MediaLibraryPickerModal } from "./MediaLibraryPickerModal";
import type { Platform } from "@/data/mockPosts";
import { validateMediaFile } from "@/lib/mediaRules";

interface MediaUploadCardProps {
  onMediaSelect: (url: string, type: "image" | "video") => void;
  onUploadPendingChange?: (pending: boolean) => void;
  initialPreview?: string | null;
  initialType?: "image" | "video";
  label?: string;
  /** When set, the file is validated against this platform's hard format/size/aspect-ratio rules before it can be attached. */
  platform?: Platform;
}

const MEDIA_LIBRARY_KEY = "scc:media-library:v1";

type LibraryAsset = {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  previewUrl?: string;
  uploadedAt: string;
};

type PlatformSpec = {
  platform: string;
  recWidth: number;
  recHeight: number;
  minWidth: number;
  note: string;
};

const IMAGE_SPECS: PlatformSpec[] = [
  { platform: "Facebook",  recWidth: 1200, recHeight: 630,  minWidth: 600, note: "Landscape feed post" },
  { platform: "Instagram", recWidth: 1080, recHeight: 1080, minWidth: 320, note: "Square feed post" },
  { platform: "LinkedIn",  recWidth: 1200, recHeight: 627,  minWidth: 552, note: "Landscape post" },
];

const VIDEO_SPECS: PlatformSpec[] = [
  { platform: "Facebook",  recWidth: 1280, recHeight: 720,  minWidth: 600,  note: "16:9 landscape video" },
  { platform: "Instagram", recWidth: 1080, recHeight: 1080, minWidth: 320,  note: "Square feed video" },
  { platform: "LinkedIn",  recWidth: 1920, recHeight: 1080, minWidth: 360,  note: "16:9 landscape video" },
];

type CompatStatus = "compatible" | "will-crop" | "too-small";

function checkCompat(
  imgW: number,
  imgH: number,
  spec: PlatformSpec
): CompatStatus {
  if (imgW === 0 || imgH === 0) return "compatible"; // unknown — don't flag
  if (imgW < spec.minWidth) return "too-small";
  const imgRatio = imgW / imgH;
  const specRatio = spec.recWidth / spec.recHeight;
  const diff = Math.abs(imgRatio - specRatio) / specRatio;
  return diff <= 0.15 ? "compatible" : "will-crop";
}

function measureDimensions(file: File): Promise<{ width: number; height: number; durationSec?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight, durationSec: video.duration });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    }
  });
}

function saveToMediaLibrary(asset: Omit<LibraryAsset, "uploadedAt"> & { previewUrl: string }) {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY);
    const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
    const entry = { ...asset, uploadedAt: new Date().toISOString(), processingStatus: "uploaded", generatedVersions: [] };
    localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify([entry, ...existing]));
  } catch { /* ignore */ }
}

function loadLibraryAssets(): LibraryAsset[] {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LibraryAsset[]) : [];
  } catch {
    return [];
  }
}

const compatLabel: Record<CompatStatus, { text: string; dot: string; textColor: string }> = {
  compatible:  { text: "Compatible",    dot: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
  "will-crop": { text: "Will be cropped", dot: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  "too-small": { text: "Too small",     dot: "bg-red-500",   textColor: "text-red-600 dark:text-red-400" },
};

export function MediaUploadCard({ onMediaSelect, onUploadPendingChange, initialPreview = null, initialType = "image", label = "Media Content", platform }: MediaUploadCardProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [previewType, setPreviewType] = useState<"image" | "video">(initialType);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showVersions, setShowVersions] = useState(true);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFailed(false);
    try {
      const dims = await measureDimensions(file);
      const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";

      if (platform) {
        const validation = validateMediaFile({
          platform,
          mediaType,
          file,
          width: dims.width,
          height: dims.height,
          durationSec: dims.durationSec,
        });
        if (!validation.valid) {
          setIsUploading(false);
          toast({
            title: `Doesn't meet ${platform}'s requirements`,
            description: validation.reasons.join(" "),
            variant: "destructive",
          });
          e.target.value = "";
          return;
        }
      }

      setDimensions(dims);

      const blobUrl = URL.createObjectURL(file);
      setPreview(blobUrl);
      setPreviewType(mediaType);
      // NOTE: this blob: URL is only a placeholder for the immediate preview — it
      // only exists in this browser tab and can never be fetched by a platform
      // adapter (e.g. Facebook fetching `file_url`). It gets swapped below for the
      // real, permanent server URL as soon as the upload finishes. Submitting the
      // post before that swap happens must be blocked (see onUploadPendingChange).
      // This block is held (via onUploadPendingChange(true)) from the moment the
      // blob: URL is selected until it is swapped for a real URL — including
      // every failure path — so a broken upload can never be silently saved
      // (e.g. via "Save Draft") with an unusable blob: link. Only handleRemove()
      // clears the block on failure.
      onMediaSelect(blobUrl, mediaType);
      setIsPersisting(true);
      onUploadPendingChange?.(true);

      if (mediaType === "video") {
        // Videos upload directly to R2 via a presigned URL — the bytes never
        // pass through our server. This is awaited (not fire-and-forget) so we
        // can replace the temporary blob URL with the real, durable one — and
        // block publishing until that happens (see onUploadPendingChange).
        toast({ title: "Uploading video…", description: "This may take a moment for larger files." });
        try {
          const confirmed = await uploadViaPresignedUrl(file, {
            originalWidth: dims.width || undefined,
            originalHeight: dims.height || undefined,
          });
          if (confirmed && confirmed.originalUrl) {
            setPreview(confirmed.originalUrl);
            onMediaSelect(confirmed.originalUrl, mediaType);
            saveToMediaLibrary({
              id: confirmed.assetId,
              originalFileName: file.name,
              originalFileType: mediaType,
              originalSizeBytes: file.size,
              originalWidth: dims.width,
              originalHeight: dims.height,
              previewUrl: confirmed.originalUrl,
            });
            toast({ title: "Video uploaded", description: `${file.name} saved to durable storage.` });
            setIsPersisting(false);
            onUploadPendingChange?.(false);
          } else {
            setUploadFailed(true);
            toast({
              title: "Upload failed",
              description: `${file.name} could not be saved to storage. Remove it and try again before publishing.`,
              variant: "destructive",
            });
            setIsPersisting(false);
            // Keep pending=true: this media is a dead blob: URL that can never
            // be published, so Save Draft must stay blocked too, not just
            // Publish/Schedule. Only handleRemove() clears the block.
          }
        } catch {
          setUploadFailed(true);
          toast({
            title: "Upload failed",
            description: `${file.name} could not be saved to storage. Remove it and try again before publishing.`,
            variant: "destructive",
          });
          setIsPersisting(false);
        }
        return;
      }

      const result = await uploadMediaIntent({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalWidth: dims.width || undefined,
        originalHeight: dims.height || undefined,
      });

      if (result) {
        saveToMediaLibrary({
          id: result.assetId,
          originalFileName: file.name,
          originalFileType: mediaType,
          originalSizeBytes: file.size,
          originalWidth: dims.width,
          originalHeight: dims.height,
          previewUrl: blobUrl,
        });
        toast({ title: "Media saved to library", description: `Uploading original file…` });

        // Upload the actual bytes to durable storage. Pass an empty selectedVersions
        // array so no platform crops are generated now — they can be generated later
        // from the Media Library if needed. This is awaited (not fire-and-forget) so
        // we can replace the temporary blob URL with the real, permanent one — and
        // block publishing until that happens.
        uploadFile(result.assetId, file, []).then((processed) => {
          setIsPersisting(false);
          if (processed && processed.originalUrl) {
            setPreview(processed.originalUrl);
            onMediaSelect(processed.originalUrl, mediaType);
            onUploadPendingChange?.(false);
          } else {
            setUploadFailed(true);
            toast({
              title: "Upload failed",
              description: `${file.name} could not be saved to the server. Remove it and try again before publishing.`,
              variant: "destructive",
            });
            // Keep pending=true: this media is a dead blob: URL that can
            // never be published, so Save Draft must stay blocked too, not
            // just Publish/Schedule. Only handleRemove() clears the block.
          }
        }).catch(() => {
          setIsPersisting(false);
          setUploadFailed(true);
          toast({
            title: "Upload failed",
            description: `${file.name} could not be saved to the server. Remove it and try again before publishing.`,
            variant: "destructive",
          });
        });
      } else {
        setUploadFailed(true);
        toast({ title: "Upload failed", description: "Could not reach the API — remove this file and try again before publishing.", variant: "destructive" });
      }
    } catch {
      setUploadFailed(true);
      toast({ title: "Upload error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLibrarySelect = (url: string, type: "image" | "video") => {
    setPreview(url);
    setPreviewType(type);
    setDimensions(null);
    setUploadFailed(false);
    onMediaSelect(url, type);
    onUploadPendingChange?.(false);
    toast({ title: "Media selected", description: "Image attached to this post." });
  };

  const handleRemove = () => {
    setPreview(null);
    setDimensions(null);
    setUploadFailed(false);
    setIsPersisting(false);
    onMediaSelect("", "image");
    onUploadPendingChange?.(false);
  };

  const specs = previewType === "video" ? VIDEO_SPECS : IMAGE_SPECS;

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}

      {!preview ? (
        <div className="space-y-2">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept="image/*,video/*,.gif"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8" />
                  <div className="text-sm font-medium">Drag & drop or click to upload</div>
                  <div className="text-xs">Images (JPG, PNG, GIF) or Videos (MP4, MOV)</div>
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowLibraryPicker(true)}
            disabled={isUploading}
          >
            <Library className="h-4 w-4" />
            Choose from Library
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative border rounded-lg overflow-hidden group bg-muted flex items-center justify-center aspect-video">
            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50 absolute" />
            {previewType === "video" ? (
              <video
                src={preview}
                className="w-full h-full object-cover relative z-10"
                controls
                muted
                playsInline
              />
            ) : (
              <img src={preview} alt="Preview" className="w-full h-full object-cover relative z-10" />
            )}
            {dimensions && dimensions.width > 0 && (
              <div className="absolute bottom-2 left-2 z-20 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                {dimensions.width}×{dimensions.height}
              </div>
            )}
            {isPersisting && (
              <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-black/70 text-white text-xs px-3 py-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white shrink-0" />
                Saving file to server — don't publish yet…
              </div>
            )}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {uploadFailed && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
              <span>
                This file failed to save to the server and can't be published as-is. Remove it and upload again.
              </span>
            </div>
          )}

          <div className="border rounded-md overflow-hidden bg-card">
            <button
              className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
              onClick={() => setShowVersions(!showVersions)}
            >
              <span>Platform Compatibility</span>
              {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showVersions && (
              <div className="p-3 space-y-3">
                {dimensions && dimensions.width > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Your file is <span className="font-medium text-foreground">{dimensions.width}×{dimensions.height}px</span>. Compatibility is based on aspect ratio and minimum size requirements.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {specs.map((spec) => {
                    const status = dimensions
                      ? checkCompat(dimensions.width, dimensions.height, spec)
                      : "compatible";
                    const { text, dot, textColor } = compatLabel[status];
                    return (
                      <div key={spec.platform} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50 border border-transparent hover:border-border">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformBadge platform={spec.platform} showText={true} />
                          <span className="text-muted-foreground hidden sm:inline shrink-0">
                            {spec.recWidth}×{spec.recHeight}
                          </span>
                          <span className="text-muted-foreground/60 hidden md:inline truncate">
                            — {spec.note}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className={`w-2 h-2 rounded-full ${dot}`} />
                          <span className={`font-medium ${textColor}`}>{text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  "Will be cropped" means your image will be auto-cropped to fit — use the Media Optimizer to control exactly how.
                </div>
                <div className="pt-1">
                  <Button variant="outline" className="w-full text-xs" asChild>
                    <Link href="/media-library">View in Media Library</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <MediaLibraryPickerModal
        open={showLibraryPicker}
        onOpenChange={setShowLibraryPicker}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
