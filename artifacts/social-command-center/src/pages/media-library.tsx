import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Image as ImageIcon, Film, UploadCloud } from "lucide-react";
import { listMedia } from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Button } from "@/components/ui/button";
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
import { mockAnalyzeMedia } from "@/lib/mockActions";

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
};

const STORAGE_KEY = "scc:media-library:v1";

const loadPersisted = (): DisplayAsset[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DisplayAsset[]) : null;
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

export default function MediaLibrary() {
  const [filter, setFilter] = useState("All");
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [, setLocation] = useLocation();
  const [assets, setAssets] = useState<DisplayAsset[]>(() => loadPersisted() ?? []);
  const [pendingDelete, setPendingDelete] = useState<DisplayAsset | null>(null);

  useEffect(() => {
    if (loadPersisted() !== null) return; // keep the user's saved library (with their deletions/duplicates)
    listMedia().then((api) => {
      if (api !== null) {
        setAssets(
          api.map((a) => ({
            id: a.id,
            originalFileName: a.originalFileName,
            originalFileType: a.originalFileType as "image" | "video",
            originalSizeBytes: a.originalSizeBytes,
            originalWidth: a.originalWidth ?? 0,
            originalHeight: a.originalHeight ?? 0,
            uploadedAt: a.createdAt,
            processingStatus: (a.processingStatus ?? "pending").toLowerCase(),
            generatedVersions: [],
          })),
        );
      }
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
      await mockAnalyzeMedia(file);
      setLocation("/media-optimizer");
    } finally {
      setIsUploading(false);
      setShowUpload(false);
    }
  };

  const handleDuplicate = (id: string) => {
    setAssets((prev) => {
      const index = prev.findIndex((a) => a.id === id);
      if (index === -1) return prev;
      const original = prev[index];
      const dotIndex = original.originalFileName.lastIndexOf(".");
      const name =
        dotIndex > 0
          ? `${original.originalFileName.slice(0, dotIndex)} (copy)${original.originalFileName.slice(dotIndex)}`
          : `${original.originalFileName} (copy)`;
      const copy: DisplayAsset = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        originalFileName: name,
        uploadedAt: new Date().toISOString(),
        generatedVersions: original.generatedVersions.map((v) => ({ ...v })),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setAssets((prev) => prev.filter((a) => a.id !== pendingDelete.id));
    setPendingDelete(null);
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
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {asset.originalFileType === "video" ? (
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
