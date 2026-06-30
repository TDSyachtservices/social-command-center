---
name: Post platform/account mapping
description: How a scheduled post's platforms must be paired with social accounts to avoid cross-posting
---

## The trap
The create-post API takes two parallel arrays: `platforms` (e.g. `["FACEBOOK","INSTAGRAM"]`) and `accountIds`. Pairing them by index (`accountIds[i] ?? accountIds[0]`) is fragile: if a selected platform has no matching connected account, the arrays misalign and a platform row gets attached to a wrong-platform account.

**Why it matters:** With Facebook+Instagram selected but only a Facebook account connected, the Instagram row ended up pointing at the Facebook account. The publisher only checked `account.platform`, so it published the "Instagram" row through the Facebook adapter — a **duplicate Facebook post**.

## The rule
- Never trust positional alignment between `platforms` and `accountIds`.
- Derive each platform row from an account of the **same** platform: look up the selected `accountIds` in the DB, then for each account create a row with `platform = account.platform`. Drop platforms that have no matching connected account (the `accountId` column is required, so a row without an account is impossible anyway).
- In the publisher, keep a defensive guard: if `platformRow.platform !== account.platform`, skip (mark SKIPPED) instead of publishing — never cross-post through the wrong adapter.

**How to apply:** Any time you touch post creation or the publish loop, preserve both halves — same-platform pairing at write time AND the mismatch guard at publish time. They are belt-and-suspenders; removing either reopens the duplicate-post bug.
