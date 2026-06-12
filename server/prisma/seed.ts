import "dotenv/config";
import { PrismaClient, Platform, PostStatus, CommentStatus, CommentPriority } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}

async function main(): Promise<void> {
  console.log("🌱 Seeding database...");

  // ─── Clear existing data ─────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.socialInboxSyncLog.deleteMany();
  await prisma.socialInboxNote.deleteMany();
  await prisma.socialCommentReply.deleteMany();
  await prisma.socialComment.deleteMany();
  await prisma.publishLog.deleteMany();
  await prisma.scheduledPostPlatform.deleteMany();
  await prisma.scheduledPost.deleteMany();
  await prisma.mediaProcessingJob.deleteMany();
  await prisma.mediaVersion.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ───────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      id: "user_1",
      email: "admin@marinedeckingco.com",
      name: "Admin User",
      role: "admin",
    },
  });
  const user2 = await prisma.user.create({
    data: {
      id: "user_2",
      email: "manager@marinedeckingco.com",
      name: "Marketing Manager",
      role: "manager",
    },
  });

  // ─── Social Accounts ─────────────────────────────────────────────────────
  const fbAccount = await prisma.socialAccount.create({
    data: {
      id: "acc_fb",
      platform: "FACEBOOK",
      accountName: "Marine Decking Co Page",
      accountId: "fb_page_123456",
      connectionStatus: "connected",
      lastSync: hoursAgo(1),
      postingCapability: true,
      commentReadCapability: true,
      commentReplyCapability: true,
      moderationCapability: true,
      scopes: ["pages_manage_posts", "pages_read_engagement", "pages_manage_comments"],
      tokenExpiresAt: daysFromNow(60),
    },
  });

  const igAccount = await prisma.socialAccount.create({
    data: {
      id: "acc_ig",
      platform: "INSTAGRAM",
      accountName: "Marine Decking Co (@marinedecking)",
      accountId: "ig_user_789012",
      connectionStatus: "connected",
      lastSync: hoursAgo(2),
      postingCapability: true,
      commentReadCapability: true,
      commentReplyCapability: true,
      moderationCapability: false,
      scopes: ["instagram_content_publish", "instagram_manage_comments"],
      tokenExpiresAt: daysFromNow(60),
    },
  });

  const liAccount = await prisma.socialAccount.create({
    data: {
      id: "acc_li",
      platform: "LINKEDIN",
      accountName: "Marine Decking Co Page",
      accountId: "li_org_345678",
      connectionStatus: "connected",
      lastSync: hoursAgo(3),
      postingCapability: true,
      commentReadCapability: true,
      commentReplyCapability: true,
      moderationCapability: false,
      scopes: ["w_organization_social", "r_organization_social"],
      tokenExpiresAt: daysFromNow(30),
    },
  });

  const ttAccount = await prisma.socialAccount.create({
    data: {
      id: "acc_tt",
      platform: "TIKTOK",
      accountName: "Marine Decking Official",
      accountId: "tt_user_901234",
      connectionStatus: "token_expired",
      lastSync: daysAgo(7),
      postingCapability: false,
      commentReadCapability: false,
      commentReplyCapability: false,
      moderationCapability: false,
      scopes: [],
      tokenExpiresAt: daysAgo(1),
    },
  });

  const webAccount = await prisma.socialAccount.create({
    data: {
      id: "acc_web",
      platform: "WEBSITE",
      accountName: "marinedeckingco.com (CMS)",
      accountId: "web_cms_primary",
      connectionStatus: "connected",
      lastSync: hoursAgo(6),
      postingCapability: true,
      commentReadCapability: false,
      commentReplyCapability: false,
      moderationCapability: false,
      scopes: ["cms:write"],
    },
  });

  // ─── Scheduled Posts ──────────────────────────────────────────────────────
  const post1 = await prisma.scheduledPost.create({
    data: {
      id: "post_1",
      title: "Maintenance tip: cleaning teak",
      masterCaption: "Keep your teak looking pristine with our expert maintenance guide. Proper cleaning extends the life of your marine decking by years. #MarineDecking #BoatMaintenance #TipsAndTricks",
      status: "PUBLISHED",
      publishedAt: daysAgo(3),
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PUBLISHED", externalPostId: "fb_123", publishedAt: daysAgo(3) },
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "PUBLISHED", externalPostId: "ig_123", publishedAt: daysAgo(3) },
        ],
      },
    },
  });

  const post2 = await prisma.scheduledPost.create({
    data: {
      id: "post_2",
      title: "Project gallery update",
      masterCaption: "Our latest project installations are turning heads at marinas across the East Coast. Swipe to see the stunning transformations. #MarineDecking #ProjectGallery",
      status: "FAILED",
      scheduledAt: daysAgo(1),
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "FAILED", errorMessage: "Invalid OAuth access token. Re-authenticate account." },
        ],
      },
    },
  });

  const post3 = await prisma.scheduledPost.create({
    data: {
      id: "post_3",
      title: "TikTok: Is synthetic teak worth it?",
      masterCaption: "We break down the pros and cons of synthetic vs. real teak for your vessel. Watch for the full analysis. #SyntheticTeak #MarineDecking #BoatLife",
      status: "PUBLISHED",
      publishedAt: daysAgo(2),
      createdBy: user2.id,
      platforms: {
        create: [
          { platform: "TIKTOK", accountId: ttAccount.id, status: "PUBLISHED", externalPostId: "tt_456", publishedAt: daysAgo(2) },
        ],
      },
    },
  });

  const post4 = await prisma.scheduledPost.create({
    data: {
      id: "post_4",
      title: "Teak deck refit showcase",
      masterCaption: "Witness the complete transformation of this 52ft motor yacht. A full teak deck refit done in just 5 days. #TeakDeck #YachtRefits #MarineDecking",
      status: "SCHEDULED",
      scheduledAt: daysFromNow(2),
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PENDING" },
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "PENDING" },
          { platform: "LINKEDIN", accountId: liAccount.id, status: "PENDING" },
        ],
      },
    },
  });

  const post5 = await prisma.scheduledPost.create({
    data: {
      id: "post_5",
      title: "Seasole non-slip product launch",
      masterCaption: "Introducing Seasole™ — our next-generation non-slip deck surface engineered for safety and style. Available in 8 marine-grade finishes. #NewProduct #Seasole #MarineDecking",
      status: "DRAFT",
      createdBy: user2.id,
      platforms: {
        create: [
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PENDING" },
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "PENDING" },
          { platform: "LINKEDIN", accountId: liAccount.id, status: "PENDING" },
          { platform: "WEBSITE", accountId: webAccount.id, status: "PENDING" },
        ],
      },
    },
  });

  const post6 = await prisma.scheduledPost.create({
    data: {
      id: "post_6",
      title: "OEM partnership announcement",
      masterCaption: "Proud to announce our new OEM partnership with three leading European yacht builders. Marine decking excellence, now available at the factory level. #OEM #Partnership",
      status: "PUBLISHED",
      publishedAt: daysAgo(10),
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "LINKEDIN", accountId: liAccount.id, status: "PUBLISHED", externalPostId: "li_789", publishedAt: daysAgo(10) },
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PUBLISHED", externalPostId: "fb_789", publishedAt: daysAgo(10) },
        ],
      },
    },
  });

  const post7 = await prisma.scheduledPost.create({
    data: {
      id: "post_7",
      title: "Composite decking installation guide",
      masterCaption: "Step-by-step installation walkthrough for our premium composite decking panels. Perfect for DIY refit projects. #MarineDecking #DIY #Installation",
      status: "SCHEDULED",
      scheduledAt: daysFromNow(5),
      createdBy: user2.id,
      platforms: {
        create: [
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PENDING" },
          { platform: "WEBSITE", accountId: webAccount.id, status: "PENDING" },
        ],
      },
    },
  });

  const post8 = await prisma.scheduledPost.create({
    data: {
      id: "post_8",
      title: "Behind the scenes: production floor",
      masterCaption: "Get an exclusive look at our state-of-the-art production facility where every panel is crafted to exacting marine standards. #BehindTheScenes #MarineManufacturing",
      status: "ARCHIVED",
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "SKIPPED" },
        ],
      },
    },
  });

  // ─── Publish Logs ─────────────────────────────────────────────────────────
  await prisma.publishLog.createMany({
    data: [
      {
        id: "pl_1",
        scheduledPostId: post1.id,
        postTitle: post1.title,
        platform: "FACEBOOK",
        action: "publish_success",
        status: "success",
        externalPostId: "fb_123",
        apiResponse: JSON.stringify({ id: "fb_123", status: "published" }),
        timestamp: daysAgo(3),
      },
      {
        id: "pl_2",
        scheduledPostId: post1.id,
        postTitle: post1.title,
        platform: "INSTAGRAM",
        action: "publish_success",
        status: "success",
        externalPostId: "ig_123",
        apiResponse: JSON.stringify({ id: "ig_123", status: "published" }),
        timestamp: daysAgo(3),
      },
      {
        id: "pl_3",
        scheduledPostId: post2.id,
        postTitle: post2.title,
        platform: "INSTAGRAM",
        action: "publish_failed",
        status: "failed",
        errorMessage: "Invalid OAuth access token. Re-authenticate account.",
        apiResponse: JSON.stringify({ error: { code: 190, message: "Invalid OAuth access token." } }),
        timestamp: daysAgo(1),
      },
      {
        id: "pl_4",
        scheduledPostId: post3.id,
        postTitle: post3.title,
        platform: "TIKTOK",
        action: "publish_success",
        status: "success",
        externalPostId: "tt_456",
        apiResponse: JSON.stringify({ data: { publish_id: "tt_456" } }),
        timestamp: daysAgo(2),
      },
      {
        id: "pl_5",
        scheduledPostId: post4.id,
        postTitle: post4.title,
        platform: "FACEBOOK",
        action: "post_scheduled",
        status: "success",
        apiResponse: JSON.stringify({ scheduled: true }),
        timestamp: hoursAgo(1),
      },
      {
        id: "pl_6",
        scheduledPostId: post6.id,
        postTitle: post6.title,
        platform: "LINKEDIN",
        action: "publish_success",
        status: "success",
        externalPostId: "li_789",
        apiResponse: JSON.stringify({ id: "li_789", status: "published" }),
        timestamp: daysAgo(10),
      },
    ],
  });

  // ─── Social Comments ──────────────────────────────────────────────────────
  const comment1 = await prisma.socialComment.create({
    data: {
      id: "cmt_1",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Mike Rogers",
      commenterHandle: "@mikerogers",
      commentText: "How long does the teak treatment last in saltwater environments? We have a 40ft sailing yacht and the existing teak is starting to show its age.",
      originalPostTitle: "Maintenance tip: cleaning teak",
      status: "NEW",
      priority: "HIGH",
      timestamp: hoursAgo(2),
    },
  });

  const comment2 = await prisma.socialComment.create({
    data: {
      id: "cmt_2",
      platform: "INSTAGRAM",
      accountId: igAccount.id,
      accountName: "Marine Decking Co (@marinedecking)",
      commenterName: "Sailing Sarah",
      commenterHandle: "@sailing_sarah",
      commentText: "Love the results! Do you ship internationally? We're based in the UK and desperately need a quality marine deck solution for our Swan 56.",
      originalPostTitle: "Maintenance tip: cleaning teak",
      status: "REPLIED",
      priority: "SALES_OPPORTUNITY",
      replyCount: 1,
      timestamp: hoursAgo(5),
    },
  });

  const comment3 = await prisma.socialComment.create({
    data: {
      id: "cmt_3",
      platform: "LINKEDIN",
      accountId: liAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Robert Davis",
      commenterHandle: "robert-davis-marine",
      commentText: "Congratulations on the OEM partnership! We at Nordic Marine are also looking for premium deck suppliers for our next model year. Would love to connect.",
      originalPostTitle: "OEM partnership announcement",
      status: "NEEDS_FOLLOW_UP",
      priority: "SALES_OPPORTUNITY",
      timestamp: daysAgo(1),
    },
  });

  const comment4 = await prisma.socialComment.create({
    data: {
      id: "cmt_4",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "TechBoater2024",
      commenterHandle: "@techboater2024",
      commentText: "Synthetic teak all the way! Real teak is environmentally irresponsible. Why are you still promoting real wood products?",
      originalPostTitle: "Teak deck refit showcase",
      status: "NEW",
      priority: "HIGH",
      timestamp: hoursAgo(8),
    },
  });

  const comment5 = await prisma.socialComment.create({
    data: {
      id: "cmt_5",
      platform: "INSTAGRAM",
      accountId: igAccount.id,
      accountName: "Marine Decking Co (@marinedecking)",
      commenterName: "Coastal Yachts",
      commenterHandle: "@coastalyachts_official",
      commentText: "We've been using your products for 3 years now and the quality is consistently excellent. Our clients love the Seasole finish especially!",
      originalPostTitle: "Seasole non-slip product launch",
      status: "RESOLVED",
      priority: "NORMAL",
      replyCount: 1,
      timestamp: daysAgo(3),
    },
  });

  const comment6 = await prisma.socialComment.create({
    data: {
      id: "cmt_6",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "JohnnyDeckBuilder",
      commenterHandle: "@johnnydeckbuilder",
      commentText: "What's the price range for a full 52ft refit like the one shown? Looking to budget for next season.",
      originalPostTitle: "Teak deck refit showcase",
      status: "NEW",
      priority: "SALES_OPPORTUNITY",
      timestamp: hoursAgo(14),
    },
  });

  // ─── Comment Replies ──────────────────────────────────────────────────────
  await prisma.socialCommentReply.create({
    data: {
      commentId: comment2.id,
      replyText: "Hi Sarah! Yes, we do ship internationally including to the UK. Our products are fully certified for EU marine standards. Please DM us or email sales@marinedeckingco.com and we'll get you a quote for your Swan 56. 🚤",
      sentBy: "admin",
      status: "sent",
      externalReplyId: "ig_reply_001",
      sentAt: hoursAgo(4),
    },
  });

  await prisma.socialCommentReply.create({
    data: {
      commentId: comment5.id,
      replyText: "Thank you so much for the kind words, @coastalyachts_official! It's always wonderful to hear from happy clients. We're so pleased the Seasole finish has been a hit. Looking forward to many more years of partnership! ⚓",
      sentBy: "admin",
      status: "sent",
      externalReplyId: "ig_reply_002",
      sentAt: daysAgo(2),
    },
  });

  // ─── Internal Notes ───────────────────────────────────────────────────────
  await prisma.socialInboxNote.create({
    data: {
      commentId: comment3.id,
      noteText: "Robert Davis is the Head of Procurement at Nordic Marine. High-value sales lead. Escalate to sales team and prepare custom deck specification sheet.",
      createdBy: adminUser.id,
    },
  });

  await prisma.socialInboxNote.create({
    data: {
      commentId: comment4.id,
      noteText: "Sustainability objection — we should respond carefully. We do offer our full composite/synthetic range. Do not get defensive. Proposed response reviewed by manager.",
      createdBy: user2.id,
    },
  });

  // ─── Sync Logs ────────────────────────────────────────────────────────────
  await prisma.socialInboxSyncLog.createMany({
    data: [
      {
        id: "sl_1",
        platform: "FACEBOOK",
        accountId: fbAccount.id,
        actionType: "comment_sync",
        status: "success",
        timestamp: hoursAgo(0.5),
      },
      {
        id: "sl_2",
        platform: "INSTAGRAM",
        accountId: igAccount.id,
        actionType: "reply_sent",
        status: "success",
        relatedPost: "Maintenance tip: cleaning teak",
        relatedCommenter: "@sailing_sarah",
        timestamp: hoursAgo(4),
      },
      {
        id: "sl_3",
        platform: "LINKEDIN",
        accountId: liAccount.id,
        actionType: "status_updated",
        status: "success",
        relatedPost: "OEM partnership announcement",
        relatedCommenter: "Robert Davis",
        timestamp: daysAgo(1),
      },
      {
        id: "sl_4",
        platform: "TIKTOK",
        accountId: ttAccount.id,
        actionType: "comment_sync",
        status: "failed",
        errorMessage: "Rate limit exceeded. Retrying in 15 minutes.",
        timestamp: hoursAgo(4),
      },
      {
        id: "sl_5",
        platform: "FACEBOOK",
        accountId: fbAccount.id,
        actionType: "assignment_updated",
        status: "success",
        relatedPost: "Teak deck refit showcase",
        relatedCommenter: "@mikerogers",
        timestamp: daysAgo(2),
      },
    ],
  });

  // ─── Media Assets ─────────────────────────────────────────────────────────
  const asset1 = await prisma.mediaAsset.create({
    data: {
      id: "asset_1",
      originalFileName: "teak-deck-refit-hero.jpg",
      originalFileType: "image",
      originalMimeType: "image/jpeg",
      originalSizeBytes: BigInt(8_200_000),
      originalWidth: 4000,
      originalHeight: 3000,
      uploadedBy: adminUser.id,
      processingStatus: "READY",
      validationStatus: "READY",
      createdAt: daysAgo(2),
    },
  });

  await prisma.mediaVersion.createMany({
    data: [
      { id: "v_1_1", mediaAssetId: asset1.id, platform: "FACEBOOK", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(450_000), processingStatus: "READY", cropMode: "smart_crop", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Excellent", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
      { id: "v_1_2", mediaAssetId: asset1.id, platform: "INSTAGRAM", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(450_000), processingStatus: "READY", cropMode: "smart_crop", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Excellent", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
      { id: "v_1_3", mediaAssetId: asset1.id, platform: "INSTAGRAM", placement: "Story / Reel", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(600_000), processingStatus: "READY", cropMode: "blurred_background_fill", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: ["Landscape image required blurred background fill for 9:16 format"], qualityScoreLabel: "Needs Review", validationStatus: "WARNING", validationErrorsJson: [], validationWarningsJson: [] },
      { id: "v_1_4", mediaAssetId: asset1.id, platform: "LINKEDIN", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(520_000), processingStatus: "READY", cropMode: "fit", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Excellent", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
      { id: "v_1_5", mediaAssetId: asset1.id, platform: "WEBSITE", placement: "Hero Image", width: 1920, height: 1080, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(1_100_000), processingStatus: "READY", cropMode: "fit", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Excellent", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
    ],
  });

  const asset2 = await prisma.mediaAsset.create({
    data: {
      id: "asset_2",
      originalFileName: "composite-deck-install.jpg",
      originalFileType: "image",
      originalMimeType: "image/jpeg",
      originalSizeBytes: BigInt(3_100_000),
      originalWidth: 1920,
      originalHeight: 1080,
      uploadedBy: adminUser.id,
      processingStatus: "READY",
      validationStatus: "WARNING",
      createdAt: daysAgo(5),
    },
  });

  await prisma.mediaVersion.createMany({
    data: [
      { id: "v_2_1", mediaAssetId: asset2.id, platform: "FACEBOOK", placement: "Feed Landscape", width: 1200, height: 630, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(420_000), processingStatus: "READY", cropMode: "fit", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Good", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
      { id: "v_2_2", mediaAssetId: asset2.id, platform: "INSTAGRAM", placement: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(580_000), processingStatus: "READY", cropMode: "smart_crop", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Needs Review", validationStatus: "WARNING", validationErrorsJson: [], validationWarningsJson: ["Significant crop from 16:9 to 4:5"] },
      { id: "v_2_3", mediaAssetId: asset2.id, platform: "TIKTOK", placement: "Vertical", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(620_000), processingStatus: "READY", cropMode: "blurred_background_fill", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Poor", validationStatus: "FAILED", validationErrorsJson: ["Original is landscape; vertical conversion requires heavy background fill"], validationWarningsJson: [] },
      { id: "v_2_4", mediaAssetId: asset2.id, platform: "WEBSITE", placement: "Blog", width: 1200, height: 675, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(390_000), processingStatus: "READY", cropMode: "fit", focalPointJson: { x: 0.5, y: 0.5 }, safeZoneWarningsJson: [], qualityScoreLabel: "Excellent", validationStatus: "READY", validationErrorsJson: [], validationWarningsJson: [] },
    ],
  });

  // ─── Settings ─────────────────────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      {
        key: "general",
        value: { timezone: "America/New_York", dateFormat: "MM/DD/YYYY", timeFormat: "12h" },
      },
      {
        key: "scheduling",
        value: { defaultPostTime: "09:00", autoRetryFailed: true, retryAttempts: 3 },
      },
      {
        key: "socialInbox",
        value: { autoAssignComments: false, profanityFilter: true, autoHideProfanity: true },
      },
      {
        key: "websiteApi",
        value: { endpointUrl: "https://api.marinedeckingco.com/v1", requireApproval: true },
      },
      {
        key: "ai",
        value: {
          model: "llama3-70b",
          endpoint: "http://localhost:11434/v1",
          temperature: 0.7,
          brandVoice: "Professional, authoritative, marine-industry focused, expert.",
        },
      },
      {
        key: "n8n",
        value: { webhookUrl: "https://n8n.marinedeckingco.internal/webhook", enabled: false },
      },
    ],
  });

  console.log("✅ Seed complete");
  console.log(`   Users: 2`);
  console.log(`   Accounts: 5 (FB, IG, LI, TT, WEB)`);
  console.log(`   Posts: 8`);
  console.log(`   Publish logs: 6`);
  console.log(`   Comments: 6`);
  console.log(`   Media assets: 2 (with versions)`);
  console.log(`   Settings: 6`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
