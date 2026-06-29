"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapabilities = getCapabilities;
exports.publishPost = publishPost;
exports.getComments = getComments;
exports.replyToComment = replyToComment;
exports.instagramPublish = instagramPublish;
exports.instagramGetComments = instagramGetComments;
exports.instagramReplyToComment = instagramReplyToComment;
const logger_js_1 = require("../utils/logger.js");
const GRAPH = "https://graph.facebook.com/v19.0";
function getCapabilities() {
    return { posting: true, commentRead: true, commentReply: true, moderation: false };
}
// ─── Publishing ────────────────────────────────────────────────────────────────
// Instagram publishing is a two-step process:
//   1. Create a media container (returns container ID)
//   2. Publish the container
async function publishPost(opts) {
    const { accessToken, igUserId, caption, mediaUrl, mediaType } = opts;
    try {
        // Step 1: create container
        const containerBody = {
            caption,
            access_token: accessToken,
        };
        if (mediaUrl && (mediaType === "image" || !mediaType)) {
            containerBody.image_url = mediaUrl;
            containerBody.media_type = "IMAGE";
        }
        else if (mediaUrl && mediaType === "video") {
            containerBody.video_url = mediaUrl;
            containerBody.media_type = "REELS";
        }
        else {
            // Text-only is not supported on Instagram — image is required
            logger_js_1.logger.warn({ igUserId }, "Instagram requires an image or video; text-only posts not supported");
            return {
                success: false,
                errorMessage: "Instagram requires an image or video. Text-only posts are not supported.",
            };
        }
        const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(containerBody),
            signal: AbortSignal.timeout(30_000),
        });
        const containerData = (await containerRes.json());
        if (!containerRes.ok || !containerData.id) {
            const msg = containerData.error?.message ?? `HTTP ${containerRes.status}`;
            logger_js_1.logger.error({ igUserId, error: containerData.error }, "Instagram container creation failed");
            return { success: false, errorMessage: msg, rawResponse: containerData };
        }
        const containerId = containerData.id;
        logger_js_1.logger.info({ igUserId, containerId }, "Instagram container created");
        // Step 2: publish container
        const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
            signal: AbortSignal.timeout(30_000),
        });
        const publishData = (await publishRes.json());
        if (!publishRes.ok || !publishData.id) {
            const msg = publishData.error?.message ?? `HTTP ${publishRes.status}`;
            logger_js_1.logger.error({ igUserId, containerId, error: publishData.error }, "Instagram publish failed");
            return { success: false, errorMessage: msg, rawResponse: publishData };
        }
        logger_js_1.logger.info({ igUserId, mediaId: publishData.id }, "Instagram publish success");
        return { success: true, externalPostId: publishData.id, rawResponse: publishData };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger_js_1.logger.error({ igUserId, err }, "Instagram publishPost threw");
        return { success: false, errorMessage: msg };
    }
}
// ─── Comments ─────────────────────────────────────────────────────────────────
async function getComments(opts) {
    const { accessToken, mediaId } = opts;
    const url = new URL(`${GRAPH}/${mediaId}/comments`);
    url.searchParams.set("fields", "id,text,username,timestamp");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json());
    if (data.error) {
        logger_js_1.logger.warn({ mediaId, error: data.error }, "Instagram getComments error");
        return [];
    }
    return (data.data ?? []).map((c) => ({
        externalId: c.id,
        commenterName: c.username,
        text: c.text,
        timestamp: c.timestamp,
    }));
}
async function replyToComment(opts) {
    const { accessToken, commentId, message } = opts;
    const res = await fetch(`${GRAPH}/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: accessToken }),
        signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json());
    if (!res.ok || data.error) {
        const msg = data.error?.message ?? `HTTP ${res.status}`;
        logger_js_1.logger.error({ commentId, error: data.error }, "Instagram replyToComment failed");
        return { success: false, errorMessage: msg, rawResponse: data };
    }
    logger_js_1.logger.info({ commentId, replyId: data.id }, "Instagram reply posted");
    return { success: true, externalPostId: data.id, rawResponse: data };
}
async function instagramPublish(opts) {
    return publishPost(opts);
}
async function instagramGetComments(opts) {
    return getComments(opts);
}
async function instagramReplyToComment(opts) {
    return replyToComment(opts);
}
//# sourceMappingURL=instagram.js.map