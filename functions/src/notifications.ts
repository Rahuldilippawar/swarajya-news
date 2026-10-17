import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError } from "firebase-functions/v2/https";
import {
  COLLECTIONS,
  hasPermission,
  NOTIFICATION_LIMITS,
  notificationJobId,
  PUBLIC_STATUS,
  topicFor,
  type CallableResponse,
  type NewsDoc,
  type NotificationTarget,
} from "@swarajya/shared";
import { db, writeAuditLog } from "./admin";
import type { Caller } from "./users";
import { asPayload, requireString } from "./validate";

export interface PushMessage {
  topic: string;
  title: string;
  body: string;
  imageUrl?: string;
  /** Delivered to the app so a tap opens the article. */
  data: { newsId: string; slug: string };
}

/** Sends one FCM message and returns its message ID. */
export type PushSender = (message: PushMessage) => Promise<string>;

export const fcmSender: PushSender = (m) =>
  getMessaging().send({
    topic: m.topic,
    notification: { title: m.title, body: m.body, ...(m.imageUrl?.startsWith("https://") ? { imageUrl: m.imageUrl } : {}) },
    data: m.data,
    android: { priority: "high", notification: { channelId: "news", tag: m.data.newsId } },
  });

function requireTarget(value: unknown): NotificationTarget {
  const t = value as { type?: unknown; districtId?: unknown } | null;
  if (t?.type === "ALL") return { type: "ALL" };
  if (t?.type === "DISTRICT" && typeof t.districtId === "string" && /^[\w-]{1,128}$/.test(t.districtId)) {
    return { type: "DISTRICT", districtId: t.districtId };
  }
  throw new HttpsError("invalid-argument", "target must be ALL or a DISTRICT with a districtId.");
}

/**
 * Sends a push notification for a published article. Each article can be sent
 * once per audience: the job document ID is derived from both, so double
 * clicks or two editors sending at once cannot notify readers twice. A FAILED
 * job may be retried.
 */
export async function sendNotification(
  caller: Caller,
  data: unknown,
  send: PushSender = fcmSender,
): Promise<CallableResponse<"sendNotification">> {
  if (!hasPermission(caller.role, "notifications.send")) {
    throw new HttpsError("permission-denied", "You are not allowed to send notifications.");
  }
  const payload = asPayload(data);
  const newsId = requireString(payload, "newsId", { max: 128 });
  const title = requireString(payload, "title", { max: NOTIFICATION_LIMITS.title });
  const body = requireString(payload, "body", { max: NOTIFICATION_LIMITS.body });
  const target = requireTarget(payload.target);

  const newsRef = db.collection(COLLECTIONS.news).doc(newsId);
  const jobId = notificationJobId(newsId, target);
  const jobRef = db.collection(COLLECTIONS.notifications).doc(jobId);
  const topic = topicFor(target);
  // Stored on the job so the history can show the sender to roles that cannot read staff profiles.
  const senderName = ((await db.collection(COLLECTIONS.users).doc(caller.uid).get()).get("fullName") as string | undefined) ?? caller.uid;

  // Claim the job atomically before sending.
  const article = await db.runTransaction(async (tx) => {
    const [newsSnap, jobSnap] = await Promise.all([tx.get(newsRef), tx.get(jobRef)]);
    if (!newsSnap.exists) throw new HttpsError("not-found", "News not found.");
    const news = newsSnap.data() as NewsDoc;
    if (news.status !== PUBLIC_STATUS) {
      throw new HttpsError("failed-precondition", "Only published news can be sent as a notification.");
    }
    if (target.type === "DISTRICT") {
      const district = await tx.get(db.collection(COLLECTIONS.locations).doc(target.districtId));
      if (district.get("type") !== "DISTRICT") throw new HttpsError("invalid-argument", "Unknown district.");
    }
    if (jobSnap.exists && jobSnap.get("status") !== "FAILED") {
      throw new HttpsError(
        "already-exists",
        jobSnap.get("status") === "SENT"
          ? "A notification for this news has already been sent to this audience."
          : "This notification is already being sent.",
      );
    }
    const job = {
      notificationId: jobId,
      newsId,
      slug: news.slug,
      title,
      body,
      targetType: target.type,
      ...(target.type === "DISTRICT" ? { targetValue: target.districtId } : {}),
      topic,
      createdBy: caller.uid,
      createdByName: senderName,
      status: "SENDING",
      attempts: ((jobSnap.get("attempts") as number | undefined) ?? 0) + 1,
      error: FieldValue.delete(),
    };
    if (jobSnap.exists) tx.update(jobRef, job);
    else tx.create(jobRef, { ...job, error: null, createdAt: FieldValue.serverTimestamp() });
    return news;
  });

  try {
    const providerMessageId = await send({
      topic,
      title,
      body,
      imageUrl: article.thumbnailUrl,
      data: { newsId, slug: article.slug },
    });
    await jobRef.update({ status: "SENT", providerMessageId, sentAt: FieldValue.serverTimestamp() });
    await writeAuditLog({
      actorId: caller.uid,
      action: "NOTIFICATION_SENT",
      targetType: "news",
      targetId: newsId,
      relevantMetadata: { topic, title },
    });
    return { notificationId: jobId, status: "SENT", providerMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : String(err);
    await jobRef.update({ status: "FAILED", error: message });
    await writeAuditLog({
      actorId: caller.uid,
      action: "NOTIFICATION_FAILED",
      targetType: "news",
      targetId: newsId,
      relevantMetadata: { topic, error: message },
    });
    // "aborted", not "unavailable": clients report "unavailable" as a network problem on the editor's side.
    throw new HttpsError("aborted", "Firebase Cloud Messaging did not accept the notification. It is marked FAILED in the history; you can retry.");
  }
}
