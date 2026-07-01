import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Platform } from "@/data/mockPosts";
import { PlatformSelector } from "./PlatformSelector";
import { PlatformMediaTabs, type PlatformMediaValue } from "./PlatformMediaTabs";
import { PlatformCaptionTabs } from "./PlatformCaptionTabs";
import { SocialPreviewPanel } from "./SocialPreviewPanel";
import { HashtagPicker } from "./HashtagPicker";
import { MentionPicker } from "./MentionPicker";
import { PostTypeSelector, type PostType } from "./PostTypeSelector";
import { AlbumUploader } from "./AlbumUploader";
import { EventFields, type EventMeta } from "./EventFields";
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
import { validatePostContent, hasBlockingErrors } from "@/lib/platformValidation";
import { PlatformValidationNotice } from "./PlatformValidationNotice";
import { AiCaptionReviser } from "./AiCaptionReviser";

const SERVER_TO_PLATFORM: Record<string, Platform> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

const EMPTY_EVENT_META: EventMeta = {
  eventName: "",
  eventStartTime: "",
  eventEndTime: "",
  eventLocation: "",
  eventDescription: "",
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
  const [touchedCaptionPlatforms, setTouchedCaptionPlatforms] = useState<Set<Platform>>(new Set());
  const [platformHashtags, setPlatformHashtags] = useState<Record<string, string[]>>({});
  const [platformMentions, setPlatformMentions] = useState<Record<string, string[]>>({});
  const [platformMedia, setPlatformMedia] = useState<Record<string, PlatformMediaValue | null>>({});
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");

  // New post-type fields
  const [postType, setPostType] = useState<PostType>("standard");
  const [albumUrls, setAlbumUrls] = useState<string[]>([]);
  const [eventMeta, setEventMeta] = useState<EventMeta>(EMPTY_EVENT_META);

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

        // Restore post type
        const pt = post.postType;
        if (pt && ["standard", "album", "story", "reel", "event"].includes(pt)) {
          setPostType(pt as PostType);
        }

        // Restore album URLs
        const addUrls = post.additionalMediaUrls;
        if (Array.isArray(addUrls)) setAlbumUrls(addUrls);

        // Restore metadata
        const meta = post.postMetadataJson;
        if (meta) {
          if (meta.eventName || meta.eventStartTime) {
            setEventMeta({
              eventName: String(meta.eventName ?? ""),
              eventStartTime: String(meta.eventStartTime ?? ""),
              eventEndTime: String(meta.eventEndTime ?? ""),
              eventLocation: String(meta.eventLocation ?? ""),
              eventDescription: String(meta.eventDescription ?? ""),
            });
          }
        }

        const loadedMedia: Record<string, PlatformMediaValue | null> = {};
        const loadedCaptions: Record<string, string> = {};
        for (const pl of post.platforms) {
          const key = SERVER_TO_PLATFORM[pl.platform.toUpperCase()];
          if (key) {
            if (pl.mediaUrl) {
              loadedMedia[key] = { url: pl.mediaUrl, type: pl.mediaType === "video" ? "video" : "image" };
            }
            if (pl.platformCaption) {
              loadedCaptions[key] = pl.platformCaption;
            }
          }
        }
        if (Object.keys(loadedMedia).length === 0 && post.mediaUrl) {
          for (const key of postPlatforms) {
            loadedMedia[key] = { url: post.mediaUrl, type: post.mediaType === "video" ? "video" : "image" };
          }
        }
        setPlatformMedia(loadedMedia);
        setPlatformCaptions(loadedCaptions as Record<Platform, string>);
        setTouchedCaptionPlatforms(new Set(Object.keys(loadedCaptions) as Platform[]));
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
    setTouchedCaptionPlatforms(prev => new Set([...prev, platform]));
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
    const base = postType === "event" && eventMeta.eventDescription
      ? eventMeta.eventDescription
      : masterCaption;
    const tags = platforms.flatMap((p) => platformHashtags[p] ?? []);
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length === 0) return base;
    return `${base}\n\n${uniqueTags.join(" ")}`;
  };

  const buildPlatformMedia = () =>
    platforms
      .filter((p) => platformMedia[p]?.url || touchedCaptionPlatforms.has(p))
      .map((p) => ({
        platform: p.toUpperCase(),
        mediaUrl: platformMedia[p]?.url ?? null,
        mediaType: platformMedia[p]?.type ?? null,
        platformCaption: platformCaptions[p]?.trim() || null,
      }));

  const buildPostMetadata = (): Record<string, unknown> | null => {
    const meta: Record<string, unknown> = {};
    if (postType === "event") {
      meta.eventName = eventMeta.eventName || title;
      meta.eventStartTime = eventMeta.eventStartTime
        ? new Date(eventMeta.eventStartTime).toISOString()
        : "";
      meta.eventEndTime = eventMeta.eventEndTime
        ? new Date(eventMeta.eventEndTime).toISOString()
        : "";
      meta.eventLocation = eventMeta.eventLocation;
      meta.eventDescription = eventMeta.eventDescription;
    }
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const buildPostBody = () => {
    const pm = buildPlatformMedia();
    const primaryMedia = pm[0];
    return {
      title,
      masterCaption: buildEffectiveCaption(),
      platforms: platforms.map((p) => p.toUpperCase()),
      accountIds: getAccountIds(),
      postType,
      additionalMediaUrls: postType === "album" ? albumUrls.slice(1) : [],
      postMetadataJson: buildPostMetadata(),
      mediaUrl: postType === "album" && albumUrls.length > 0
        ? albumUrls[0]
        : primaryMedia?.mediaUrl ?? undefined,
      mediaType: postType === "album" && albumUrls.length > 0
        ? "image"
        : primaryMedia?.mediaType ?? undefined,
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
  const hasAnyMedia = postType === "album"
    ? albumUrls.length >= 2
    : platforms.some((p) => !!platformMedia[p]?.url);
  const captionRequired = postType !== "album" && !hasAnyMedia;
  const eventValid = postType !== "event" || (!!eventMeta.eventStartTime && !!(eventMeta.eventName || title));
  const albumValid = postType !== "album" || albumUrls.length >= 2;
  const isFormValid = title.length > 0 && platforms.length > 0 && (masterCaption.length > 0 || hasAnyMedia) && !noConnectedAccounts && eventValid && albumValid;

  const validationIssues = validatePostContent({ platforms, masterCaption, platformCaptions, platformHashtags, platformMedia });
  const hasContentErrors = hasBlockingErrors(validationIssues) && postType === "standard";

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
    if (hasContentErrors) {
      toast({ title: "Can't schedule yet", description: "Fix the highlighted platform requirements first.", variant: "destructive" });
      return;
    }
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
    if (hasContentErrors) {
      toast({ title: "Can't publish yet", description: "Fix the highlighted platform requirements first.", variant: "destructive" });
      return;
    }
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

            <PostTypeSelector
              value={postType}
              onChange={setPostType}
              availablePlatforms={platforms}
            />

            {/* Album uploader */}
            {postType === "album" && (
              <AlbumUploader
                urls={albumUrls}
                onChange={setAlbumUrls}
                label="Album / Carousel Photos"
                maxItems={10}
                minItems={2}
              />
            )}

            {/* Event fields */}
            {postType === "event" && (
              <EventFields value={eventMeta} onChange={setEventMeta} />
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {postType === "event" ? "Post Caption" : "Master Caption"}
                {captionRequired && <span className="text-destructive"> *</span>}
                {!captionRequired && <span className="text-muted-foreground font-normal text-xs ml-1">(optional — you have media)</span>}
              </label>
              <Textarea
                placeholder={
                  postType === "event"
                    ? "Promotional text for the event post…"
                    : captionRequired
                    ? "Write your main message here..."
                    : "Caption (optional)…"
                }
                className="min-h-[120px]"
                value={masterCaption}
                onChange={e => setMasterCaption(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <AiCaptionReviser
                  caption={masterCaption}
                  platforms={platforms}
                  onAccept={(revised) => setMasterCaption(revised)}
                  disabled={isSubmitting}
                />
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

            {/* Per-platform media — hidden for album (uses AlbumUploader) */}
            {postType !== "album" && (
              <PlatformMediaTabs
                platforms={platforms}
                platformMedia={platformMedia}
                onChange={handlePlatformMediaChange}
                onApplyToAll={handleApplyMediaToAll}
              />
            )}


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

            {postType === "standard" && <PlatformValidationNotice issues={validationIssues} />}

            {postType === "album" && !albumValid && albumUrls.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Add at least 2 photos to publish as an album or carousel.</span>
              </div>
            )}

            {postType === "event" && !eventValid && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>An Event requires a name and a start date/time.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-6 border-t">
              <Button
                disabled={!isFormValid || isSubmitting || hasContentErrors}
                className="flex-1 min-w-[150px]"
                onClick={handleSchedule}
              >
                {isSubmitting ? "Saving…" : isEditMode ? "Reschedule" : "Schedule Post"}
              </Button>
              <Button
                disabled={!isFormValid || isSubmitting || hasContentErrors}
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
            mediaUrl={
              postType === "album"
                ? (albumUrls[0] ?? null)
                : buildPlatformMedia()[0]?.mediaUrl ?? null
            }
            platformMedia={platformMedia}
            date={date ? `${format(date, "PPP")} at ${time}` : "Preview"}
            accountNames={accountNames}
          />
        </div>
      </div>
    </div>
  );
}
