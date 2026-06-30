import { useState, useEffect } from "react";
import { Hash, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  loadSets, createSet, updateSet, deleteSet,
  validateHashtag, parseHashtags,
  type HashtagSet,
} from "@/lib/hashtagStore";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const ALL_PLATFORMS = ["Facebook", "Instagram", "LinkedIn"];

function PlatformToggle({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (p: string[]) => void;
}) {
  const toggle = (p: string) =>
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PLATFORMS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => toggle(p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
            selected.includes(p)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
          {p}
          {selected.includes(p) && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );
}

function HashtagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
      {tag}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-destructive transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface SetFormState {
  name: string;
  platforms: string[];
  tagInput: string;
  hashtags: string[];
  tagError: string;
}

const emptyForm = (): SetFormState => ({
  name: "",
  platforms: [],
  tagInput: "",
  hashtags: [],
  tagError: "",
});

function SetDialog({
  open,
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  initial?: HashtagSet;
  onClose: () => void;
  onSave: (data: Pick<HashtagSet, "name" | "platforms" | "hashtags">) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<SetFormState>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { name: initial.name, platforms: initial.platforms, tagInput: "", hashtags: initial.hashtags, tagError: "" }
          : emptyForm()
      );
    }
  }, [open, initial]);

  const addTags = () => {
    const raw = form.tagInput.trim();
    if (!raw) return;
    const parsed = parseHashtags(raw);
    if (parsed.length === 0) {
      setForm((f) => ({ ...f, tagError: "Enter valid hashtags (letters, numbers, underscores only)" }));
      return;
    }
    const unique = parsed.filter((t) => !form.hashtags.includes(t));
    setForm((f) => ({ ...f, hashtags: [...f.hashtags, ...unique], tagInput: "", tagError: "" }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTags();
    }
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((t) => t !== tag) }));

  const committedHashtags = (): string[] => {
    const pending = parseHashtags(form.tagInput.trim());
    return [...form.hashtags, ...pending.filter((t) => !form.hashtags.includes(t))];
  };

  const canSave = !isSaving && form.name.trim().length > 0 && committedHashtags().length > 0;

  const handleSaveClick = () => {
    const hashtags = committedHashtags();
    if (!form.name.trim() || hashtags.length === 0) return;
    onSave({ name: form.name.trim(), platforms: form.platforms, hashtags });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Hashtag Set" : "New Hashtag Set"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Set Name</label>
            <Input
              placeholder='e.g. "Marine Industry" or "Brand Tags"'
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Platforms</label>
            <PlatformToggle selected={form.platforms} onChange={(p) => setForm((f) => ({ ...f, platforms: p }))} />
            <p className="text-xs text-muted-foreground">Select which platforms this set is recommended for.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hashtags</label>
            <div className="flex gap-2">
              <Input
                placeholder="#teak #boating #marine"
                value={form.tagInput}
                onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value, tagError: "" }))}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" variant="outline" onClick={addTags}>Add</Button>
            </div>
            {form.tagError && <p className="text-xs text-destructive">{form.tagError}</p>}
            <p className="text-xs text-muted-foreground">
              Type hashtags separated by spaces or commas, then press Enter, Add, or Save.
            </p>
            {form.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.hashtags.map((t) => (
                  <HashtagChip key={t} tag={t} onRemove={() => removeTag(t)} />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{form.hashtags.length} hashtag{form.hashtags.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button disabled={!canSave} onClick={handleSaveClick}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {initial ? "Save Changes" : "Create Set"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HashtagLibrary() {
  const { toast } = useToast();
  const [sets, setSets] = useState<HashtagSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HashtagSet | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSets()
      .then(setSets)
      .catch(() => toast({ title: "Failed to load hashtag sets", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (data: Pick<HashtagSet, "name" | "platforms" | "hashtags">) => {
    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateSet(editing.id, data);
        setSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast({ title: "Set updated", description: `"${data.name}" saved.` });
      } else {
        const created = await createSet(data);
        setSets((prev) => [...prev, created]);
        toast({ title: "Set created", description: `"${data.name}" added to your library.` });
      }
      setDialogOpen(false);
      setEditing(undefined);
    } catch {
      toast({ title: "Failed to save hashtag set", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = sets.find((s) => s.id === deleteId);
    setIsDeleting(true);
    try {
      await deleteSet(deleteId);
      setSets((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
      toast({ title: "Set deleted", description: target ? `"${target.name}" removed.` : "" });
    } catch {
      toast({ title: "Failed to delete hashtag set", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = search
    ? sets.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.hashtags.some((t) => t.includes(search.toLowerCase()))
      )
    : sets;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hashtag Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Save and organise hashtag sets for quick reuse across platforms.
          </p>
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Set
        </Button>
      </div>

      <Input
        placeholder="Search sets or hashtags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Hash className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {sets.length === 0 ? "No hashtag sets yet. Create your first one." : "No sets match your search."}
          </p>
          {sets.length === 0 && (
            <Button variant="outline" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
              Create a set
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((set) => (
            <Card key={set.id} className="flex flex-col">
              <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{set.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {set.hashtags.length} hashtag{set.hashtags.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditing(set); setDialogOpen(true); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(set.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1">
                {set.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {set.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} showText={true} className="text-xs py-0.5" />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {set.hashtags.slice(0, 12).map((t) => (
                    <HashtagChip key={t} tag={t} />
                  ))}
                  {set.hashtags.length > 12 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{set.hashtags.length - 12} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SetDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && !isDeleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hashtag set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the set. Hashtags already added to posts won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
