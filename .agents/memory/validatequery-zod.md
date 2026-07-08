---
name: validateQuery Zod constraint
description: validateQuery/validateBody in the server require ZodSchema<T> with matching input and output types — transforms and defaults break this.
---

## Rule
Never pass a Zod schema with `.coerce`, `.transform()`, or `.default()` to `validateQuery` or `validateBody`. Use `z.string().optional()` for all query params and parse/coerce manually inside the route handler.

**Why:** `validateQuery<T>(schema: ZodSchema<T>)` is typed as `ZodSchema<T>` which in Zod v4 means `ZodType<T, ZodTypeDef, T>` — input and output must be the same type `T`. Schemas with `.coerce.number()` have `Input = unknown` and `Output = number`; `.default(1)` has `Input = T | undefined` and `Output = T`. TypeScript rejects the mismatch, `tsc` exits non-zero, Docker build fails silently, Railway falls back to the old container (which restarts with a new `BUILD_TIME` timestamp, making it look like a new deployment when it's actually old code).

**How to apply:**
```typescript
// WRONG — breaks tsc
const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

// CORRECT — all strings, parse manually
const schema = z.object({
  page: z.string().optional(),
});
// In handler:
const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
```

## Symptom
Railway build fails silently → old container restarts → health endpoint shows a NEW `build` timestamp but old routes/code. The dead giveaway is that adding a field to the health endpoint's `routes` array doesn't show up even after multiple Railway rebuilds.
