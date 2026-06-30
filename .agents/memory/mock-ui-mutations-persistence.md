---
name: Mock-data UI mutations must persist
description: In-memory edits to mock-seeded lists reappear on remount unless persisted
---

In the social-command-center app, pages seed lists from mock data into React state (e.g. Media
Library from `mockMediaAssets`). A user "delete" or "duplicate" that only mutates React state
works visually but reappears as soon as the component remounts (navigating away and back) or the
page reloads — the state re-seeds from the mock source.

**Why:** A user reported "delete doesn't work" even though immediate removal worked in an e2e
test; the real complaint was the item coming back after navigation/reload.

**How to apply:** For mock-backed CRUD that should feel real, persist the working list to
`localStorage` (Media Library uses key `scc:media-library:v1`): initialize state from the
persisted snapshot if present (else mock seed), skip the API/mock re-seed when a snapshot exists,
and write back on every mutation. When debugging "X doesn't delete/save", first check whether the
mutation is expected to survive a reload, not just whether it updates the DOM once.
