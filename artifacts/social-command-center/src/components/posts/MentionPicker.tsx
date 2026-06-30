import { useState, useEffect } from "react";
import { AtSign, Plus, X, Search, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import {
  loadContacts, loadGroups, contactHasHandle, getCategories,
  resolveGroupHandles, MENTION_RULES,
  type MentionContact, type MentionGroup,
} from "@/lib/mentionStore";

interface MentionPickerProps {
  platforms: string[];
  platformMentions: Record<string, string[]>;
  onChange: (platform: string, handles: string[]) => void;
}

export function MentionChip({ handle, warning, onRemove }: {
  handle: string; warning?: string; onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
      {warning ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              {handle}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">{warning}</TooltipContent>
        </Tooltip>
      ) : handle}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-destructive transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function MentionPicker({ platforms, platformMentions, onChange }: MentionPickerProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<MentionContact[]>([]);
  const [groups, setGroups] = useState<MentionGroup[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"contacts" | "groups">("contacts");
  const [activePlatform, setActivePlatform] = useState(platforms[0] ?? "");

  useEffect(() => {
    if (open) {
      loadContacts().then(setContacts).catch(() => {});
      loadGroups().then(setGroups).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(activePlatform)) {
      setActivePlatform(platforms[0]);
    }
  }, [platforms]);

  const currentHandles = platformMentions[activePlatform] ?? [];
  const rules = MENTION_RULES[activePlatform];

  const addHandle = (handle: string) => {
    if (!handle.trim() || currentHandles.includes(handle)) return;
    onChange(activePlatform, [...currentHandles, handle]);
  };

  const removeHandle = (handle: string) =>
    onChange(activePlatform, currentHandles.filter((h) => h !== handle));

  const addContact = (contact: MentionContact) => {
    const handle = activePlatform === "LinkedIn" && contact.linkedinUrn
      ? contact.linkedinUrn
      : (contact.handles as Record<string, string>)[activePlatform];
    if (handle) addHandle(handle);
  };

  const addGroup = (group: MentionGroup) => {
    const handles = resolveGroupHandles(group, contacts, activePlatform);
    const newHandles = handles.filter((h) => !currentHandles.includes(h));
    if (newHandles.length > 0) onChange(activePlatform, [...currentHandles, ...newHandles]);
  };

  const categories = getCategories(contacts);

  const filteredContacts = search
    ? contacts.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(c.handles as Record<string, string>).some((h) => h?.toLowerCase().includes(search.toLowerCase())) ||
        c.category.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const groupedContacts: Record<string, MentionContact[]> = {};
  for (const c of filteredContacts) {
    const cat = c.category || "Uncategorised";
    (groupedContacts[cat] ??= []).push(c);
  }

  const totalMentions = platforms.reduce((n, p) => n + (platformMentions[p]?.length ?? 0), 0);
  const overHard = rules?.hardLimit != null && currentHandles.length > rules.hardLimit;
  const overSoft = rules?.softLimit != null && currentHandles.length > rules.softLimit && !overHard;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <AtSign className="w-4 h-4" /> Mentions
          {totalMentions > 0 && <Badge variant="secondary" className="text-xs">{totalMentions}</Badge>}
        </label>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Browse Contacts
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
            <SheetHeader className="px-5 py-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <AtSign className="w-4 h-4" /> Mention Library
              </SheetTitle>
            </SheetHeader>

            {/* Platform selector */}
            {platforms.length > 1 && (
              <div className="px-5 pt-3 pb-2 border-b">
                <p className="text-xs text-muted-foreground mb-2">Adding mentions for:</p>
                <div className="flex gap-2 flex-wrap">
                  {platforms.map((p) => (
                    <button key={p} onClick={() => setActivePlatform(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        activePlatform === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}>
                      <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                      {p}
                      {(platformMentions[p]?.length ?? 0) > 0 && (
                        <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-bold">
                          {platformMentions[p]!.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Platform tip */}
            {rules && (
              <div className="px-5 py-2.5 border-b bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{activePlatform}:</span> {rules.tip}
                </p>
              </div>
            )}

            {/* Contacts / Groups tabs */}
            <div className="flex border-b px-5">
              {(["contacts", "groups"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors -mb-px ${
                    tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {t === "contacts" ? `Contacts (${contacts.length})` : `Groups (${groups.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={tab === "contacts" ? "Search contacts…" : "Search groups…"}
                    value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm pl-8" />
                </div>
              </div>

              {/* ── Contacts tab ── */}
              {tab === "contacts" && (
                contacts.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <AtSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No contacts saved yet. Add some in the Mention Library.</p>
                  </div>
                ) : (
                  <div className="px-5 pb-4 space-y-4">
                    {Object.entries(groupedContacts).sort(([a], [b]) => a.localeCompare(b)).map(([category, group]) => {
                      const groupCanAdd = group.filter((c) => contactHasHandle(c, activePlatform));
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</span>
                              <span className="text-[10px] text-muted-foreground">({group.length})</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {group.map((contact) => {
                              const handle = activePlatform === "LinkedIn" && contact.linkedinUrn
                                ? contact.linkedinUrn
                                : (contact.handles as Record<string, string>)[activePlatform];
                              const hasHandle = contactHasHandle(contact, activePlatform);
                              const alreadyAdded = handle ? currentHandles.includes(handle) : false;
                              return (
                                <div key={contact.id}
                                  className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-colors ${
                                    alreadyAdded ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-transparent"
                                  }`}>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{contact.displayName}</p>
                                    {hasHandle ? (
                                      <p className="text-xs font-mono text-muted-foreground truncate">{handle}</p>
                                    ) : (
                                      <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> No {activePlatform} handle
                                      </p>
                                    )}
                                  </div>
                                  <Button size="sm" variant={alreadyAdded ? "secondary" : "outline"}
                                    className="h-7 text-xs gap-1 shrink-0" disabled={!hasHandle || alreadyAdded}
                                    onClick={() => handle && addHandle(handle)}>
                                    {alreadyAdded ? <><X className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Add</>}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {filteredContacts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No contacts match your search.</p>
                    )}
                  </div>
                )
              )}

              {/* ── Groups tab ── */}
              {tab === "groups" && (
                groups.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No groups yet. Create groups in the Mention Library.</p>
                  </div>
                ) : (
                  <div className="px-5 pb-4 space-y-2">
                    {filteredGroups.map((group) => {
                      const handles = resolveGroupHandles(group, contacts, activePlatform);
                      const alreadyAdded = handles.length > 0 && handles.every((h) => currentHandles.includes(h));
                      const partial = !alreadyAdded && handles.some((h) => currentHandles.includes(h));
                      return (
                        <div key={group.id}
                          className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                            alreadyAdded ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-transparent"
                          }`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <p className="text-sm font-medium truncate">{group.name}</p>
                              {partial && <Badge variant="outline" className="text-[10px] py-0">Partial</Badge>}
                            </div>
                            {handles.length > 0 ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {handles.length} handle{handles.length !== 1 ? "s" : ""} for {activePlatform}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> No {activePlatform} handles in this group
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant={alreadyAdded ? "secondary" : "outline"}
                            className="h-7 text-xs gap-1 shrink-0 mt-0.5"
                            disabled={handles.length === 0 || alreadyAdded}
                            onClick={() => addGroup(group)}>
                            {alreadyAdded ? <><X className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Add all</>}
                          </Button>
                        </div>
                      );
                    })}
                    {filteredGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No groups match your search.</p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Current handles footer */}
            {currentHandles.length > 0 && (
              <div className="px-5 py-3 border-t bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Added for {activePlatform} ({currentHandles.length}{rules?.hardLimit ? `/${rules.hardLimit}` : rules?.softLimit ? `, recommended ≤${rules.softLimit}` : ""}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentHandles.map((h) => <MentionChip key={h} handle={h} onRemove={() => removeHandle(h)} />)}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Platform switcher */}
      {platforms.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {platforms.map((p) => {
            const count = platformMentions[p]?.length ?? 0;
            const pRules = MENTION_RULES[p];
            const over = (pRules?.hardLimit != null && count > pRules.hardLimit) || (pRules?.softLimit != null && count > pRules.softLimit);
            return (
              <button key={p} onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
                  activePlatform === p ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"
                }`}>
                <PlatformBadge platform={p} showText={false} className="border-none bg-transparent p-0 w-3 h-3" />
                {p}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${over ? "bg-amber-100 text-amber-700" : "bg-primary/20 text-primary"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(overHard || overSoft) && (
        <div className={`flex items-start gap-2 text-xs rounded-md p-2.5 border ${
          overHard ? "text-destructive bg-destructive/5 border-destructive/20"
            : "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{rules?.tip}</span>
        </div>
      )}

      {currentHandles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900">
          {currentHandles.map((h) => <MentionChip key={h} handle={h} onRemove={() => removeHandle(h)} />)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No mentions added for {platforms.length > 1 ? activePlatform : "this post"} yet.
        </p>
      )}
    </div>
  );
}
