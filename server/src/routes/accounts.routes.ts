import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const createAccountSchema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]),
  accountName: z.string().min(1).max(200),
  accountId: z.string().min(1).max(200),
  connectionStatus: z
    .enum(["connected", "disconnected", "token_expired", "not_connected"])
    .default("not_connected"),
  postingCapability: z.boolean().default(false),
  commentReadCapability: z.boolean().default(false),
  commentReplyCapability: z.boolean().default(false),
  moderationCapability: z.boolean().default(false),
  scopes: z.array(z.string()).default([]),
});

const updateAccountSchema = createAccountSchema.partial();

// ─── GET /api/accounts ──────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const accounts = await prisma.socialAccount.findMany({
    orderBy: [{ platform: "asc" }, { accountName: "asc" }],
    include: { _count: { select: { comments: true } } },
  });
  sendSuccess(res, accounts);
});

// ─── GET /api/accounts/:id ──────────────────────────────────────────────────
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) throw notFound("Account", id);
  sendSuccess(res, account);
});

// ─── POST /api/accounts ─────────────────────────────────────────────────────
router.post(
  "/",
  validateBody(createAccountSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createAccountSchema>;
    const account = await prisma.socialAccount.create({
      data: { ...body, platform: body.platform as never },
    });
    sendSuccess(res, account, undefined, 201);
  },
);

// ─── PATCH /api/accounts/:id ────────────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updateAccountSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.socialAccount.findUnique({ where: { id } });
    if (!existing) throw notFound("Account", id);

    const body = req.body as z.infer<typeof updateAccountSchema>;
    const account = await prisma.socialAccount.update({
      where: { id },
      data: {
        ...(body.platform !== undefined ? { platform: body.platform as never } : {}),
        ...(body.accountName !== undefined ? { accountName: body.accountName } : {}),
        ...(body.accountId !== undefined ? { accountId: body.accountId } : {}),
        ...(body.connectionStatus !== undefined
          ? { connectionStatus: body.connectionStatus }
          : {}),
        ...(body.postingCapability !== undefined
          ? { postingCapability: body.postingCapability }
          : {}),
        ...(body.commentReadCapability !== undefined
          ? { commentReadCapability: body.commentReadCapability }
          : {}),
        ...(body.commentReplyCapability !== undefined
          ? { commentReplyCapability: body.commentReplyCapability }
          : {}),
        ...(body.moderationCapability !== undefined
          ? { moderationCapability: body.moderationCapability }
          : {}),
        ...(body.scopes !== undefined ? { scopes: body.scopes } : {}),
      },
    });
    sendSuccess(res, account);
  },
);

// ─── DELETE /api/accounts/:id ───────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.socialAccount.findUnique({ where: { id } });
  if (!existing) throw notFound("Account", id);
  await prisma.socialAccount.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

// ─── POST /api/accounts/connect-mock ─────────────────────────────────────────
// Creates a new mock-connected account (no existing ID required).
const connectMockSchema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE", "N8N", "LOCAL_AI"]),
  accountName: z.string().min(1).max(200),
  accountId: z.string().min(1).max(200),
  scopes: z.array(z.string()).default([]),
});

router.post(
  "/connect-mock",
  validateBody(connectMockSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof connectMockSchema>;
    const account = await prisma.socialAccount.create({
      data: {
        platform: body.platform,
        accountName: body.accountName,
        accountId: body.accountId,
        connectionStatus: "connected",
        postingCapability: true,
        commentReadCapability: true,
        commentReplyCapability: true,
        tokenEncrypted: "MOCK_TOKEN",
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        lastSync: new Date(),
        scopes: body.scopes,
      },
    });
    sendSuccess(res, { ...account, mock: true, note: "Mock OAuth connect — no real token" });
  },
);

// ─── POST /api/accounts/:id/connect-mock ───────────────────────────────────
// Reconnects an existing account by ID with a fresh mock token.
router.post("/:id/connect-mock", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.socialAccount.findUnique({ where: { id } });
  if (!existing) throw notFound("Account", id);

  const account = await prisma.socialAccount.update({
    where: { id },
    data: {
      connectionStatus: "connected",
      lastSync: new Date(),
      postingCapability: true,
      commentReadCapability: true,
      commentReplyCapability: true,
      tokenEncrypted: "MOCK_TOKEN",
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  sendSuccess(res, { ...account, mock: true, note: "Mock OAuth connect — no real token" });
});

// ─── GET /api/accounts/:id/check ────────────────────────────────────────────
router.get("/:id/check", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) throw notFound("Account", id);

  const isExpired = account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false;
  sendSuccess(res, {
    id: account.id,
    platform: account.platform,
    connectionStatus: isExpired ? "token_expired" : account.connectionStatus,
    lastSync: account.lastSync,
    tokenExpiresAt: account.tokenExpiresAt,
    healthy: account.connectionStatus === "connected" && !isExpired,
  });
});

// ─── GET /api/accounts/:id/capabilities ─────────────────────────────────────
router.get("/:id/capabilities", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) throw notFound("Account", id);

  sendSuccess(res, {
    id: account.id,
    platform: account.platform,
    posting: account.postingCapability,
    commentRead: account.commentReadCapability,
    commentReply: account.commentReplyCapability,
    moderation: account.moderationCapability,
    scopes: account.scopes,
  });
});

// ─── POST /api/accounts/:id/disconnect ─────────────────────────────────────
router.post("/:id/disconnect", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.socialAccount.findUnique({ where: { id } });
  if (!existing) throw notFound("Account", id);

  const account = await prisma.socialAccount.update({
    where: { id },
    data: {
      connectionStatus: "disconnected",
      tokenEncrypted: null,
      tokenExpiresAt: null,
      lastSync: null,
    },
  });
  sendSuccess(res, account);
});

export default router;
