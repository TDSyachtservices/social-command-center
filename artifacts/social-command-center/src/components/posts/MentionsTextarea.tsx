import { useEffect, useRef, useState } from "react";
import { MentionsInput, Mention, type SuggestionDataItem } from "react-mentions";
import { cn } from "@/lib/utils";
import { loadContacts, contactHasHandle, getHandleForPlatform, type MentionContact } from "@/lib/mentionStore";

interface MentionsTextareaProps {
  platform: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// react-mentions keeps its own "raw" value internally (markup like
// `@[handle](handle)`) so it can re-locate mention boundaries while editing.
// We only ever expose the *plain* text version to the rest of the app (it's
// what gets published to the platform and what the char counters use), so we
// mirror the plain text back up on every change and keep the markup buffer
// purely local to this component.
export function MentionsTextarea({ platform, value, onChange, placeholder, className }: MentionsTextareaProps) {
  const [rawValue, setRawValue] = useState(value);
  const lastPlainRef = useRef(value);

  // If the plain-text value changes from *outside* this component (tab
  // switch, "Use Master Caption", programmatic reset), resync our internal
  // markup buffer. Selecting a mention here won't retroactively re-highlight
  // in that case, but the text itself is always correct.
  useEffect(() => {
    if (value !== lastPlainRef.current) {
      setRawValue(value);
      lastPlainRef.current = value;
    }
  }, [value]);

  const fetchMentions = (query: string, callback: (data: SuggestionDataItem[]) => void) => {
    // An empty query means the user just typed the trigger "@" and hasn't
    // narrowed it down yet — show every eligible contact instead of nothing,
    // matching the "type @ and see a dropdown immediately" expectation.
    loadContacts()
      .then((contacts: MentionContact[]) => {
        const q = query.toLowerCase();
        const matches = contacts
          .filter((c) => contactHasHandle(c, platform))
          .filter(
            (c) =>
              !q ||
              c.displayName.toLowerCase().includes(q) ||
              (getHandleForPlatform(c, platform) ?? "").toLowerCase().includes(q)
          )
          .map((c) => {
            const handle = getHandleForPlatform(c, platform) ?? "";
            return { id: handle, display: `${c.displayName} (${handle})` };
          });
        callback(matches);
      })
      .catch(() => callback([]));
  };

  return (
    <MentionsInput
      value={rawValue}
      onChange={(_e, newValue, newPlainTextValue) => {
        setRawValue(newValue);
        lastPlainRef.current = newPlainTextValue;
        onChange(newPlainTextValue);
      }}
      placeholder={placeholder}
      allowSuggestionsAboveCursor
      className={cn("mentions-textarea", className)}
      style={mentionsInputStyle}
      a11ySuggestionsListLabel="Mention suggestions"
    >
      <Mention
        trigger="@"
        data={fetchMentions}
        markup="@[__display__](__id__)"
        displayTransform={(id) => `@${id.replace(/^@/, "")}`}
        appendSpaceOnAdd
        style={{ backgroundColor: "hsl(var(--accent) / 0.18)", borderRadius: 3 }}
        renderSuggestion={(suggestion) => (
          <div className="px-3 py-2 text-sm">
            <span className="font-medium">{String(suggestion.display ?? "").replace(/\s*\(.*\)$/, "")}</span>
            <span className="ml-1.5 text-xs font-mono text-muted-foreground">{suggestion.id}</span>
          </div>
        )}
      />
    </MentionsInput>
  );
}

// react-mentions doesn't ship CSS — every sub-element is styled via this
// plain object (camelCase keys map to `control`, `input`, `highlighter`,
// `suggestions`, etc). Matches the shadcn Textarea look.
const mentionsInputStyle = {
  control: {
    fontSize: 14,
    fontWeight: "normal",
    minHeight: 120,
  },
  highlighter: {
    padding: "8px 12px",
    minHeight: 120,
    border: "1px solid transparent",
  },
  input: {
    padding: "8px 12px",
    minHeight: 120,
    border: "1px solid hsl(var(--input))",
    borderRadius: 6,
    outline: "none",
    background: "transparent",
  },
  suggestions: {
    list: {
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--popover-border))",
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      fontSize: 14,
      maxHeight: 220,
      overflowY: "auto" as const,
    },
    item: {
      borderBottom: "1px solid hsl(var(--border))",
      "&focused": {
        backgroundColor: "hsl(var(--muted))",
      },
    },
  },
};
