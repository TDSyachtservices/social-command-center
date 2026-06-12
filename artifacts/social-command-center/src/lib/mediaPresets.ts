import { CropMode } from "../data/mockMedia";

export interface MediaPreset {
  platform: "Facebook" | "Instagram" | "LinkedIn" | "TikTok" | "Website";
  placement: string;
  width: number;
  height: number;
  aspectRatio: string;
  mediaType: "image" | "video" | "both";
  format: string;
  defaultCropMode: CropMode;
  notes: string;
}

export const ALL_PRESETS: MediaPreset[] = [
  // Facebook
  { platform: "Facebook", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Facebook", placement: "Feed Landscape", width: 1200, height: 630, aspectRatio: "1.91:1", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "Facebook", placement: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Facebook", placement: "Story", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "image", format: "JPG", defaultCropMode: "blurred_background_fill", notes: "" },
  { platform: "Facebook", placement: "Video Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Facebook", placement: "Video Landscape", width: 1280, height: 720, aspectRatio: "16:9", mediaType: "video", format: "MP4", defaultCropMode: "fit", notes: "" },
  { platform: "Facebook", placement: "Reel", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },

  // Instagram
  { platform: "Instagram", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Instagram", placement: "Feed Landscape", width: 1080, height: 566, aspectRatio: "1.91:1", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "Instagram", placement: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Instagram", placement: "Story", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "image", format: "JPG", defaultCropMode: "blurred_background_fill", notes: "" },
  { platform: "Instagram", placement: "Video Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Instagram", placement: "Video Landscape", width: 1080, height: 608, aspectRatio: "16:9", mediaType: "video", format: "MP4", defaultCropMode: "fit", notes: "" },
  { platform: "Instagram", placement: "Reel", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },

  // LinkedIn
  { platform: "LinkedIn", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "LinkedIn", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "LinkedIn", placement: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "LinkedIn", placement: "Video Landscape", width: 1920, height: 1080, aspectRatio: "16:9", mediaType: "video", format: "MP4", defaultCropMode: "fit", notes: "" },
  { platform: "LinkedIn", placement: "Video Square", width: 1080, height: 1080, aspectRatio: "1:1", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },
  { platform: "LinkedIn", placement: "Video Portrait", width: 1080, height: 1350, aspectRatio: "4:5", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },

  // TikTok
  { platform: "TikTok", placement: "Photo Story", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "image", format: "JPG", defaultCropMode: "blurred_background_fill", notes: "" },
  { platform: "TikTok", placement: "Vertical Video", width: 1080, height: 1920, aspectRatio: "9:16", mediaType: "video", format: "MP4", defaultCropMode: "smart_crop", notes: "" },

  // Website
  { platform: "Website", placement: "Hero Image", width: 1920, height: 1080, aspectRatio: "16:9", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "Website", placement: "Blog Cover", width: 1200, height: 675, aspectRatio: "16:9", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "Website", placement: "Square Thumbnail", width: 600, height: 600, aspectRatio: "1:1", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Website", placement: "Wide Thumbnail", width: 600, height: 400, aspectRatio: "3:2", mediaType: "image", format: "JPG", defaultCropMode: "fit", notes: "" },
  { platform: "Website", placement: "Portrait Feature", width: 800, height: 1000, aspectRatio: "4:5", mediaType: "image", format: "JPG", defaultCropMode: "smart_crop", notes: "" },
  { platform: "Website", placement: "Hero Video", width: 1920, height: 1080, aspectRatio: "16:9", mediaType: "video", format: "MP4", defaultCropMode: "fit", notes: "" },
  { platform: "Website", placement: "Background Video", width: 1280, height: 720, aspectRatio: "16:9", mediaType: "video", format: "MP4", defaultCropMode: "fit", notes: "" },
];
