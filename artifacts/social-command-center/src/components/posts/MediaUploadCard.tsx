import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X, ChevronDown, ChevronUp, Library, Film } from "lucide-react";
import { uploadMediaIntent } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaUploadCardProps {
  onMediaSelect: (url: string, type: "image" | "video") => void;
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

export function MediaUploadCard({ onMediaSelect }: MediaUploadCardProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");
  const [showVersions, setShowVersions] = useState(true);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);

  const mockPlatforms = ["Facebook", "Instagram", "LinkedIn", "TikTok", "Website"];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { width, height } = await measureDimensions(file);
      const result = await uploadMediaIntent({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalWidth: width || undefined,
        originalHeight: height || undefined,
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
          originalWidth: width,
          originalHeight: height,
          previewUrl: blobUrl,
        });
        toast({ title: "Media saved to library", description: `${file.name} is now in your Media Library.` });
      } else {
        toast({ title: "Media attached", description: "Could not reach the API — file attached to this post only.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenLibrary = () => {
    setLibraryAssets(loadLibraryAssets());
    setShowLibraryPicker(true);
  };

  const handleLibrarySelect = (asset: LibraryAsset) => {
    if (!asset.previewUrl) {
      toast({ title: "No preview available", description: "This asset doesn't have a cached preview. Try re-uploading it.", variant: "destructive" });
      return;
    }
    setPreview(asset.previewUrl);
    setPreviewType(asset.originalFileType);
    onMediaSelect(asset.previewUrl, asset.originalFileType);
    setShowLibraryPicker(false);
    toast({ title: "Media selected", description: `${asset.originalFileName} attached to this post.` });
  };

  const handleRemove = () => {
    setPreview(null);
    onMediaSelect("", "image");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Media Content</label>

      {!preview ? (
        <div className="space-y-2">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept="image/*,video/*"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8" />
                  <div className="text-sm font-medium">Drag & drop or click to upload</div>
                  <div className="text-xs">Images (JPG, PNG) or Videos (MP4)</div>
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleOpenLibrary}
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
              <video src={preview} className="w-full h-full object-cover relative z-10" muted playsInline />
            ) : (
              <img src={preview} alt="Preview" className="w-full h-full object-cover relative z-10" />
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
              <span>Platform Versions</span>
              {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showVersions && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {mockPlatforms.map((p, i) => {
                    const isReady = i % 3 !== 2;
                    return (
                      <div key={p} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50 border border-transparent hover:border-border">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={p} showText={true} />
                          <span className="text-muted-foreground hidden sm:inline">1080×1080</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isReady ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">Ready</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Needs Review</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full text-xs" asChild>
                    <Link href="/media-library">View in Media Library</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showLibraryPicker} onOpenChange={setShowLibraryPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose from Media Library</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
            {libraryAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Library className="h-10 w-10 opacity-40" />
                <p className="text-sm">Your library is empty.</p>
                <Button variant="outline" size="sm" asChild onClick={() => setShowLibraryPicker(false)}>
                  <Link href="/media-library">Go to Media Library</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {libraryAssets.map((asset) => (
                  <button
                    key={asset.id}
                    className="group relative rounded-lg overflow-hidden border bg-muted aspect-square hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all text-left"
                    onClick={() => handleLibrarySelect(asset)}
                  >
                    {asset.previewUrl ? (
                      asset.originalFileType === "video" ? (
                        <video src={asset.previewUrl} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={asset.previewUrl} alt={asset.originalFileName} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {asset.originalFileType === "video"
                          ? <Film className="h-8 w-8 text-muted-foreground opacity-50" />
                          : <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                        }
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white text-xs truncate">{asset.originalFileName}</p>
                      <p className="text-white/60 text-xs">
                        {asset.originalWidth && asset.originalHeight ? `${asset.originalWidth}×${asset.originalHeight}` : asset.originalFileType}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
