import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { mockUploadMedia } from "@/lib/mockActions";

interface MediaUploadCardProps {
  onMediaSelect: (url: string, type: "image" | "video") => void;
}

export function MediaUploadCard({ onMediaSelect }: MediaUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await mockUploadMedia(file);
      setPreview(result.url);
      onMediaSelect(result.url, file.type.startsWith("video/") ? "video" : "image");
    } catch (error) {
      console.error(error);
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
        <div className="relative border rounded-lg overflow-hidden group bg-muted flex items-center justify-center aspect-video">
          {/* Using a placeholder visual if it's a mock URL, else try to render */}
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
      )}
    </div>
  );
}
