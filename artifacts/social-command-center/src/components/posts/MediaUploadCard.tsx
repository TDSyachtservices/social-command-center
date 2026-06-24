import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X, ChevronDown, ChevronUp } from "lucide-react";
import { uploadMediaIntent } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MediaUploadCardProps {
  onMediaSelect: (url: string, type: "image" | "video") => void;
}

const MEDIA_LIBRARY_KEY = "scc:media-library:v1";

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

function saveToMediaLibrary(asset: {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  previewUrl: string;
}) {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY);
    const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
    const entry = {
      ...asset,
      uploadedAt: new Date().toISOString(),
      processingStatus: "uploaded",
      generatedVersions: [],
    };
    localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify([entry, ...existing]));
  } catch {
    /* ignore storage errors */
  }
}

export function MediaUploadCard({ onMediaSelect }: MediaUploadCardProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(true);

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
      setPreview(blobUrl);
      onMediaSelect(blobUrl, file.type.startsWith("video/") ? "video" : "image");

      if (result) {
        saveToMediaLibrary({
          id: result.assetId,
          originalFileName: file.name,
          originalFileType: file.type.startsWith("video/") ? "video" : "image",
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

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium leading-none">Media Content</label>

      {!preview ? (
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <>
                <UploadCloud className="h-8 w-8" />
                <div className="text-sm font-medium">Drag & drop or click to upload</div>
                <div className="text-xs">Images (JPG, PNG) or Videos (MP4)</div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative border rounded-lg overflow-hidden group bg-muted flex items-center justify-center aspect-video">
            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50 absolute" />
            <img src={preview} alt="Preview" className="w-full h-full object-cover relative z-10" />
            <button
              onClick={() => {
                setPreview(null);
                onMediaSelect("", "image");
              }}
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
    </div>
  );
}
