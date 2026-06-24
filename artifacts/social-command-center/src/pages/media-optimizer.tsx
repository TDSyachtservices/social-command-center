import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { getMediaAsset } from "@/lib/api";
import { ALL_PRESETS } from "@/lib/mediaPresets";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { mockGenerateMediaVersions, mockRegenerateVersion, mockApplyManualCrop } from "@/lib/mockActions";
import { Image as ImageIcon, Film, Crop, AlertTriangle, XCircle, UploadCloud } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type GeneratedVersion = {
  id: string;
  platform: string;
  placement: string;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  cropMode: string;
  focalPoint: { x: number; y: number };
  processingStatus: string;
  qualityScore: string;
  safeZoneWarnings: string[];
  validationErrors: string[];
  validationWarnings: string[];
};

type OptimizerAsset = {
  id: string;
  originalFileName: string;
  originalFileType: "image" | "video";
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalDuration?: number | null;
  processingStatus: string;
  generatedVersions: GeneratedVersion[];
};

export default function MediaOptimizer() {
  const { assetId } = useParams();
  const { toast } = useToast();
  const [asset, setAsset] = useState<OptimizerAsset | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    setAsset(null);
    getMediaAsset(assetId).then((api) => {
      if (api !== null) {
        setAsset({
          id: api.id,
          originalFileName: api.originalFileName,
          originalFileType: (api.originalFileType === "video" ? "video" : "image") as "image" | "video",
          originalSizeBytes: api.originalSizeBytes,
          originalWidth: api.originalWidth ?? 0,
          originalHeight: api.originalHeight ?? 0,
          processingStatus: api.processingStatus,
          generatedVersions: [],
        });
      }
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await mockGenerateMediaVersions(asset.id, selectedPresets);
      toast({ title: "Versions Generated", description: `Generated selected versions successfully.` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (versionId: string) => {
    const v = asset.generatedVersions.find(ver => ver.id === versionId);
    if (!v) return;
    await mockRegenerateVersion(versionId, v.cropMode, v.focalPoint);
    toast({ title: "Regenerated", description: `Version regenerated successfully.` });
  };

  const applyCrop = async (versionId: string) => {
    await mockApplyManualCrop(versionId, {});
    toast({ title: "Crop Applied", description: `Crop changes saved.` });
    setActiveCropId(null);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-[30%] min-w-[300px] border-r flex flex-col overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
             {asset.originalFileType === "video" ? (
                <Film className="w-12 h-12 text-muted-foreground opacity-50" />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground opacity-50" />
              )}
          </div>
          
          <div className="space-y-2">
            <h2 className="font-bold text-lg truncate" title={asset.originalFileName}>{asset.originalFileName}</h2>
            <div className="flex gap-2">
              <span className="text-xs uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{asset.originalFileType}</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded border">{asset.originalWidth} × {asset.originalHeight}</span>
            </div>
            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-y-1 mt-2">
              <div>Size: {(asset.originalSizeBytes / 1024 / 1024).toFixed(1)} MB</div>
              {asset.originalDuration && <div>Duration: {asset.originalDuration}s</div>}
            </div>
          </div>

          <hr />

          <div className="space-y-4">
            <h3 className="font-semibold">Select Output Presets</h3>
            {platforms.map(platform => {
              const platformPresets = ALL_PRESETS.filter(p => p.platform === platform && (p.mediaType === "both" || p.mediaType === asset.originalFileType));
              if (platformPresets.length === 0) return null;
              
              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={platform} showText={true} />
                  </div>
                  <div className="pl-6 space-y-2">
                    {platformPresets.map(preset => {
                      const presetId = `${preset.platform}-${preset.placement}`;
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
                          <label htmlFor={presetId} className="cursor-pointer flex-1">
                            {preset.placement} <span className="text-muted-foreground text-xs">({preset.width}×{preset.height})</span>
                          </label>
                        </div>
                      )
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
              {isGenerating ? "Generating..." : `Generate ${selectedPresets.length} Versions`}
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        <div className="p-6 border-b bg-background flex items-center justify-between">
          <h2 className="text-xl font-bold">Generated Versions <span className="text-muted-foreground font-normal text-base ml-2">({asset.generatedVersions.length})</span></h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {asset.generatedVersions.map(version => {
              const scoreColor = version.qualityScore === "Poor" ? "bg-red-500" : version.qualityScore === "Needs Review" ? "bg-amber-500" : "bg-green-500";
              const isCropping = activeCropId === version.id;

              return (
                <div key={version.id} className="border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col" data-testid={`version-card-${version.id}`}>
                  <div className="p-4 border-b flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PlatformBadge platform={version.platform} showText={false} />
                        <span className="font-semibold">{version.placement}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {version.width} × {version.height} • {version.aspectRatio} • {version.format}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full text-white font-medium ${scoreColor}`}>
                      {version.qualityScore}
                    </div>
                  </div>
                  
                  <div className="p-4 flex gap-4">
                    <div className="w-32 h-32 bg-muted rounded flex-shrink-0 flex items-center justify-center relative border">
                      <Crop className="w-8 h-8 text-muted-foreground opacity-30" />
                      {version.safeZoneWarnings.length > 0 && (
                        <div className="absolute top-1 right-1 text-amber-500" title={version.safeZoneWarnings.join("\n")}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        {version.validationErrors.length > 0 && (
                          <div className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 p-2 rounded flex items-start gap-1.5">
                            <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{version.validationErrors[0]}</span>
                          </div>
                        )}
                        {version.validationWarnings.length > 0 && (
                          <div className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 p-2 rounded flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{version.validationWarnings[0]}</span>
                          </div>
                        )}
                        <div className="text-xs inline-block px-2 py-1 bg-muted rounded border">
                          Crop: <span className="font-medium">{version.cropMode.replace(/_/g, " ")}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActiveCropId(isCropping ? null : version.id)} data-testid={`btn-edit-crop-${version.id}`}>
                          {isCropping ? "Cancel" : "Edit Crop"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRegenerate(version.id)}>Regenerate</Button>
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
                        <Button size="sm" onClick={() => applyCrop(version.id)}>Apply Crop</Button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
            
            {asset.generatedVersions.length === 0 && (
              <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                No versions generated yet. Select presets and click Generate.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
