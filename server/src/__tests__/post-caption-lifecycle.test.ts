/**
 * Integration / e2e tests: per-platform caption overrides survive the full
 * create → reload → publish lifecycle.
 *
 * These tests hit the real Express app and the real dev database so they
 * exercise the same code path as the production environment.
 *
 * Run: npm test  (from the server/ directory)
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

const POST_BODY = {
  title: `Caption lifecycle test ${Date.now()}`,
  masterCaption: "Master caption for all platforms",
  platforms: ["FACEBOOK", "INSTAGRAM"],
  accountIds: [],
  platformMedia: [
    {
      platform: "FACEBOOK",
      mediaUrl: null,
      mediaType: null,
      platformCaption: "Facebook-specific override caption",
    },
    {
      platform: "INSTAGRAM",
      mediaUrl: null,
      mediaType: null,
      platformCaption: "Instagram-specific override caption",
    },
  ],
};

// ─── Create → reload ──────────────────────────────────────────────────────────

describe("Per-platform caption overrides: create → reload", () => {
  let postId: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/posts").send(POST_BODY);
    expect(res.status).toBe(201);
    postId = res.body.data.id;
  });

  it("POST /api/posts stores the Facebook platform caption override", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);

    const fbRow = res.body.data.platforms.find(
      (p: { platform: string }) => p.platform === "FACEBOOK",
    );
    expect(fbRow).toBeDefined();
    expect(fbRow.platformCaption).toBe("Facebook-specific override caption");
  });

  it("POST /api/posts stores the Instagram platform caption override", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);

    const igRow = res.body.data.platforms.find(
      (p: { platform: string }) => p.platform === "INSTAGRAM",
    );
    expect(igRow).toBeDefined();
    expect(igRow.platformCaption).toBe("Instagram-specific override caption");
  });

  it("GET /api/posts/:id returns the master caption unchanged", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.masterCaption).toBe("Master caption for all platforms");
  });
});

// ─── Edit (PATCH) → reload ────────────────────────────────────────────────────

describe("Per-platform caption overrides: edit (PATCH) → reload", () => {
  let postId: string;

  beforeAll(async () => {
    const createRes = await request(app).post("/api/posts").send(POST_BODY);
    expect(createRes.status).toBe(201);
    postId = createRes.body.data.id;

    // Simulate the user re-saving the post with updated captions.
    const patchRes = await request(app)
      .patch(`/api/posts/${postId}`)
      .send({
        title: POST_BODY.title,
        masterCaption: POST_BODY.masterCaption,
        platforms: ["FACEBOOK", "INSTAGRAM"],
        accountIds: [],
        platformMedia: [
          {
            platform: "FACEBOOK",
            mediaUrl: null,
            mediaType: null,
            platformCaption: "Updated Facebook caption",
          },
          {
            platform: "INSTAGRAM",
            mediaUrl: null,
            mediaType: null,
            platformCaption: "Updated Instagram caption",
          },
        ],
      });
    expect(patchRes.status).toBe(200);
  });

  it("PATCH /api/posts/:id updates the Facebook caption override", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);

    const fbRow = res.body.data.platforms.find(
      (p: { platform: string }) => p.platform === "FACEBOOK",
    );
    expect(fbRow).toBeDefined();
    expect(fbRow.platformCaption).toBe("Updated Facebook caption");
  });

  it("PATCH /api/posts/:id updates the Instagram caption override", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);

    const igRow = res.body.data.platforms.find(
      (p: { platform: string }) => p.platform === "INSTAGRAM",
    );
    expect(igRow).toBeDefined();
    expect(igRow.platformCaption).toBe("Updated Instagram caption");
  });
});

// ─── Publish caption resolution ───────────────────────────────────────────────

describe("Publisher caption resolution: platformCaption ?? masterCaption", () => {
  it("uses the platform override when present (FB)", async () => {
    const { resolveCaption } = await import("../services/publisher.js");
    expect(resolveCaption("Facebook-specific override caption", "Master caption")).toBe(
      "Facebook-specific override caption",
    );
  });

  it("uses the platform override when present (IG)", async () => {
    const { resolveCaption } = await import("../services/publisher.js");
    expect(resolveCaption("Instagram-specific override caption", "Master caption")).toBe(
      "Instagram-specific override caption",
    );
  });

  it("falls back to masterCaption when platformCaption is null (no override set)", async () => {
    const { resolveCaption } = await import("../services/publisher.js");
    expect(resolveCaption(null, "Master caption")).toBe("Master caption");
  });

  it("resolves independently per platform — one null does not affect another", async () => {
    const { resolveCaption } = await import("../services/publisher.js");
    const master = "Master caption for all platforms";

    const fbCaption = resolveCaption("Facebook-specific override caption", master);
    const igCaption = resolveCaption("Instagram-specific override caption", master);
    const linkedInCaption = resolveCaption(null, master);

    expect(fbCaption).toBe("Facebook-specific override caption");
    expect(igCaption).toBe("Instagram-specific override caption");
    expect(linkedInCaption).toBe(master);
  });
});
