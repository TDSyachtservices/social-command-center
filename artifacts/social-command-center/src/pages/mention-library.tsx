import { useState, useEffect } from "react";
import { AtSign, Plus, Pencil, Trash2, X, Check, AlertTriangle, Loader2, Users, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  loadContacts, createContact, updateContact, deleteContact,
  loadGroups, createGroup, updateGroup, deleteGroup,
  validateHandle, contactHasHandle, getCategories, MENTION_RULES,
  type MentionContact, type MentionGroup,
} from "@/lib/mentionStore";
import { PlatformBadge } from "@/components/shared/PlatformBadge";

const ALL_PLATFORMS = ["Facebook", "Instagram", "LinkedIn"];

// ─── Shared sub-components ────────────────────────────────────────────────────

function PlatformToggle({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
  const toggle = (p: string) =>
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PLATFORMS.map((p) => (
        <button key={p} type="button" onClick={() => toggle(p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
            selected.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
          }`}>
          <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
          {p}
          {selected.includes(p) && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );
}

function CompletenessIndicator({ contact }: { contact: MentionContact }) {
  return (
    <div className="flex gap-1">
      {ALL_PLATFORMS.map((p) => {
        const has = contactHasHandle(contact, p);
        return (
          <div key={p} title={has ? `${p}: ${p === "LinkedIn" && contact.linkedinUrn ? contact.linkedinUrn : (contact.handles as Record<string,string>)[p]}` : `${p}: no handle saved`}
            className={`w-2 h-2 rounded-full ${has ? "bg-green-500" : "bg-muted-foreground/25"}`} />
        );
      })}
    </div>
  );
}

// ─── Contact dialog ───────────────────────────────────────────────────────────

interface ContactFormState {
  displayName: string;
  category: string;
  platforms: string[];
  handles: Partial<Record<string, string>>;
  linkedinUrn: string;
  errors: Partial<Record<string, string>>;
}

const emptyContactForm = (): ContactFormState => ({ displayName: "", category: "", platforms: [], handles: {}, linkedinUrn: "", errors: {} });

function ContactDialog({ open, initial, existingCategories, onClose, onSave, isSaving }: {
  open: boolean; initial?: MentionContact; existingCategories: string[];
  onClose: () => void; onSave: (data: Omit<MentionContact, "id" | "createdAt" | "updatedAt">) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState<ContactFormState>(emptyContactForm());

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { displayName: initial.displayName, category: initial.category, platforms: initial.platforms,
            handles: { ...(initial.handles as Record<string, string>) }, linkedinUrn: initial.linkedinUrn ?? "", errors: {} }
        : emptyContactForm());
    }
  }, [open, initial]);

  const setHandle = (platform: string, value: string) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: value }, errors: { ...f.errors, [platform]: undefined } }));

  const togglePlatform = (p: string) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));

  const validate = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    for (const p of form.platforms) {
      if (p === "LinkedIn" && form.linkedinUrn.trim()) continue;
      const h = form.handles[p] ?? "";
      if (!h.trim()) { errors[p] = `Handle required for ${p}`; }
      else { const err = validateHandle(h, p); if (err) errors[p] = err; }
    }
    setForm((f) => ({ ...f, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ displayName: form.displayName.trim(), category: form.category.trim(),
      platforms: form.platforms, handles: form.handles,
      linkedinUrn: form.linkedinUrn.trim() || null });
  };

  const canSave = !isSaving && form.displayName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Contact" : "New Mention Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Display Name <span className="text-destructive">*</span></label>
            <Input placeholder='"Marine Partners" or "John Smith"' value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category / Group</label>
            <Input placeholder="Partners, Influencers, Team" value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} list="existing-categories" />
            <datalist id="existing-categories">{existingCategories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                    form.platforms.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  }`}>
                  <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                  {p}
                  {form.platforms.includes(p) && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
          {form.platforms.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Platform Handles</label>
              {form.platforms.map((p) => {
                const rule = MENTION_RULES[p];
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{p}</span>
                      <Input placeholder={rule?.formatHint ?? "@handle"} value={form.handles[p] ?? ""}
                        onChange={(e) => setHandle(p, e.target.value)}
                        className={`h-8 text-sm ${form.errors[p] ? "border-destructive" : ""}`} />
                    </div>
                    {form.errors[p] && <p className="text-xs text-destructive ml-[calc(1rem+5.5rem)]">{form.errors[p]}</p>}
                    {rule && !form.errors[p] && <p className="text-xs text-muted-foreground ml-[calc(1rem+5.5rem)]">{rule.formatHint}</p>}
                  </div>
                );
              })}
            </div>
          )}
          {form.platforms.includes("LinkedIn") && (
            <div className="space-y-1.5 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" /> LinkedIn URN <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input placeholder="urn:li:person:123456 or urn:li:organization:789"
                value={form.linkedinUrn}
                onChange={(e) => setForm((f) => ({ ...f, linkedinUrn: e.target.value }))}
                className="h-8 text-xs font-mono" />
              <p className="text-xs text-muted-foreground">
                LinkedIn URNs enable structured tagging. Find it via the LinkedIn API or your admin portal.
                If set, it takes priority over the @handle for LinkedIn posts.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            {initial ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Group dialog ─────────────────────────────────────────────────────────────

function GroupDialog({ open, initial, contacts, onClose, onSave, isSaving }: {
  open: boolean; initial?: MentionGroup; contacts: MentionContact[];
  onClose: () => void; onSave: (data: Omit<MentionGroup, "id" | "createdAt" | "updatedAt">) => void; isSaving: boolean;
}) {
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPlatforms(initial?.platforms ?? []);
      setContactIds(initial?.contactIds ?? []);
      setSearch("");
    }
  }, [open, initial]);

  const toggleContact = (id: string) =>
    setContactIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = search
    ? contacts.filter((c) => c.displayName.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const canSave = !isSaving && name.trim().length > 0 && contactIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{initial ? "Edit Group" : "New Mention Group"}</DialogTitle>
        </DialogHeader>
        <div className="px-5 space-y-4 flex-1 overflow-y-auto pb-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Group Name <span className="text-destructive">*</span></label>
            <Input placeholder='e.g. "Marine Partners" or "Key Influencers"' value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Platforms</label>
            <PlatformToggle selected={platforms} onChange={setPlatforms} />
            <p className="text-xs text-muted-foreground">Which platforms this group will be mentioned on.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Members <span className="text-xs font-normal text-muted-foreground">({contactIds.length} selected)</span></label>
            <Input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No contacts in library yet. Add contacts first.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {filtered.map((c) => {
                  const selected = contactIds.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleContact(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.displayName}</p>
                        {c.category && <p className="text-xs text-muted-foreground">{c.category}</p>}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {ALL_PLATFORMS.map((p) => contactHasHandle(c, p) && (
                          <PlatformBadge key={p} platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                        ))}
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No contacts match your search.</p>}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="px-5 py-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button disabled={!canSave} onClick={() => onSave({ name: name.trim(), platforms, contactIds })}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            {initial ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MentionLibrary() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"contacts" | "groups">("contacts");

  // Contacts state
  const [contacts, setContacts] = useState<MentionContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MentionContact | undefined>();
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Groups state
  const [groups, setGroups] = useState<MentionGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MentionGroup | undefined>();
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  useEffect(() => {
    loadContacts()
      .then(setContacts)
      .catch(() => toast({ title: "Failed to load contacts", variant: "destructive" }))
      .finally(() => setIsLoadingContacts(false));
    loadGroups()
      .then(setGroups)
      .catch(() => toast({ title: "Failed to load groups", variant: "destructive" }))
      .finally(() => setIsLoadingGroups(false));
  }, []);

  const categories = getCategories(contacts);

  // ─── Contact handlers ───────────────────────────────────────────────────────
  const handleSaveContact = async (data: Omit<MentionContact, "id" | "createdAt" | "updatedAt">) => {
    setIsSavingContact(true);
    try {
      if (editingContact) {
        const updated = await updateContact(editingContact.id, data);
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast({ title: "Contact updated", description: `"${data.displayName}" saved.` });
      } else {
        const created = await createContact(data);
        setContacts((prev) => [...prev, created]);
        toast({ title: "Contact added", description: `"${data.displayName}" added to your library.` });
      }
      setContactDialogOpen(false);
      setEditingContact(undefined);
    } catch {
      toast({ title: "Failed to save contact", variant: "destructive" });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    const target = contacts.find((c) => c.id === deleteContactId);
    setIsDeletingContact(true);
    try {
      await deleteContact(deleteContactId);
      setContacts((prev) => prev.filter((c) => c.id !== deleteContactId));
      setDeleteContactId(null);
      toast({ title: "Contact deleted", description: target ? `"${target.displayName}" removed.` : "" });
    } catch {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    } finally {
      setIsDeletingContact(false);
    }
  };

  // ─── Group handlers ─────────────────────────────────────────────────────────
  const handleSaveGroup = async (data: Omit<MentionGroup, "id" | "createdAt" | "updatedAt">) => {
    setIsSavingGroup(true);
    try {
      if (editingGroup) {
        const updated = await updateGroup(editingGroup.id, data);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        toast({ title: "Group updated", description: `"${data.name}" saved.` });
      } else {
        const created = await createGroup(data);
        setGroups((prev) => [...prev, created]);
        toast({ title: "Group created", description: `"${data.name}" ready to use in posts.` });
      }
      setGroupDialogOpen(false);
      setEditingGroup(undefined);
    } catch {
      toast({ title: "Failed to save group", variant: "destructive" });
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    const target = groups.find((g) => g.id === deleteGroupId);
    setIsDeletingGroup(true);
    try {
      await deleteGroup(deleteGroupId);
      setGroups((prev) => prev.filter((g) => g.id !== deleteGroupId));
      setDeleteGroupId(null);
      toast({ title: "Group deleted", description: target ? `"${target.name}" removed.` : "" });
    } catch {
      toast({ title: "Failed to delete group", variant: "destructive" });
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // ─── Filtered contacts ──────────────────────────────────────────────────────
  const filteredContacts = contacts.filter((c) => {
    const matchSearch = !search || c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      Object.values(c.handles as Record<string, string>).some((h) => h?.toLowerCase().includes(search.toLowerCase())) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || c.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const groupedContacts: Record<string, MentionContact[]> = {};
  for (const c of filteredContacts) {
    const cat = c.category || "Uncategorised";
    (groupedContacts[cat] ??= []).push(c);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mention Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Save contacts and groups for quick @mentioning across platforms.
          </p>
        </div>
        {tab === "contacts" ? (
          <Button onClick={() => { setEditingContact(undefined); setContactDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Contact
          </Button>
        ) : (
          <Button onClick={() => { setEditingGroup(undefined); setGroupDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Group
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["contacts", "groups"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "contacts" ? `Contacts (${contacts.length})` : `Groups (${groups.length})`}
          </button>
        ))}
      </div>

      {/* ── CONTACTS TAB ───────────────────────────────────────────────────── */}
      {tab === "contacts" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Search contacts or handles…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setFilterCategory("")}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                    !filterCategory ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}>All</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setFilterCategory(cat === filterCategory ? "" : cat)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                      filterCategory === cat ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>{cat}</button>
                ))}
              </div>
            )}
          </div>

          {isLoadingContacts ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <AtSign className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">{contacts.length === 0 ? "No contacts yet. Add your first one." : "No contacts match your search."}</p>
              {contacts.length === 0 && (
                <Button variant="outline" onClick={() => { setEditingContact(undefined); setContactDialogOpen(true); }}>Add a contact</Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedContacts).sort(([a], [b]) => a.localeCompare(b)).map(([category, group]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</h2>
                    <Badge variant="secondary" className="text-xs">{group.length}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((contact) => (
                      <Card key={contact.id} className="flex flex-col">
                        <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{contact.displayName}</p>
                              <CompletenessIndicator contact={contact} />
                            </div>
                            {contact.category && <p className="text-xs text-muted-foreground mt-0.5">{contact.category}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditingContact(contact); setContactDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteContactId(contact.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5 flex-1">
                          {ALL_PLATFORMS.map((p) => {
                            const handle = (contact.handles as Record<string, string>)[p];
                            const onPlatform = contact.platforms.includes(p);
                            if (!onPlatform) return null;
                            const displayHandle = p === "LinkedIn" && contact.linkedinUrn ? contact.linkedinUrn : handle;
                            return (
                              <div key={p} className="flex items-center gap-2">
                                <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3.5 h-3.5 shrink-0" />
                                {displayHandle ? (
                                  <span className="text-xs font-mono text-foreground truncate">{displayHandle}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> No handle saved
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {contact.linkedinUrn && !contact.platforms.includes("LinkedIn") && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Link className="w-2.5 h-2.5" /> URN saved
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── GROUPS TAB ────────────────────────────────────────────────────── */}
      {tab === "groups" && (
        <>
          {isLoadingGroups ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Users className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No groups yet. Create a group to mention multiple people at once.</p>
              <Button variant="outline" onClick={() => { setEditingGroup(undefined); setGroupDialogOpen(true); }}>Create a group</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                const members = contacts.filter((c) => group.contactIds.includes(c.id));
                return (
                  <Card key={group.id} className="flex flex-col">
                    <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="font-semibold truncate">{group.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {members.length} member{members.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditingGroup(group); setGroupDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteGroupId(group.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 flex-1">
                      {group.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {group.platforms.map((p) => <PlatformBadge key={p} platform={p} showText={true} className="text-[10px] py-0" />)}
                        </div>
                      )}
                      <div className="space-y-1">
                        {members.slice(0, 4).map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{m.displayName}</span>
                          </div>
                        ))}
                        {members.length > 4 && (
                          <p className="text-xs text-muted-foreground ml-3">+{members.length - 4} more</p>
                        )}
                        {members.length === 0 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No valid contacts found
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ContactDialog open={contactDialogOpen} initial={editingContact} existingCategories={categories}
        onClose={() => { setContactDialogOpen(false); setEditingContact(undefined); }}
        onSave={handleSaveContact} isSaving={isSavingContact} />

      <GroupDialog open={groupDialogOpen} initial={editingGroup} contacts={contacts}
        onClose={() => { setGroupDialogOpen(false); setEditingGroup(undefined); }}
        onSave={handleSaveGroup} isSaving={isSavingGroup} />

      <AlertDialog open={!!deleteContactId} onOpenChange={(o) => !o && !isDeletingContact && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the contact from your library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingContact}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} disabled={isDeletingContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingContact && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={(o) => !o && !isDeletingGroup && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the group. Individual contacts won't be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingGroup}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} disabled={isDeletingGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingGroup && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
