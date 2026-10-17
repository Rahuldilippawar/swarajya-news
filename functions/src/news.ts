import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  canTransition,
  COLLECTIONS,
  NEWS_STATUSES,
  newsSlug,
  parseYouTubeUrl,
  reviewActionFor,
  validateNews,
  youTubeThumbnailUrl,
  type CallableResponse,
  type NewsDoc,
  type NewsStatus,
} from "@swarajya/shared";
import { db, writeAuditLog } from "./admin";
import type { Caller } from "./users";
import { asPayload, optionalString, requireString } from "./validate";
import { verifyYouTubeVideo, type VideoCheck, type VideoVerifier } from "./youtube";

export interface NewsDeps {
  verifyVideo: VideoVerifier;
}

const defaultDeps: NewsDeps = { verifyVideo: verifyYouTubeVideo };

/** Transitions that put the article in front of editors or the public, so the video must be checked. */
const VERIFY_VIDEO_ON: readonly NewsStatus[] = ["SUBMITTED", "PUBLISHED"];

const CHECK_ERROR_CODES = {
  INVALID_TRANSITION: "failed-precondition",
  FORBIDDEN: "permission-denied",
  REMARKS_REQUIRED: "invalid-argument",
} as const;

function videoIdOf(doc: Partial<NewsDoc>): string | null {
  if (!doc.youtubeUrl?.trim()) return null;
  const parsed = parseYouTubeUrl(doc.youtubeUrl);
  if (!parsed.ok) throw new HttpsError("failed-precondition", `YouTube link: ${parsed.reason}`);
  return parsed.videoId;
}

/**
 * Moves an article through the editorial workflow (shared/src/newsStatus.ts).
 * This is the only way an article's status can change: Security Rules block
 * clients from writing `status`, approval fields and publication fields.
 */
export async function transitionNews(
  caller: Caller,
  data: unknown,
  deps: NewsDeps = defaultDeps,
): Promise<CallableResponse<"transitionNews">> {
  const payload = asPayload(data);
  const newsId = requireString(payload, "newsId", { max: 128 });
  const to = payload.to as NewsStatus;
  if (!NEWS_STATUSES.includes(to)) throw new HttpsError("invalid-argument", "Unknown target status.");
  const remarks = optionalString(payload, "remarks", { min: 0, max: 1000 }) || undefined;

  const ref = db.collection(COLLECTIONS.news).doc(newsId);

  // Network calls cannot run inside a transaction, so check the video first and
  // confirm inside the transaction that the article still points at it.
  let video: { videoId: string; check: VideoCheck } | null = null;
  if (VERIFY_VIDEO_ON.includes(to)) {
    const before = await ref.get();
    if (!before.exists) throw new HttpsError("not-found", "News not found.");
    const videoId = videoIdOf(before.data() as NewsDoc);
    if (videoId) video = { videoId, check: await deps.verifyVideo(videoId) };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "News not found.");
    const doc = snap.data() as NewsDoc;
    const from = doc.status;

    const check = canTransition(from, to, { role: caller.role, isAuthor: doc.reporterUid === caller.uid, remarks });
    if (!check.ok) throw new HttpsError(CHECK_ERROR_CODES[check.code], check.reason);

    if (VERIFY_VIDEO_ON.includes(to) && videoIdOf(doc) !== (video?.videoId ?? null)) {
      throw new HttpsError("aborted", "The article changed while it was being saved. Please try again.");
    }

    if (to === "SUBMITTED") {
      const errors = validateNews(doc, "submit");
      const messages = Object.values(errors);
      if (messages.length > 0) throw new HttpsError("failed-precondition", messages.join(" "), { fields: errors });
    }

    if (to === "PUBLISHED" && video?.check.status === "UNAVAILABLE") {
      throw new HttpsError(
        "failed-precondition",
        "The YouTube video is private, deleted or does not allow embedding. Fix it on YouTube or remove the link before publishing.",
      );
    }

    const update: Record<string, unknown> = { status: to, updatedAt: FieldValue.serverTimestamp() };
    let slug = doc.slug;

    if (video) {
      Object.assign(update, {
        youtubeVideoId: video.videoId,
        videoProvider: "YOUTUBE",
        videoStatus: video.check.status,
        videoTitle: video.check.title ?? FieldValue.delete(),
      });
    } else if (VERIFY_VIDEO_ON.includes(to)) {
      Object.assign(update, {
        youtubeVideoId: FieldValue.delete(),
        videoProvider: FieldValue.delete(),
        videoStatus: FieldValue.delete(),
        videoTitle: FieldValue.delete(),
      });
    }

    if (to === "SUBMITTED") update.submittedAt = FieldValue.serverTimestamp();
    if (to === "APPROVED" && from === "UNDER_REVIEW") {
      update.approvedBy = caller.uid;
      update.approvedAt = FieldValue.serverTimestamp();
    }
    if (to === "PUBLISHED") {
      const clash = slug
        ? (await tx.get(db.collection(COLLECTIONS.news).where("slug", "==", slug).limit(2))).docs.some((d) => d.id !== newsId)
        : true;
      if (clash) slug = newsSlug(doc.headline);
      update.slug = slug;
      update.publishedAt = FieldValue.serverTimestamp();
      if (!doc.thumbnailUrl && video) update.thumbnailUrl = youTubeThumbnailUrl(video.videoId);
    }

    const action = reviewActionFor(from, to);
    if (action) {
      update.lastReview = {
        action,
        reviewerId: caller.uid,
        at: FieldValue.serverTimestamp(),
        ...(remarks ? { remarks } : {}),
      };
      const reviewRef = db.collection(COLLECTIONS.editorialReviews).doc();
      tx.set(reviewRef, {
        reviewId: reviewRef.id,
        newsId,
        reviewerId: caller.uid,
        action,
        ...(remarks ? { remarks } : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await writeAuditLog(
      {
        actorId: caller.uid,
        action: `NEWS_${to}`,
        targetType: "news",
        targetId: newsId,
        relevantMetadata: { from, to, ...(remarks ? { remarks } : {}) },
      },
      tx,
    );
    tx.update(ref, update);

    return { newsId, status: to, slug, videoStatus: video?.check.status ?? null };
  });
}
