export type CropMode = "fit" | "fill" | "smart_crop" | "manual_crop" | "blurred_background_fill";
export type MediaProcessingStatus = "pending" | "processing" | "complete" | "failed" | "needs_review";
export type QualityScore = "Excellent" | "Good" | "Needs Review" | "Poor";
export type MediaType = "image" | "video";

export interface MediaVersion {
  id: string;
  mediaAssetId: string;
  platform: "Facebook" | "Instagram" | "LinkedIn" | "TikTok" | "Website";
  placement: string;        // e.g. "Feed Square", "Story / Reel", "Hero Image"
  width: number;
  height: number;
  aspectRatio: string;      // e.g. "1:1", "9:16", "16:9"
  format: string;           // e.g. "JPG", "MP4"
  mimeType: string;
  fileSizeBytes: number;
  previewUrl: string;       // placeholder string like "/mock-preview/..."
  processingStatus: MediaProcessingStatus;
  cropMode: CropMode;
  focalPoint: { x: number; y: number };  // 0-1 normalized
  safeZoneWarnings: string[];
  qualityScore: QualityScore;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface MediaAsset {
  id: string;
  originalFileName: string;
  originalFileType: MediaType;
  originalMimeType: string;
  originalWidth: number;
  originalHeight: number;
  originalDuration: number | null;   // seconds, null for images
  originalSizeBytes: number;
  originalUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  processingStatus: MediaProcessingStatus;
  generatedVersions: MediaVersion[];
}

export const mockMediaAssets: MediaAsset[] = [
  {
    id: "asset_1",
    originalFileName: "teak-deck-refit-hero.jpg",
    originalFileType: "image",
    originalMimeType: "image/jpeg",
    originalWidth: 4000,
    originalHeight: 3000,
    originalDuration: null,
    originalSizeBytes: 8200000, // 8.2MB
    originalUrl: "placeholder",
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    uploadedBy: "user_1",
    processingStatus: "complete",
    generatedVersions: [
      {
        id: "v_1_1", mediaAssetId: "asset_1", platform: "Facebook", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 450000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "smart_crop", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_1_2", mediaAssetId: "asset_1", platform: "Instagram", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 450000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "smart_crop", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_1_3", mediaAssetId: "asset_1", platform: "Instagram", placement: "Story / Reel", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 600000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "blurred_background_fill", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: ["Landscape image required blurred background fill for 9:16 format"], qualityScore: "Needs Review", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_1_4", mediaAssetId: "asset_1", platform: "LinkedIn", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 520000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_1_5", mediaAssetId: "asset_1", platform: "Website", placement: "Hero Image", width: 1920, height: 1080, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 1100000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      }
    ]
  },
  {
    id: "asset_2",
    originalFileName: "composite-deck-install.jpg",
    originalFileType: "image",
    originalMimeType: "image/jpeg",
    originalWidth: 1920,
    originalHeight: 1080,
    originalDuration: null,
    originalSizeBytes: 3100000, // 3.1MB
    originalUrl: "placeholder",
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    uploadedBy: "user_1",
    processingStatus: "complete",
    generatedVersions: [
      {
        id: "v_2_1", mediaAssetId: "asset_2", platform: "Facebook", placement: "Feed Landscape", width: 1200, height: 630, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 420000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Good", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_2_2", mediaAssetId: "asset_2", platform: "Instagram", placement: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 580000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "smart_crop", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Needs Review", validationErrors: [], validationWarnings: ["Significant crop from 16:9 to 4:5"]
      },
      {
        id: "v_2_3", mediaAssetId: "asset_2", platform: "TikTok", placement: "Vertical", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 620000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "blurred_background_fill", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Poor", validationErrors: ["Original is landscape; vertical conversion requires heavy background fill"], validationWarnings: []
      },
      {
        id: "v_2_4", mediaAssetId: "asset_2", platform: "Website", placement: "Blog", width: 1200, height: 675, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 390000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      }
    ]
  },
  {
    id: "asset_3",
    originalFileName: "maintenance-tip-video.mp4",
    originalFileType: "video",
    originalMimeType: "video/mp4",
    originalWidth: 1920,
    originalHeight: 1080,
    originalDuration: 45,
    originalSizeBytes: 185000000, // 185MB
    originalUrl: "placeholder",
    uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    uploadedBy: "user_2",
    processingStatus: "complete",
    generatedVersions: [
      {
        id: "v_3_1", mediaAssetId: "asset_3", platform: "Instagram", placement: "Reel", width: 1080, height: 1920, aspectRatio: "9:16", format: "MP4", mimeType: "video/mp4", fileSizeBytes: 25000000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "smart_crop", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Needs Review", validationErrors: [], validationWarnings: ["Horizontal video cropped for Reel — subject may be off-center"]
      },
      {
        id: "v_3_2", mediaAssetId: "asset_3", platform: "Facebook", placement: "Reel", width: 1080, height: 1920, aspectRatio: "9:16", format: "MP4", mimeType: "video/mp4", fileSizeBytes: 25000000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "smart_crop", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Needs Review", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_3_3", mediaAssetId: "asset_3", platform: "Website", placement: "Hero Video", width: 1920, height: 1080, aspectRatio: "16:9", format: "MP4", mimeType: "video/mp4", fileSizeBytes: 42000000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      }
    ]
  },
  {
    id: "asset_4",
    originalFileName: "seasole-product-close.jpg",
    originalFileType: "image",
    originalMimeType: "image/jpeg",
    originalWidth: 2400,
    originalHeight: 2400,
    originalDuration: null,
    originalSizeBytes: 4800000, // 4.8MB
    originalUrl: "placeholder",
    uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    uploadedBy: "user_1",
    processingStatus: "complete",
    generatedVersions: [
      {
        id: "v_4_1", mediaAssetId: "asset_4", platform: "Facebook", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 280000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_4_2", mediaAssetId: "asset_4", platform: "Instagram", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 280000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_4_3", mediaAssetId: "asset_4", platform: "LinkedIn", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 280000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Excellent", validationErrors: [], validationWarnings: []
      },
      {
        id: "v_4_4", mediaAssetId: "asset_4", platform: "TikTok", placement: "Vertical", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 450000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "blurred_background_fill", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Good", validationErrors: [], validationWarnings: ["Square image padded with blurred background for 9:16"]
      },
      {
        id: "v_4_5", mediaAssetId: "asset_4", platform: "Website", placement: "Thumbnail", width: 600, height: 400, aspectRatio: "3:2", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 120000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Good", validationErrors: [], validationWarnings: []
      }
    ]
  },
  {
    id: "asset_5",
    originalFileName: "production-floor-bts.jpg",
    originalFileType: "image",
    originalMimeType: "image/jpeg",
    originalWidth: 800,
    originalHeight: 600,
    originalDuration: null,
    originalSizeBytes: 1200000, // 1.2MB
    originalUrl: "placeholder",
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    uploadedBy: "user_2",
    processingStatus: "complete",
    generatedVersions: [
      {
        id: "v_5_1", mediaAssetId: "asset_5", platform: "Facebook", placement: "Feed", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 650000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Poor", validationErrors: ["Original resolution too low — upscaling required"], validationWarnings: []
      },
      {
        id: "v_5_2", mediaAssetId: "asset_5", platform: "Instagram", placement: "Feed", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 650000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Poor", validationErrors: ["Original resolution too low — upscaling required"], validationWarnings: []
      },
      {
        id: "v_5_3", mediaAssetId: "asset_5", platform: "Website", placement: "Thumbnail", width: 600, height: 400, aspectRatio: "3:2", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: 180000, previewUrl: "placeholder", processingStatus: "complete", cropMode: "fit", focalPoint: { x: 0.5, y: 0.5 }, safeZoneWarnings: [], qualityScore: "Good", validationErrors: [], validationWarnings: []
      }
    ]
  }
];
