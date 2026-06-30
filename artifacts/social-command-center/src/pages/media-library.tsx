import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Image as ImageIcon, Film, UploadCloud } from "lucide-react";
import {
  listMedia,
  uploadMediaIntent,
  uploadFile,
  deleteMedia,
  duplicateMedia,
  type ApiMediaAsset,
} from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DisplayAsset = {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  uploadedAt: string;
  processingStatus: string;
  generatedVersions: Array<{ platform: string; processingStatus: string; qualityScore: string }>;
  previewUrl?: string;
};

const STORAGE_KEY = "scc:media-library:v1";

// Single source of truth for turning a server media asset into the card shape.
const toDisplayAsset = (a: ApiMediaAsset): DisplayAsset => ({
  id: a.id,
  originalFileName: a.originalFileName,
  originalFileType: a.originalFileType as "image" | "video",
  originalSizeBytes: a.originalSizeBytes,
  originalWidth: a.originalWidth ?? 0,
  originalHeight: a.originalHeight ?? 0,
  uploadedAt: a.createdAt,
  processingStatus: (a.processingStatus ?? "pending").toLowerCase(),
  generatedVersions: (a.versions ?? []).map((v) => ({
    platform: v.platform,
    processingStatus: v.processingStatus === "READY" ? "complete" : v.processingStatus.toLowerCase(),
    qualityScore: v.qualityScoreLabel ?? "",
  })),
  previewUrl: a.originalPublicUrl ?? undefined,
});

const loadPersisted = (): DisplayAsset[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // blob: URLs are tied to the previous page session and die on reload —
    // drop them so the card falls back to a placeholder instead of a broken image.
    return (parsed as DisplayAsset[]).map((a) =>
      typeof a.previewUrl === "string" && a.previewUrl.startsWith("blob:")
        ? { ...a, previewUrl: undefined }
        : a,
    );
  } catch {
    return null;
  }
};

const persist = (assets: DisplayAsset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch {
    /* ignore storage errors (private mode, quota) */
  }
};

function measureImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    }
  });
}

export default function MediaLibrary() {
  const [filter, setFilter] = useState("All");
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [, setLocation] = useLocation();
  const [assets, setAssets] = useState<DisplayAsset[]>(() => loadPersisted() ?? []);
  const [pendingDelete, setPendingDelete] = useState<DisplayAsset | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const persisted = loadPersisted();

    // First visit (no saved library): hydrate the whole library from the server.
    if (persisted === null) {
      listMedia().then((api) => {
        if (api === null) return;
        setAssets(api.map(toDisplayAsset));
      });
      return;
    }

    // Returning visit: keep the user's saved library (with their deletions/
    // duplicates), but any rows whose preview was a dead blob: URL got stripped
    // on load — repair those by merging the permanent URL (and versions) from
    // the server, matched by id. We never add server rows that aren't already in
    // the local list, so deletions stick.
    if (!persisted.some((a) => !a.previewUrl)) return;
    listMedia().then((api) => {
      if (api === null) return;
      const byId = new Map(api.map((a) => [a.id, a]));
      setAssets((prev) =>
        prev.map((a) => {
          if (a.previewUrl) return a;
          const server = byId.get(a.id);
          if (!server) return a;
          const hydrated = toDisplayAsset(server);
          return {
            ...a,
            previewUrl: hydrated.previewUrl,
            generatedVersions:
              a.generatedVersions.length > 0 ? a.generatedVersions : hydrated.generatedVersions,
          };
        }),
      );
    });
  }, []);

  useEffect(() => {
    persist(assets);
  }, [assets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { width, height } = await measureImageDimensions(file);
      const result = await uploadMediaIntent({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalWidth: width || undefined,
        originalHeight: height || undefined,
      });
      if (!result) {
        toast({ title: "Upload failed", description: "Could not reach the API. Check your connection.", variant: "destructive" });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const newAsset: DisplayAsset = {
        id: result.assetId,
        originalFileName: file.name,
        originalFileType: mediaType,
        originalSizeBytes: file.size,
        originalWidth: width,
        originalHeight: height,
        uploadedAt: new Date().toISOString(),
        processingStatus: "processing",
        generatedVersions: [],
        previewUrl,
      };
      setAssets((prev) => [newAsset, ...prev]);
      setShowUpload(false);
      toast({ title: "Media uploaded", description: `Processing platform versions for ${file.name}…` });

      // Upload the actual bytes for server-side ImageMagick processing.
      uploadFile(result.assetId, file).then((processed) => {
        if (processed) {
          setAssets((prev) =>
            prev.map((a) =>
              a.id === result.assetId
                ? {
                    ...a,
                    processingStatus: "ready",
                    // Swap the temporary blob: preview for the permanent server URL
                    // so the thumbnail survives a page reload.
                    previewUrl: processed.originalUrl ?? a.previewUrl,
                    generatedVersions: processed.versions.map((v) => ({
                      platform: v.platform,
                      processingStatus: "complete",
                      qualityScore: v.qualityScoreLabel ?? "",
                    })),
                  }
                : a,
            ),
          );
          toast({
            title: "Platform versions ready",
            description: `${processed.versions.length} versions generated for ${file.name}.`,
          });
        }
      }).catch(() => {
        setAssets((prev) =>
          prev.map((a) => (a.id === result.assetId ? { ...a, processingStatus: "uploaded" } : a)),
        );
      });
    } catch {
      toast({ title: "Upload error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    // Duplicate on the server so the copy has its own real asset id and on-disk
    // files — that's what makes the copy independently optimizable.
    const created = await duplicateMedia(id);
    if (!created) {
      toast({
        title: "Duplicate failed",
        description: "Could not copy this asset on the server.",
        variant: "destructive",
      });
      return;
    }
    const copy = toDisplayAsset(created);
    setAssets((prev) => {
      const index = prev.findIndex((a) => a.id === id);
      const next = [...prev];
      if (index === -1) next.unshift(copy);
      else next.splice(index + 1, 0, copy);
      return next;
    });
    toast({ title: "Asset duplicated", description: `Created "${copy.originalFileName}".` });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    // Optimistically remove from the UI; the server delete also clears disk files.
    setAssets((prev) => prev.filter((a) => a.id !== target.id));
    const ok = await deleteMedia(target.id);
    if (!ok) {
      toast({
        title: "Removed from library",
        description: "We couldn't confirm server-side deletion, but it's gone from your library.",
      });
      return;
    }
    toast({ title: "Asset deleted", description: `"${target.originalFileName}" was removed.` });
  };

  const filters = [
    "All", "Images", "Videos", "Needs Review", "Failed",
    "Ready for Facebook", "Ready for Instagram", "Ready for LinkedIn", "Ready for TikTok", "Ready for Website"
  ];

  const filteredAssets = assets.filter(asset => {
    if (filter === "All") return true;
    if (filter === "Images") return asset.originalFileType === "image";
    if (filter === "Videos") return asset.originalFileType === "video";
    if (filter === "Needs Review") return asset.generatedVersions.some(v => v.qualityScore === "Needs Review");
    if (filter === "Failed") return asset.processingStatus === "failed";
    if (filter.startsWith("Ready for ")) {
      const platform = filter.replace("Ready for ", "");
      return asset.generatedVersions.some(v => v.platform === platform && v.processingStatus === "complete");
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background p-6 space-y-6 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">Manage and optimize your media assets</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} data-testid="btn-upload-asset">
          Upload Asset
        </Button>
      </div>

      {showUpload && (
        <div className="p-8 border-2 border-dashed rounded-lg text-center relative hover:bg-muted/50 transition-colors" data-testid="upload-zone">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleUpload}
            accept="image/*,video/*"
            disabled={isUploading}
            data-testid="input-file-upload"
          />
          <div className="flex flex-col items-center space-y-2 text-muted-foreground">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <>
                <UploadCloud className="h-8 w-8" />
                <div className="font-medium">Drag & drop or click to upload</div>
                <div className="text-xs">Images or Videos</div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap border transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
            data-testid={`filter-${f.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => {
          const platforms = Array.from(new Set(asset.generatedVersions.filter(v => v.processingStatus === "complete").map(v => v.platform)));

          let worstScore = "Excellent";
          for (const v of asset.generatedVersions) {
            if (v.qualityScore === "Poor") worstScore = "Poor";
            else if (v.qualityScore === "Needs Review" && worstScore !== "Poor") worstScore = "Needs Review";
            else if (v.qualityScore === "Good" && worstScore === "Excellent") worstScore = "Good";
          }

          const scoreColor = worstScore === "Poor" ? "bg-red-500" : worstScore === "Needs Review" ? "bg-amber-500" : "bg-green-500";

          return (
            <div key={asset.id} className="border rounded-lg overflow-hidden bg-card text-card-foreground flex flex-col shadow-sm" data-testid={`card-asset-${asset.id}`}>
              <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                {asset.previewUrl ? (
                  asset.originalFileType === "video" ? (
                    <video src={asset.previewUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={asset.previewUrl} alt={asset.originalFileName} className="w-full h-full object-cover" />
                  )
                ) : asset.originalFileType === "video" ? (
                  <Film className="w-12 h-12 text-muted-foreground opacity-50" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground opacity-50" />
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {asset.originalFileType.toUpperCase()}
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div>
                  <h3 className="font-semibold text-sm truncate" title={asset.originalFileName}>
                    {asset.originalFileName}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                    <span>{new Date(asset.uploadedAt).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span>{(asset.originalSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded border font-medium">
                    {asset.originalWidth} × {asset.originalHeight}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                  {platforms.map(p => (
                    <PlatformBadge key={p} platform={p as any} showText={false} className="opacity-80" />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
                    <span className="text-muted-foreground">{asset.generatedVersions.length} versions generated</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="default" size="sm" className="w-full" asChild data-testid={`btn-optimize-${asset.id}`}>
                    <Link href={`/media-optimizer/${asset.id}`}>Optimize</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleDuplicate(asset.id)} data-testid={`btn-duplicate-${asset.id}`}>
                    Duplicate
                  </Button>
                  <Button variant="destructive" size="sm" className="px-3" onClick={() => setPendingDelete(asset)} data-testid={`btn-delete-${asset.id}`}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.originalFileName}" will be permanently removed from your media library. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
