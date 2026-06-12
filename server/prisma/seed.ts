import "dotenv/config";
import { PrismaClient } from "@prisma/client";

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

  // ─── Social Accounts (7 required) ────────────────────────────────────────
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

  // Account 6: Facebook Business (secondary)
  const fbAccount2 = await prisma.socialAccount.create({
    data: {
      id: "acc_fb2",
      platform: "FACEBOOK",
      accountName: "Marine Decking Co — Trade",
      accountId: "fb_page_654321",
      connectionStatus: "disconnected",
      postingCapability: false,
      commentReadCapability: false,
      commentReplyCapability: false,
      moderationCapability: false,
      scopes: [],
    },
  });

  // Account 7: Instagram secondary
  const igAccount2 = await prisma.socialAccount.create({
    data: {
      id: "acc_ig2",
      platform: "INSTAGRAM",
      accountName: "Seasole By Marine Decking (@seasole_official)",
      accountId: "ig_user_210987",
      connectionStatus: "not_connected",
      postingCapability: false,
      commentReadCapability: false,
      commentReplyCapability: false,
      moderationCapability: false,
      scopes: [],
    },
  });

  // ─── Scheduled Posts (10 required) ────────────────────────────────────────
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

  const post9 = await prisma.scheduledPost.create({
    data: {
      id: "post_9",
      title: "Superyacht case study: 120ft refit",
      masterCaption: "Our most ambitious project yet — a complete deck refit on a 120ft superyacht. Three months. Twelve panels. Zero compromises. #Superyacht #MarineDecking #CaseStudy",
      status: "PUBLISHED",
      publishedAt: daysAgo(14),
      createdBy: adminUser.id,
      platforms: {
        create: [
          { platform: "LINKEDIN", accountId: liAccount.id, status: "PUBLISHED", externalPostId: "li_999", publishedAt: daysAgo(14) },
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "PUBLISHED", externalPostId: "ig_999", publishedAt: daysAgo(14) },
          { platform: "WEBSITE", accountId: webAccount.id, status: "PUBLISHED", externalPostId: "web_999", publishedAt: daysAgo(14) },
        ],
      },
    },
  });

  const post10 = await prisma.scheduledPost.create({
    data: {
      id: "post_10",
      title: "Summer marina event recap",
      masterCaption: "What an incredible weekend at the Southampton Boat Show! Met hundreds of passionate boat owners and showcased our latest Seasole collection. #BoatShow #MarineDecking #Southampton",
      status: "DRAFT",
      createdBy: user2.id,
      platforms: {
        create: [
          { platform: "FACEBOOK", accountId: fbAccount.id, status: "PENDING" },
          { platform: "INSTAGRAM", accountId: igAccount.id, status: "PENDING" },
        ],
      },
    },
  });

  // ─── Publish Logs (10 required) ───────────────────────────────────────────
  await prisma.publishLog.createMany({
    data: [
      { id: "pl_1", scheduledPostId: post1.id, postTitle: post1.title, platform: "FACEBOOK", action: "publish_success", status: "success", externalPostId: "fb_123", apiResponse: JSON.stringify({ id: "fb_123", status: "published" }), timestamp: daysAgo(3) },
      { id: "pl_2", scheduledPostId: post1.id, postTitle: post1.title, platform: "INSTAGRAM", action: "publish_success", status: "success", externalPostId: "ig_123", apiResponse: JSON.stringify({ id: "ig_123", status: "published" }), timestamp: daysAgo(3) },
      { id: "pl_3", scheduledPostId: post2.id, postTitle: post2.title, platform: "INSTAGRAM", action: "publish_failed", status: "failed", errorMessage: "Invalid OAuth access token. Re-authenticate account.", apiResponse: JSON.stringify({ error: { code: 190, message: "Invalid OAuth access token." } }), timestamp: daysAgo(1) },
      { id: "pl_4", scheduledPostId: post3.id, postTitle: post3.title, platform: "TIKTOK", action: "publish_success", status: "success", externalPostId: "tt_456", apiResponse: JSON.stringify({ data: { publish_id: "tt_456" } }), timestamp: daysAgo(2) },
      { id: "pl_5", scheduledPostId: post4.id, postTitle: post4.title, platform: "FACEBOOK", action: "post_scheduled", status: "success", apiResponse: JSON.stringify({ scheduled: true }), timestamp: hoursAgo(1) },
      { id: "pl_6", scheduledPostId: post6.id, postTitle: post6.title, platform: "LINKEDIN", action: "publish_success", status: "success", externalPostId: "li_789", apiResponse: JSON.stringify({ id: "li_789", status: "published" }), timestamp: daysAgo(10) },
      { id: "pl_7", scheduledPostId: post6.id, postTitle: post6.title, platform: "FACEBOOK", action: "publish_success", status: "success", externalPostId: "fb_789", apiResponse: JSON.stringify({ id: "fb_789", status: "published" }), timestamp: daysAgo(10) },
      { id: "pl_8", scheduledPostId: post9.id, postTitle: post9.title, platform: "LINKEDIN", action: "publish_success", status: "success", externalPostId: "li_999", apiResponse: JSON.stringify({ id: "li_999" }), timestamp: daysAgo(14) },
      { id: "pl_9", scheduledPostId: post9.id, postTitle: post9.title, platform: "INSTAGRAM", action: "publish_success", status: "success", externalPostId: "ig_999", apiResponse: JSON.stringify({ id: "ig_999" }), timestamp: daysAgo(14) },
      { id: "pl_10", scheduledPostId: post9.id, postTitle: post9.title, platform: "WEBSITE", action: "publish_success", status: "success", externalPostId: "web_999", apiResponse: JSON.stringify({ slug: "superyacht-case-study" }), timestamp: daysAgo(14) },
    ],
  });

  // ─── Social Comments (15+ required) ──────────────────────────────────────
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

  const comment7 = await prisma.socialComment.create({
    data: {
      id: "cmt_7",
      platform: "LINKEDIN",
      accountId: liAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Patricia Holt",
      commenterHandle: "patricia-holt-yachts",
      commentText: "Stunning work on the superyacht case study! We've been looking for a reliable decking partner for our 65ft catamaran project. Do you work with composite hull builds?",
      originalPostTitle: "Superyacht case study: 120ft refit",
      status: "NEW",
      priority: "SALES_OPPORTUNITY",
      timestamp: hoursAgo(18),
    },
  });

  const comment8 = await prisma.socialComment.create({
    data: {
      id: "cmt_8",
      platform: "INSTAGRAM",
      accountId: igAccount.id,
      accountName: "Marine Decking Co (@marinedecking)",
      commenterName: "BoatBuild_Marcus",
      commenterHandle: "@boatbuild_marcus",
      commentText: "Does Seasole come in a teak-look finish or is it only solid colours? Trying to match existing decking on a refit.",
      originalPostTitle: "Seasole non-slip product launch",
      status: "NEEDS_FOLLOW_UP",
      priority: "NORMAL",
      timestamp: daysAgo(2),
    },
  });

  const comment9 = await prisma.socialComment.create({
    data: {
      id: "cmt_9",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "AngrySailor99",
      commenterHandle: "@angrysailor99",
      commentText: "Ordered 3 months ago, still waiting. Customer service is non-existent. Absolute disaster.",
      originalPostTitle: "Maintenance tip: cleaning teak",
      status: "ESCALATED",
      priority: "URGENT",
      timestamp: hoursAgo(6),
    },
  });

  const comment10 = await prisma.socialComment.create({
    data: {
      id: "cmt_10",
      platform: "LINKEDIN",
      accountId: liAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Björn Larsson",
      commenterHandle: "bjorn-larsson-nordic",
      commentText: "Impressive engineering behind the Seasole panels. We design high-performance sailing yachts and are exploring premium deck solutions. Could we arrange a technical review?",
      originalPostTitle: "Seasole non-slip product launch",
      status: "REPLIED",
      priority: "SALES_OPPORTUNITY",
      replyCount: 1,
      timestamp: daysAgo(4),
    },
  });

  const comment11 = await prisma.socialComment.create({
    data: {
      id: "cmt_11",
      platform: "INSTAGRAM",
      accountId: igAccount.id,
      accountName: "Marine Decking Co (@marinedecking)",
      commenterName: "YachtRefit_Guru",
      commenterHandle: "@yachtrefit_guru",
      commentText: "Great content! Sharing with my followers — this is exactly the kind of high-quality work the marine industry needs.",
      originalPostTitle: "Teak deck refit showcase",
      status: "RESOLVED",
      priority: "LOW",
      replyCount: 0,
      timestamp: daysAgo(5),
    },
  });

  const comment12 = await prisma.socialComment.create({
    data: {
      id: "cmt_12",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Pete Fairweather",
      commenterHandle: "@pete_fairweather",
      commentText: "Just got back from Southampton Boat Show — spoke to your team there. Very impressed. Sending an email about the trade programme.",
      originalPostTitle: "Summer marina event recap",
      status: "REPLIED",
      priority: "SALES_OPPORTUNITY",
      replyCount: 1,
      timestamp: daysAgo(1),
    },
  });

  const comment13 = await prisma.socialComment.create({
    data: {
      id: "cmt_13",
      platform: "INSTAGRAM",
      accountId: igAccount.id,
      accountName: "Marine Decking Co (@marinedecking)",
      commenterName: "classicboats_uk",
      commenterHandle: "@classicboats_uk",
      commentText: "Would these panels work on a traditional wooden hull? We restore classic motor cruisers and always looking for period-appropriate decking.",
      originalPostTitle: "Composite decking installation guide",
      status: "NEW",
      priority: "NORMAL",
      timestamp: hoursAgo(30),
    },
  });

  const comment14 = await prisma.socialComment.create({
    data: {
      id: "cmt_14",
      platform: "LINKEDIN",
      accountId: liAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "Annelies Van den Berg",
      commenterHandle: "annelies-vandenberg",
      commentText: "We featured your OEM announcement in our industry newsletter. Would you be interested in a detailed write-up for our marine engineering publication?",
      originalPostTitle: "OEM partnership announcement",
      status: "NEEDS_FOLLOW_UP",
      priority: "NORMAL",
      timestamp: daysAgo(8),
    },
  });

  const comment15 = await prisma.socialComment.create({
    data: {
      id: "cmt_15",
      platform: "FACEBOOK",
      accountId: fbAccount.id,
      accountName: "Marine Decking Co Page",
      commenterName: "HarbourMaster_Jim",
      commenterHandle: "@harbourmaster_jim",
      commentText: "Used your maintenance guide last weekend — worked brilliantly. Teak looks like new. Highly recommended to all the boat owners at our marina.",
      originalPostTitle: "Maintenance tip: cleaning teak",
      status: "RESOLVED",
      priority: "NORMAL",
      replyCount: 1,
      timestamp: daysAgo(6),
    },
  });

  // ─── Comment Replies ──────────────────────────────────────────────────────
  await prisma.socialCommentReply.createMany({
    data: [
      { commentId: comment2.id, replyText: "Hi Sarah! Yes, we do ship internationally including to the UK. Our products are fully certified for EU marine standards. Please DM us or email sales@marinedeckingco.com and we'll get you a quote for your Swan 56. 🚤", sentBy: "admin", status: "sent", externalReplyId: "ig_reply_001", sentAt: hoursAgo(4) },
      { commentId: comment5.id, replyText: "Thank you so much for the kind words, @coastalyachts_official! It's always wonderful to hear from happy clients. We're so pleased the Seasole finish has been a hit. Looking forward to many more years of partnership! ⚓", sentBy: "admin", status: "sent", externalReplyId: "ig_reply_002", sentAt: daysAgo(2) },
      { commentId: comment10.id, replyText: "Thank you Björn! We would be delighted to arrange a technical review. I'll have our technical director reach out this week to schedule a call. Our R&D team would love to learn about your design requirements.", sentBy: "admin", status: "sent", externalReplyId: "li_reply_001", sentAt: daysAgo(3) },
      { commentId: comment12.id, replyText: "Wonderful to hear from you Pete! We do have an active trade programme with some excellent margins for professional installers. Keep an eye on your inbox — our trade team will be in touch shortly.", sentBy: "user_2", status: "sent", externalReplyId: "fb_reply_001", sentAt: daysAgo(1) },
      { commentId: comment15.id, replyText: "That's brilliant to hear Jim! Nothing better than a freshly maintained teak deck. Please feel free to share our guide with other boat owners at the marina — we'd love to help more people enjoy beautiful decking! 🛥️", sentBy: "admin", status: "sent", externalReplyId: "fb_reply_002", sentAt: daysAgo(5) },
    ],
  });

  // ─── Internal Notes ───────────────────────────────────────────────────────
  await prisma.socialInboxNote.createMany({
    data: [
      { commentId: comment3.id, noteText: "Robert Davis is the Head of Procurement at Nordic Marine. High-value sales lead. Escalate to sales team and prepare custom deck specification sheet.", createdBy: adminUser.id },
      { commentId: comment4.id, noteText: "Sustainability objection — we should respond carefully. We do offer our full composite/synthetic range. Do not get defensive. Proposed response reviewed by manager.", createdBy: user2.id },
      { commentId: comment9.id, noteText: "Customer claims 3-month wait and no CS contact. Check CRM for order history. This needs urgent resolution — potentially a refund/expedite situation.", createdBy: adminUser.id },
    ],
  });

  // ─── Sync Logs (10 required for comment logs spec) ────────────────────────
  await prisma.socialInboxSyncLog.createMany({
    data: [
      { id: "sl_1", platform: "FACEBOOK", accountId: fbAccount.id, actionType: "comment_sync", status: "success", timestamp: hoursAgo(0.5) },
      { id: "sl_2", platform: "INSTAGRAM", accountId: igAccount.id, actionType: "reply_sent", status: "success", relatedPost: "Maintenance tip: cleaning teak", relatedCommenter: "@sailing_sarah", timestamp: hoursAgo(4) },
      { id: "sl_3", platform: "LINKEDIN", accountId: liAccount.id, actionType: "status_updated", status: "success", relatedPost: "OEM partnership announcement", relatedCommenter: "Robert Davis", timestamp: daysAgo(1) },
      { id: "sl_4", platform: "TIKTOK", accountId: ttAccount.id, actionType: "comment_sync", status: "failed", errorMessage: "Rate limit exceeded. Retrying in 15 minutes.", timestamp: hoursAgo(4) },
      { id: "sl_5", platform: "FACEBOOK", accountId: fbAccount.id, actionType: "assignment_updated", status: "success", relatedPost: "Teak deck refit showcase", relatedCommenter: "@mikerogers", timestamp: daysAgo(2) },
      { id: "sl_6", platform: "INSTAGRAM", accountId: igAccount.id, actionType: "comment_sync", status: "success", timestamp: hoursAgo(12) },
      { id: "sl_7", platform: "LINKEDIN", accountId: liAccount.id, actionType: "reply_sent", status: "success", relatedPost: "Seasole non-slip product launch", relatedCommenter: "bjorn-larsson-nordic", timestamp: daysAgo(3) },
      { id: "sl_8", platform: "FACEBOOK", accountId: fbAccount.id, actionType: "comment_hidden", status: "success", relatedCommenter: "@angrysailor99", timestamp: hoursAgo(5) },
      { id: "sl_9", platform: "INSTAGRAM", accountId: igAccount.id, actionType: "comment_sync", status: "failed", errorMessage: "Service temporarily unavailable. Will retry.", timestamp: daysAgo(1) },
      { id: "sl_10", platform: "LINKEDIN", accountId: liAccount.id, actionType: "comment_sync", status: "success", timestamp: hoursAgo(8) },
    ],
  });

  // ─── Media Assets (5 required) ────────────────────────────────────────────
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
      { id: "v_1_2", mediaAssetId: asset1.id, platform: "INSTAGRAM", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(450_000), processingStatus: "READY", cropMode: "smart_crop", qualityScoreLabel: "Excellent", validationStatus: "READY" },
      { id: "v_1_3", mediaAssetId: asset1.id, platform: "INSTAGRAM", placement: "Story / Reel", width: 1080, height: 1920, aspectRatio: "9:16", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(600_000), processingStatus: "READY", cropMode: "blurred_background_fill", qualityScoreLabel: "Needs Review", validationStatus: "WARNING", safeZoneWarningsJson: ["Landscape image required blurred background fill for 9:16 format"] },
      { id: "v_1_4", mediaAssetId: asset1.id, platform: "LINKEDIN", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(520_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
      { id: "v_1_5", mediaAssetId: asset1.id, platform: "WEBSITE", placement: "Hero Image", width: 1920, height: 1080, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(1_100_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
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
      { id: "v_2_1", mediaAssetId: asset2.id, platform: "FACEBOOK", placement: "Feed Landscape", width: 1200, height: 630, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(380_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Good", validationStatus: "READY" },
      { id: "v_2_2", mediaAssetId: asset2.id, platform: "INSTAGRAM", placement: "Feed Landscape", width: 1080, height: 566, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(350_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Good", validationStatus: "WARNING", validationWarningsJson: ["Image width below Instagram recommended 1080px for landscape"] },
      { id: "v_2_3", mediaAssetId: asset2.id, platform: "WEBSITE", placement: "Blog Header", width: 1200, height: 628, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(400_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Good", validationStatus: "READY" },
    ],
  });

  const asset3 = await prisma.mediaAsset.create({
    data: {
      id: "asset_3",
      originalFileName: "seasole-product-lineup.jpg",
      originalFileType: "image",
      originalMimeType: "image/jpeg",
      originalSizeBytes: BigInt(5_400_000),
      originalWidth: 3840,
      originalHeight: 2160,
      uploadedBy: user2.id,
      processingStatus: "READY",
      validationStatus: "READY",
      createdAt: daysAgo(1),
    },
  });

  await prisma.mediaVersion.createMany({
    data: [
      { id: "v_3_1", mediaAssetId: asset3.id, platform: "INSTAGRAM", placement: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(520_000), processingStatus: "READY", cropMode: "smart_crop", qualityScoreLabel: "Excellent", validationStatus: "READY" },
      { id: "v_3_2", mediaAssetId: asset3.id, platform: "LINKEDIN", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(480_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
      { id: "v_3_3", mediaAssetId: asset3.id, platform: "WEBSITE", placement: "Product Hero", width: 1920, height: 1080, aspectRatio: "16:9", format: "JPG", mimeType: "image/jpeg", fileSizeBytes: BigInt(1_200_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
    ],
  });

  const asset4 = await prisma.mediaAsset.create({
    data: {
      id: "asset_4",
      originalFileName: "superyacht-deck-video.mp4",
      originalFileType: "video",
      originalMimeType: "video/mp4",
      originalSizeBytes: BigInt(185_000_000),
      originalWidth: 3840,
      originalHeight: 2160,
      originalDurationSeconds: 62,
      uploadedBy: adminUser.id,
      processingStatus: "NEEDS_EXTERNAL_PROCESSING",
      validationStatus: "NEEDS_EXTERNAL_PROCESSING",
      createdAt: daysAgo(3),
    },
  });

  await prisma.mediaVersion.create({
    data: {
      id: "v_4_1",
      mediaAssetId: asset4.id,
      platform: "INSTAGRAM",
      placement: "Reel",
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      format: "MP4",
      mimeType: "video/mp4",
      processingStatus: "NEEDS_EXTERNAL_PROCESSING",
      cropMode: "smart_crop",
      validationStatus: "NEEDS_EXTERNAL_PROCESSING",
    },
  });

  const asset5 = await prisma.mediaAsset.create({
    data: {
      id: "asset_5",
      originalFileName: "oem-partnership-graphic.png",
      originalFileType: "image",
      originalMimeType: "image/png",
      originalSizeBytes: BigInt(2_800_000),
      originalWidth: 2400,
      originalHeight: 1260,
      uploadedBy: user2.id,
      processingStatus: "READY",
      validationStatus: "READY",
      createdAt: daysAgo(12),
    },
  });

  await prisma.mediaVersion.createMany({
    data: [
      { id: "v_5_1", mediaAssetId: asset5.id, platform: "LINKEDIN", placement: "Feed Landscape", width: 1200, height: 627, aspectRatio: "1.91:1", format: "PNG", mimeType: "image/png", fileSizeBytes: BigInt(620_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
      { id: "v_5_2", mediaAssetId: asset5.id, platform: "FACEBOOK", placement: "Feed Landscape", width: 1200, height: 630, aspectRatio: "1.91:1", format: "PNG", mimeType: "image/png", fileSizeBytes: BigInt(600_000), processingStatus: "READY", cropMode: "fit", qualityScoreLabel: "Excellent", validationStatus: "READY" },
    ],
  });

  // ─── Settings ─────────────────────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      {
        id: "setting_general",
        key: "general",
        value: {
          companyName: "Marine Decking Co",
          timezone: "Europe/London",
          dateFormat: "DD/MM/YYYY",
          defaultPostStatus: "DRAFT",
          autoScheduleWindow: { start: "09:00", end: "18:00" },
        } as never,
      },
      {
        id: "setting_ai",
        key: "ai",
        value: {
          endpoint: "http://localhost:11434/v1",
          model: "llama3-70b",
          temperature: 0.7,
          brandVoice: "Professional, authoritative, and passionate about premium marine craftsmanship. Approachable but expert.",
          captionStyle: "concise",
          hashtagMode: "auto",
        } as never,
      },
      {
        id: "setting_websiteApi",
        key: "websiteApi",
        value: {
          endpoint: process.env.WEBSITE_CMS_ENDPOINT ?? null,
          enabled: false,
          syncInterval: 30,
        } as never,
      },
    ],
  });

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { action: "seed_completed", resourceType: "system", details: { accounts: 7, posts: 10, comments: 15, media: 5 } as never, timestamp: new Date() },
    ],
  });

  console.log("✅ Seed complete");
  console.log("   Users: 2");
  console.log("   Social accounts: 7");
  console.log("   Posts: 10");
  console.log("   Publish logs: 10");
  console.log("   Comments: 15");
  console.log("   Sync logs: 10");
  console.log("   Media assets: 5");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
