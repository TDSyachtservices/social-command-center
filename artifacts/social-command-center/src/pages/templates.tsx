import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  type ApiTemplate,
} from "@/lib/api";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const POST_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  album: "Album / Carousel",
  story: "Story",
  reel: "Reel",
  event: "Event",
};

interface TemplateFormState {
  name: string;
  description: string;
}

function TemplateDialog({
  open,
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  initial?: ApiTemplate;
  onClose: () => void;
  onSave: (data: TemplateFormState) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<TemplateFormState>({ name: "", description: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        description: initial?.description ?? "",
      });
    }
  }, [open, initial]);

  const canSave = !isSaving && form.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template Name <span className="text-destructive">*</span></label>
            <Input
              placeholder='e.g. "Weekly Product Showcase"'
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <Textarea
              placeholder="Describe when to use this template…"
              className="min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button disabled={!canSave} onClick={() => onSave(form)}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {initial ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUse,
}: {
  template: ApiTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const platforms = template.platforms ?? [];
  const hashtagCount = template.hashtagsJson
    ? Object.values(template.hashtagsJson).flat().length
    : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{template.name}</p>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {POST_TYPE_LABELS[template.postType] ?? template.postType}
          </span>
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} showText={false} className="border-none bg-transparent p-0 w-4 h-4" />
          ))}
          {platforms.length > 0 && (
            <span className="text-xs text-muted-foreground">{platforms.join(", ")}</span>
          )}
        </div>

        {template.masterCaption && (
          <p className="text-xs text-muted-foreground italic line-clamp-3 border-l-2 border-muted pl-2">
            {template.masterCaption}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {hashtagCount > 0 && (
            <span>{hashtagCount} hashtag{hashtagCount !== 1 ? "s" : ""}</span>
          )}
        </div>

        <Button size="sm" variant="outline" className="mt-auto gap-2 w-full" onClick={onUse}>
          <FileStack className="w-3.5 h-3.5" />
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Templates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTemplate | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listTemplates()
      .then((data) => setTemplates(data ?? []))
      .catch(() => toast({ title: "Failed to load templates", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (form: TemplateFormState) => {
    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateTemplate(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
        if (updated) {
          setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          toast({ title: "Template updated", description: `"${form.name}" saved.` });
          setDialogOpen(false);
          setEditing(undefined);
        } else {
          toast({ title: "Failed to update template", variant: "destructive" });
        }
      } else {
        const created = await createTemplate({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          postType: "standard",
          platforms: [],
          masterCaption: "",
        });
        if (created) {
          setTemplates((prev) => [...prev, created]);
          toast({ title: "Template created", description: `"${form.name}" added.` });
          setDialogOpen(false);
        } else {
          toast({ title: "Failed to create template", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = templates.find((t) => t.id === deleteId);
    setIsDeleting(true);
    try {
      const ok = await deleteTemplate(deleteId);
      if (ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
        toast({ title: "Template deleted", description: target ? `"${target.name}" removed.` : "" });
      } else {
        toast({ title: "Failed to delete template", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUse = (template: ApiTemplate) => {
    setLocation(`/create-post?template=${template.id}`);
  };

  const filtered = search
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : templates;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Post Templates</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Save post structures for quick reuse. Templates capture platforms, captions, and hashtags.
          </p>
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      <Input
        placeholder="Search templates…"
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
          <LayoutTemplate className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {templates.length === 0
              ? "No templates yet. Create one, or save from the Post Composer."
              : "No templates match your search."}
          </p>
          {templates.length === 0 && (
            <Button variant="outline" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
              Create a template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => { setEditing(template); setDialogOpen(true); }}
              onDelete={() => setDeleteId(template.id)}
              onUse={() => handleUse(template)}
            />
          ))}
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && !isDeleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the template. Posts created from it are not affected.
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
