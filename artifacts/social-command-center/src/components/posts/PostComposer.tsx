import { useState } from "react";
import { Platform } from "@/data/mockPosts";
import { PlatformSelector } from "./PlatformSelector";
import { MediaUploadCard } from "./MediaUploadCard";
import { PlatformCaptionTabs } from "./PlatformCaptionTabs";
import { SocialPreviewPanel } from "./SocialPreviewPanel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export function PostComposer() {
  const [title, setTitle] = useState("");
  const [masterCaption, setMasterCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["Facebook", "Instagram"]);
  const [platformCaptions, setPlatformCaptions] = useState<Record<Platform, string>>({} as any);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");

  const handlePlatformCaptionChange = (platform: Platform, caption: string) => {
    setPlatformCaptions(prev => ({ ...prev, [platform]: caption }));
  };

  const isFormValid = title.length > 0 && platforms.length > 0 && masterCaption.length > 0;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Title <span className="text-destructive">*</span></label>
              <Input 
                placeholder="e.g., Q3 Teak Decking Showcase" 
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <PlatformSelector selectedPlatforms={platforms} onChange={setPlatforms} />

            <div className="space-y-2">
              <label className="text-sm font-medium">Master Caption <span className="text-destructive">*</span></label>
              <Textarea 
                placeholder="Write your main message here..." 
                className="min-h-[120px]"
                value={masterCaption}
                onChange={e => setMasterCaption(e.target.value)}
              />
            </div>

            <MediaUploadCard onMediaSelect={(url) => setMediaUrl(url)} />

            <PlatformCaptionTabs 
              platforms={platforms}
              masterCaption={masterCaption}
              platformCaptions={platformCaptions}
              onChange={handlePlatformCaptionChange}
            />

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 pt-6 border-t">
              <Button disabled={!isFormValid} className="flex-1 min-w-[150px]">Schedule Post</Button>
              <Button disabled={!isFormValid} variant="outline" className="flex-1 min-w-[150px]">Publish Now</Button>
              <Button variant="secondary" className="flex-1 min-w-[150px]">Save Draft</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-2">
        <div className="sticky top-20">
          <SocialPreviewPanel 
            platforms={platforms}
            masterCaption={masterCaption}
            platformCaptions={platformCaptions}
            mediaUrl={mediaUrl}
            date={date ? `${format(date, "PPP")} at ${time}` : "Preview"}
          />
        </div>
      </div>
    </div>
  );
}
