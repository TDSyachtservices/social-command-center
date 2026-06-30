import { describe, it, expect } from "vitest";
import { resolveCaption } from "../services/publisher.js";

describe("resolveCaption — platformCaption ?? masterCaption", () => {
  it("returns the platform override when it is a non-empty string", () => {
    expect(resolveCaption("FB-specific text", "Master caption")).toBe("FB-specific text");
  });

  it("falls back to masterCaption when platformCaption is null", () => {
    expect(resolveCaption(null, "Master caption")).toBe("Master caption");
  });

  it("falls back to masterCaption when platformCaption is undefined", () => {
    expect(resolveCaption(undefined, "Master caption")).toBe("Master caption");
  });

  it("returns an empty string override rather than falling back (explicit empty override is preserved by nullish coalescing)", () => {
    // NOTE: the DB-level transform (trim → null) means a blank string is never
    // stored, so an empty-string platformCaption would only appear if the caller
    // bypasses validation.  The ?? operator still returns the empty string here
    // because it is not null/undefined.
    expect(resolveCaption("", "Master caption")).toBe("");
  });

  it("works with both Facebook and Instagram overrides independently", () => {
    const masterCaption = "Check out our new boat service!";
    const fbCaption = "🌊 Facebook fans — exclusive deal inside!";
    const igCaption = "📸 Tag us in your boat photos!";

    expect(resolveCaption(fbCaption, masterCaption)).toBe(fbCaption);
    expect(resolveCaption(igCaption, masterCaption)).toBe(igCaption);
    expect(resolveCaption(null, masterCaption)).toBe(masterCaption);
  });

  it("each platform row is resolved independently — one null does not affect another", () => {
    const masterCaption = "Master";
    const platforms = [
      { platformCaption: "FB override" as string | null },
      { platformCaption: null },
      { platformCaption: "IG override" as string | null },
    ];

    const resolved = platforms.map((p) => resolveCaption(p.platformCaption, masterCaption));

    expect(resolved[0]).toBe("FB override");
    expect(resolved[1]).toBe("Master");
    expect(resolved[2]).toBe("IG override");
  });
});
