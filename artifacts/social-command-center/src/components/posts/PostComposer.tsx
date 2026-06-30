import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Platform } from "@/data/mockPosts";
import { PlatformSelector } from "./PlatformSelector";
import { PlatformMediaTabs, type PlatformMediaValue } from "./PlatformMediaTabs";
import { PlatformCaptionTabs } from "./PlatformCaptionTabs";
import { SocialPreviewPanel } from "./SocialPreviewPanel";
import { HashtagPicker } from "./HashtagPicker";
import { MentionPicker } from "./MentionPicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { listAccounts, createPost, updatePost, schedulePost, publishPost, getPost, type ApiAccount } from "@/lib/api";

const SERVER_TO_PLATFORM: Record<string, Platform> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

interface PostComposerProps {
  editPostId?: string;
}

export function PostComposer({ editPostId }: PostComposerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [masterCaption, setMasterCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["Facebook"]);
  const [platformCaptions, setPlatformCaptions] = useState<Record<Platform, string>>({} as Record<Platform, string>);
  const [platformHashtags, setPlatformHashtags] = useState<Record<string, string[]>>({});
  const [platformMentions, setPlatformMentions] = useState<Record<string, string[]>>({});
  const [platformMedia, setPlatformMedia] = useState<Record<string, PlatformMediaValue | null>>({});
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");

  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(!!editPostId);

  const isEditMode = !!editPostId;

  useEffect(() => {
    listAccounts().then((api) => {
      if (api !== null) setAccounts(api.filter((a) => a.connectionStatus === "connected"));
    });
  }, []);

  useEffect(() => {
    if (!editPostId) return;
    setIsLoadingPost(true);
    getPost(editPostId).then((post) => {
      if (post) {
        setTitle(post.title);
        setMasterCaption(post.masterCaption);
        const postPlatforms = post.platforms
          .map((pl) => SERVER_TO_PLATFORM[pl.platform.toUpperCase()])
          .filter((p): p is Platform => Boolean(p));
        setPlatforms(postPlatforms.length > 0 ? postPlatforms : ["Facebook"]);

        const loadedMedia: Record<string, PlatformMediaValue | null> = {};
        for (const pl of post.platforms) {
          const key = SERVER_TO_PLATFORM[pl.platform.toUpperCase()];
          if (key && pl.mediaUrl) {
            loadedMedia[key] = { url: pl.mediaUrl, type: pl.mediaType === "video" ? "video" : "image" };
          }
        }
        // Older posts only carry post-level media — apply it to every platform.
        if (Object.keys(loadedMedia).length === 0 && post.mediaUrl) {
          for (const key of postPlatforms) {
            loadedMedia[key] = { url: post.mediaUrl, type: post.mediaType === "video" ? "video" : "image" };
          }
        }
        setPlatformMedia(loadedMedia);
        if (post.scheduledAt) {
          const d = new Date(post.scheduledAt);
          setDate(d);
          const h = String(d.getHours()).padStart(2, "0");
          const m = String(d.getMinutes()).padStart(2, "0");
          setTime(`${h}:${m}`);
        }
      } else {
        toast({ title: "Post not found", description: "Could not load the post for editing.", variant: "destructive" });
        setLocation("/posts");
      }
      setIsLoadingPost(false);
    });
  }, [editPostId]);

  const handlePlatformCaptionChange = (platform: Platform, caption: string) => {
    setPlatformCaptions(prev => ({ ...prev, [platform]: caption }));
  };

  const handleHashtagChange = (platform: string, tags: string[]) => {
    setPlatformHashtags(prev => ({ ...prev, [platform]: tags }));
  };

  const handleMentionChange = (platform: string, handles: string[]) => {
    setPlatformMentions(prev => ({ ...prev, [platform]: handles }));
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

  const buildEffectiveCaption = () => {
    const tags = platforms.flatMap((p) => platformHashtags[p] ?? []);
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length === 0) return masterCaption;
    return `${masterCaption}\n\n${uniqueTags.join(" ")}`;
  };

  const buildPlatformMedia = () =>
    platforms
      .filter((p) => platformMedia[p]?.url)
      .map((p) => ({
        platform: p.toUpperCase(),
        mediaUrl: platformMedia[p]!.url,
        mediaType: platformMedia[p]!.type,
      }));

  const buildPostBody = () => {
    const pm = buildPlatformMedia();
    return {
      title,
      masterCaption: buildEffectiveCaption(),
      platforms: platforms.map((p) => p.toUpperCase()),
      accountIds: getAccountIds(),
      mediaUrl: pm[0]?.mediaUrl ?? undefined,
      mediaType: pm[0]?.mediaType ?? undefined,
      platformMedia: pm.length > 0 ? pm : undefined,
    };
  };

  const handlePlatformMediaChange = (platform: Platform, value: PlatformMediaValue | null) => {
    setPlatformMedia((prev) => ({ ...prev, [platform]: value }));
  };

  const handleApplyMediaToAll = (value: PlatformMediaValue) => {
    setPlatformMedia((prev) => {
      const next = { ...prev };
      for (const p of platforms) next[p] = value;
      return next;
    });
  };

  const accountIds = getAccountIds();
  const noConnectedAccounts = platforms.length > 0 && accountIds.length === 0;
  const isFormValid = title.length > 0 && platforms.length > 0 && masterCaption.length > 0 && !noConnectedAccounts;

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const body = { ...buildPostBody(), status: "DRAFT" };
      const post = isEditMode
        ? await updatePost(editPostId!, body)
        : await createPost(body);
      if (post) {
        toast({ title: isEditMode ? "Post updated" : "Draft saved", description: `"${title}" saved as draft.` });
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
      const body = { ...buildPostBody(), status: "DRAFT" };
      const post = isEditMode
        ? await updatePost(editPostId!, body)
        : await createPost(body);
      if (!post) {
        toast({ title: "Failed to save post", description: "The server returned an error.", variant: "destructive" });
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
      const body = { ...buildPostBody(), status: "DRAFT" };
      const post = isEditMode
        ? await updatePost(editPostId!, body)
        : await createPost(body);
      if (!post) {
        toast({ title: "Failed to save post", description: "The server returned an error.", variant: "destructive" });
        return;
      }
      const ok = await publishPost(post.id);
      if (ok) {
        toast({ title: "Post published", description: `"${title}" sent to ${platforms.join(" & ")}.` });
        setLocation("/posts");
      } else {
        toast({ title: "Publish failed", description: "Post was saved but publishing failed. You can retry it from the Posts page.", variant: "destructive" });
        setLocation("/posts?status=failed");
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error publishing post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewHashtags = platforms.flatMap((p) => platformHashtags[p] ?? []);
  const uniquePreviewHashtags = [...new Set(previewHashtags)];
  const previewCaption = uniquePreviewHashtags.length > 0
    ? `${masterCaption}\n\n${uniquePreviewHashtags.join(" ")}`
    : masterCaption;

  if (isLoadingPost) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
        Loading post…
      </div>
    );
  }

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
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">{masterCaption.length} chars</span>
              </div>
            </div>

            <HashtagPicker
              platforms={platforms}
              platformHashtags={platformHashtags}
              onChange={handleHashtagChange}
            />

            <MentionPicker
              platforms={platforms}
              platformMentions={platformMentions}
              onChange={handleMentionChange}
            />

            <PlatformMediaTabs
              platforms={platforms}
              platformMedia={platformMedia}
              onChange={handlePlatformMediaChange}
              onApplyToAll={handleApplyMediaToAll}
            />

            <PlatformCaptionTabs
              platforms={platforms}
              masterCaption={masterCaption}
              platformCaptions={platformCaptions}
              platformHashtags={platformHashtags}
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
                {isSubmitting ? "Saving…" : isEditMode ? "Reschedule" : "Schedule Post"}
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
                {isSubmitting ? "Saving…" : isEditMode ? "Update Draft" : "Save Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-20">
          <SocialPreviewPanel
            platforms={platforms}
            masterCaption={previewCaption}
            platformCaptions={platformCaptions}
            mediaUrl={buildPlatformMedia()[0]?.mediaUrl ?? null}
            platformMedia={platformMedia}
            date={date ? `${format(date, "PPP")} at ${time}` : "Preview"}
            accountNames={accountNames}
          />
        </div>
      </div>
    </div>
  );
}
