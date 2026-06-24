import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Platform } from "@/data/mockPosts";
import { PlatformSelector } from "./PlatformSelector";
import { MediaUploadCard } from "./MediaUploadCard";
import { PlatformCaptionTabs } from "./PlatformCaptionTabs";
import { SocialPreviewPanel } from "./SocialPreviewPanel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { listAccounts, createPost, schedulePost, publishPost, type ApiAccount } from "@/lib/api";

export function PostComposer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [masterCaption, setMasterCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["Facebook", "Instagram"]);
  const [platformCaptions, setPlatformCaptions] = useState<Record<Platform, string>>({} as any);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");

  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listAccounts().then((api) => {
      if (api !== null) setAccounts(api.filter((a) => a.connectionStatus === "connected"));
    });
  }, []);

  const handlePlatformCaptionChange = (platform: Platform, caption: string) => {
    setPlatformCaptions(prev => ({ ...prev, [platform]: caption }));
  };

  const getAccountIds = (): string[] => {
    const selected = new Set(platforms.map((p) => p.toUpperCase()));
    return accounts
      .filter((a) => selected.has(a.platform.toUpperCase()))
      .map((a) => a.id);
  };

  const accountNames: Partial<Record<Platform, string>> = Object.fromEntries(
    platforms.flatMap((p) => {
      const match = accounts.find((a) => a.platform.toUpperCase() === p.toUpperCase());
      return match ? [[p, match.accountName]] : [];
    })
  );

  const buildPostBody = () => ({
    title,
    masterCaption,
    platforms: platforms.map((p) => p.toUpperCase()),
    accountIds: getAccountIds(),
    mediaUrl: mediaUrl ?? undefined,
  });

  const accountIds = getAccountIds();
  const noConnectedAccounts = platforms.length > 0 && accountIds.length === 0;
  const isFormValid = title.length > 0 && platforms.length > 0 && masterCaption.length > 0 && !noConnectedAccounts;

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const post = await createPost({ ...buildPostBody(), status: "DRAFT" });
      if (post) {
        toast({ title: "Draft saved", description: `"${title}" saved as draft.` });
        setLocation("/posts");
      } else {
        toast({ title: "Failed to save draft", description: "The server returned an error. Check that the API is reachable.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error saving draft.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    if (!date) {
      toast({ title: "No date selected", description: "Pick a schedule date before scheduling.", variant: "destructive" });
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    setIsSubmitting(true);
    try {
      const post = await createPost({ ...buildPostBody(), status: "DRAFT" });
      if (!post) {
        toast({ title: "Failed to create post", description: "The server returned an error.", variant: "destructive" });
        return;
      }
      const ok = await schedulePost(post.id, scheduledAt.toISOString());
      if (ok) {
        toast({ title: "Post scheduled", description: `"${title}" scheduled for ${format(scheduledAt, "PPP 'at' p")}.` });
        setLocation("/posts");
      } else {
        toast({ title: "Failed to schedule", description: "Post was saved but could not be scheduled.", variant: "destructive" });
        setLocation("/posts");
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error scheduling post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    setIsSubmitting(true);
    try {
      const post = await createPost({ ...buildPostBody(), status: "DRAFT" });
      if (!post) {
        toast({ title: "Failed to create post", description: "The server returned an error.", variant: "destructive" });
        return;
      }
      const ok = await publishPost(post.id);
      if (ok) {
        toast({ title: "Post published", description: `"${title}" sent to Facebook.` });
        setLocation("/posts");
      } else {
        toast({ title: "Publish failed", description: "Post was created but publishing failed. You can retry it from the Posts page.", variant: "destructive" });
        setLocation("/posts?status=failed");
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error publishing post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {noConnectedAccounts && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>No connected account found for the selected platform(s). <button className="underline font-medium" onClick={() => setLocation("/connected-accounts")}>Connect an account</button> first.</span>
              </div>
            )}

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
              <Button
                disabled={!isFormValid || isSubmitting}
                className="flex-1 min-w-[150px]"
                onClick={handleSchedule}
              >
                {isSubmitting ? "Saving…" : "Schedule Post"}
              </Button>
              <Button
                disabled={!isFormValid || isSubmitting}
                variant="outline"
                className="flex-1 min-w-[150px]"
                onClick={handlePublishNow}
              >
                {isSubmitting ? "Publishing…" : "Publish Now"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 min-w-[150px]"
                disabled={title.length === 0 || isSubmitting}
                onClick={handleSaveDraft}
              >
                {isSubmitting ? "Saving…" : "Save Draft"}
              </Button>
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
            accountNames={accountNames}
          />
        </div>
      </div>
    </div>
  );
}
