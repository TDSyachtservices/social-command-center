---
name: Vite "Invalid hook call" after adding a Radix/React dep
description: New dependency optimized on the fly by Vite can load a duplicate React and crash components
---

When a new package that depends on React (e.g. a `@radix-ui/*` component) is imported for the
first time, Vite optimizes it on the fly and logs `✨ new dependencies optimized` +
`optimized dependencies changed. reloading`. Immediately after, the just-added component can
throw `Invalid hook call` / `Cannot read properties of null (reading 'useMemo')` (a second React
copy is briefly in play).

**Why:** The HMR session is running a half-reloaded bundle with two React instances. The error is
NOT in your code.

**How to apply:** Restart the artifact's dev workflow (`restart_workflow <slug>`) so Vite
re-optimizes cleanly with a single React copy, then hard-refresh the preview. If the user is
viewing through the canvas iframe, that iframe holds its own session and must also be reloaded —
a hard-refresh of the main preview pane does not refresh it.
