import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X, ChevronDown, ChevronUp, Library, Film } from "lucide-react";
import { uploadMediaIntent, uploadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MediaLibraryPickerModal } from "./MediaLibraryPickerModal";

interface MediaUploadCardProps {
  onMediaSelect: (url: string, type: "image" | "video") => void;
  initialPreview?: string | null;
  initialType?: "image" | "video";
  label?: string;
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

function measureDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => { resolve({ width: video.videoWidth, height: video.videoHeight }); URL.revokeObjectURL(url); };
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

export function MediaUploadCard({ onMediaSelect, initialPreview = null, initialType = "image", label = "Media Content" }: MediaUploadCardProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [previewType, setPreviewType] = useState<"image" | "video">(initialType);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showVersions, setShowVersions] = useState(true);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const dims = await measureDimensions(file);
      setDimensions(dims);

      const result = await uploadMediaIntent({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalWidth: dims.width || undefined,
        originalHeight: dims.height || undefined,
      });

      const blobUrl = URL.createObjectURL(file);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      setPreview(blobUrl);
      setPreviewType(mediaType);
      onMediaSelect(blobUrl, mediaType);

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
        toast({ title: "Media saved to library", description: `Processing platform versions…` });

        // Fire-and-forget: upload the actual bytes and generate resized versions.
        uploadFile(result.assetId, file).then((processed) => {
          if (processed && processed.versions.length > 0) {
            toast({
              title: "Platform versions ready",
              description: `${processed.versions.length} resized versions generated for ${file.name}.`,
            });
          }
        }).catch(() => {/* server unreachable — silent; blob preview still works */});
      } else {
        toast({ title: "Media attached", description: "Could not reach the API — file attached to this post only.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLibrarySelect = (url: string, type: "image" | "video") => {
    setPreview(url);
    setPreviewType(type);
    setDimensions(null);
    onMediaSelect(url, type);
    toast({ title: "Media selected", description: "Image attached to this post." });
  };

  const handleRemove = () => {
    setPreview(null);
    setDimensions(null);
    onMediaSelect("", "image");
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
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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
