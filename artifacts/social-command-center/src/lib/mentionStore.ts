// ─── Contact ──────────────────────────────────────────────────────────────────
export interface MentionContact {
  id: string;
  displayName: string;
  handles: Partial<Record<string, string>>;
  platforms: string[];
  category: string;
  linkedinUrn?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Group ────────────────────────────────────────────────────────────────────
export interface MentionGroup {
  id: string;
  name: string;
  contactIds: string[];
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── API fetch helper ─────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data as T;
}

// ─── Contact API ──────────────────────────────────────────────────────────────
const CONTACTS_BASE = "/api/mention-contacts";

export async function loadContacts(): Promise<MentionContact[]> {
  return apiFetch<MentionContact[]>(CONTACTS_BASE);
}

export async function createContact(
  data: Omit<MentionContact, "id" | "createdAt" | "updatedAt">
): Promise<MentionContact> {
  return apiFetch<MentionContact>(CONTACTS_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateContact(
  id: string,
  data: Omit<MentionContact, "id" | "createdAt" | "updatedAt">
): Promise<MentionContact> {
  return apiFetch<MentionContact>(`${CONTACTS_BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch<MentionContact>(`${CONTACTS_BASE}/${id}`, { method: "DELETE" });
}

// ─── Group API ────────────────────────────────────────────────────────────────
const GROUPS_BASE = "/api/mention-groups";

export async function loadGroups(): Promise<MentionGroup[]> {
  return apiFetch<MentionGroup[]>(GROUPS_BASE);
}

export async function createGroup(
  data: Omit<MentionGroup, "id" | "createdAt" | "updatedAt">
): Promise<MentionGroup> {
  return apiFetch<MentionGroup>(GROUPS_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGroup(
  id: string,
  data: Omit<MentionGroup, "id" | "createdAt" | "updatedAt">
): Promise<MentionGroup> {
  return apiFetch<MentionGroup>(`${GROUPS_BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(id: string): Promise<void> {
  await apiFetch<MentionGroup>(`${GROUPS_BASE}/${id}`, { method: "DELETE" });
}

// ─── Mention resolver ─────────────────────────────────────────────────────────
/**
 * Resolve a group to the handles that should be inserted for a given platform.
 * For LinkedIn, prefer the linkedinUrn if available (returned as a tagged string).
 */
export function resolveGroupHandles(
  group: MentionGroup,
  contacts: MentionContact[],
  platform: string
): string[] {
  const members = contacts.filter((c) => group.contactIds.includes(c.id));
  return members
    .map((c) => {
      if (platform === "LinkedIn" && c.linkedinUrn) return c.linkedinUrn;
      return (c.handles as Record<string, string>)[platform] ?? null;
    })
    .filter((h): h is string => !!h && h.trim().length > 0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getCategories(contacts: MentionContact[]): string[] {
  return [...new Set(contacts.map((c) => c.category).filter(Boolean))].sort();
}

export interface MentionRule {
  hardLimit?: number;
  softLimit?: number;
  tip: string;
  formatHint: string;
  validate: (handle: string) => string | null;
}

export const MENTION_RULES: Record<string, MentionRule> = {
  Instagram: {
    softLimit: 20,
    tip: "Instagram mentions only work for public accounts or mutual followers. Exceeding 20 may reduce reach.",
    formatHint: "@username",
    validate: (h) => {
      if (!h.startsWith("@")) return "Handle must start with @";
      if (!/^@[\w.]+$/.test(h)) return "Instagram handles can only contain letters, numbers, dots, and underscores";
      return null;
    },
  },
  Facebook: {
    softLimit: 10,
    tip: "Personal profile mentions only work if they follow your page. Pages can always be mentioned freely.",
    formatHint: "@Name or @Page Name",
    validate: (h) => (h.startsWith("@") ? null : "Handle must start with @"),
  },
  LinkedIn: {
    hardLimit: 25,
    tip: "LinkedIn allows up to 25 mentions. For best results, save the LinkedIn URN on each contact.",
    formatHint: "@FirstName LastName",
    validate: (h) => (h.startsWith("@") || h.startsWith("urn:li:") ? null : "Handle must start with @ or be a URN"),
  },
};

export function validateHandle(handle: string, platform: string): string | null {
  if (!handle.trim()) return "Handle cannot be empty";
  const rule = MENTION_RULES[platform];
  if (rule) return rule.validate(handle.trim());
  if (!handle.startsWith("@")) return "Handle must start with @";
  return null;
}

export function getHandleForPlatform(contact: MentionContact, platform: string): string | null {
  if (platform === "LinkedIn" && contact.linkedinUrn) return contact.linkedinUrn;
  return (contact.handles as Record<string, string>)[platform] ?? null;
}

export function contactHasHandle(contact: MentionContact, platform: string): boolean {
  if (platform === "LinkedIn" && contact.linkedinUrn) return true;
  const h = (contact.handles as Record<string, string>)[platform];
  return !!h && h.trim().length > 0;
}
