export interface HashtagSet {
  id: string;
  name: string;
  platforms: string[];
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
}

const BASE = "/api/hashtag-sets";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data as T;
}

export async function loadSets(): Promise<HashtagSet[]> {
  return apiFetch<HashtagSet[]>(BASE);
}

export async function createSet(
  data: Pick<HashtagSet, "name" | "platforms" | "hashtags">
): Promise<HashtagSet> {
  return apiFetch<HashtagSet>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSet(
  id: string,
  data: Pick<HashtagSet, "name" | "platforms" | "hashtags">
): Promise<HashtagSet> {
  return apiFetch<HashtagSet>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSet(id: string): Promise<void> {
  await apiFetch<HashtagSet>(`${BASE}/${id}`, { method: "DELETE" });
}

// ─── Validation helpers (unchanged) ─────────────────────────────────────────

export const HASHTAG_RULES: Record<
  string,
  { hardLimit?: number; softLimit?: number; tip: string }
> = {
  Instagram: {
    hardLimit: 30,
    tip: "Instagram allows a maximum of 30 hashtags per post.",
  },
  Facebook: {
    softLimit: 5,
    tip: "Fewer hashtags perform better on Facebook. Stick to 3–5.",
  },
  LinkedIn: {
    softLimit: 5,
    tip: "Keep hashtags professional and industry-relevant on LinkedIn.",
  },
};

export function validateHashtag(tag: string): string | null {
  if (!tag.startsWith("#")) return "Hashtag must start with #";
  if (/\s/.test(tag)) return "Hashtag cannot contain spaces";
  if (!/^#[\w]+$/.test(tag)) return "Only letters, numbers, and underscores allowed";
  return null;
}

export function parseHashtags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .filter((t) => t.length > 1 && !validateHashtag(t));
}
