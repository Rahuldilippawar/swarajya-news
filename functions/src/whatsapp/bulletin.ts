import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  bulletinJobId,
  bulletinParams,
  COLLECTIONS,
  MAX_BULLETIN_RECIPIENTS,
  PUBLIC_STATUS,
  renderBulletin,
  WHATSAPP_GROUP_ALL,
  type CallableResponse,
  type NewsDoc,
  type WhatsAppRecipientDoc,
} from "@swarajya/shared";
import { db, writeAuditLog } from "../admin";
import type { Caller } from "../users";
import { asPayload, requireString } from "../validate";
import type { WhatsAppProvider } from "./provider";
import { requireWhatsAppPermission } from "./subscribers";

/** Parallel requests to the provider; keeps well under Meta's per-second limits. */
const CONCURRENCY = 5;

/** A job still SENDING after this long crashed mid-way (functions time out at 9 min) and may be retried. */
const STALE_SENDING_MS = 15 * 60 * 1000;

export interface BulletinDeps {
  provider: WhatsAppProvider;
  siteUrl: string;
}

const jobs = () => db.collection(COLLECTIONS.whatsappMessages);

async function loadArticle(newsId: string): Promise<NewsDoc> {
  const snap = await db.collection(COLLECTIONS.news).doc(newsId).get();
  if (!snap.exists) throw new HttpsError("not-found", "News not found.");
  const news = snap.data() as NewsDoc;
  if (news.status !== PUBLIC_STATUS) throw new HttpsError("failed-precondition", "Only published news can be sent on WhatsApp.");
  return news;
}

async function requireGroup(group: string): Promise<void> {
  if (group === WHATSAPP_GROUP_ALL) return;
  const snap = await db.collection(COLLECTIONS.locations).doc(group).get();
  if (snap.get("type") !== "DISTRICT") throw new HttpsError("invalid-argument", "Unknown recipient group.");
}

function articleUrl(siteUrl: string, slug: string): string {
  if (!/^https:\/\//.test(siteUrl)) {
    throw new HttpsError("failed-precondition", "PUBLIC_SITE_URL is not configured for Cloud Functions, so articles have no link.");
  }
  return `${siteUrl.replace(/\/+$/, "")}/news/${encodeURIComponent(slug)}`;
}

function recipientsQuery(group: string) {
  return db
    .collection(COLLECTIONS.whatsappSubscribers)
    .where("groups", "array-contains", group)
    .where("status", "==", "SUBSCRIBED");
}

async function countRecipients(group: string): Promise<number> {
  return (await recipientsQuery(group).count().get()).data().count;
}

export async function previewWhatsAppBulletin(
  caller: Caller,
  data: unknown,
  deps: BulletinDeps,
): Promise<CallableResponse<"previewWhatsAppBulletin">> {
  requireWhatsAppPermission(caller);
  const payload = asPayload(data);
  const newsId = requireString(payload, "newsId", { max: 128 });
  const group = requireString(payload, "group", { max: 128 });
  const [news] = await Promise.all([loadArticle(newsId), requireGroup(group)]);
  const params = bulletinParams({ headline: news.headline, summary: news.summary, isBreaking: news.isBreaking, url: articleUrl(deps.siteUrl, news.slug) });
  const [recipients, job] = await Promise.all([countRecipients(group), jobs().doc(bulletinJobId(newsId, group)).get()]);
  return {
    preview: renderBulletin(params),
    recipients,
    templateName: deps.provider.templateName,
    alreadySent: job.exists && job.get("status") === "SENT",
    tooMany: recipients > MAX_BULLETIN_RECIPIENTS,
  };
}

async function pool<T>(items: T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await run(items[next++]!);
    }),
  );
}

/**
 * Sends an article to a recipient group as the approved template. One job per
 * article and group: a second send is refused, and retrying a PARTIAL/FAILED
 * job only re-sends to recipients that failed. The editor must confirm the
 * recipient count shown in the preview.
 */
export async function sendWhatsAppBulletin(
  caller: Caller,
  data: unknown,
  deps: BulletinDeps,
): Promise<CallableResponse<"sendWhatsAppBulletin">> {
  requireWhatsAppPermission(caller);
  const payload = asPayload(data);
  const newsId = requireString(payload, "newsId", { max: 128 });
  const group = requireString(payload, "group", { max: 128 });
  const expected = payload.expectedRecipients;
  if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 1) {
    throw new HttpsError("invalid-argument", "Preview the bulletin and confirm the number of recipients first.");
  }

  const [news] = await Promise.all([loadArticle(newsId), requireGroup(group)]);
  const params = bulletinParams({ headline: news.headline, summary: news.summary, isBreaking: news.isBreaking, url: articleUrl(deps.siteUrl, news.slug) });

  const recipients = (await recipientsQuery(group).limit(MAX_BULLETIN_RECIPIENTS + 1).get()).docs;
  if (recipients.length > MAX_BULLETIN_RECIPIENTS) {
    throw new HttpsError("failed-precondition", `More than ${MAX_BULLETIN_RECIPIENTS} recipients; large lists need queued sending (not set up yet).`);
  }
  if (recipients.length !== expected) {
    throw new HttpsError("failed-precondition", `The recipient list changed (now ${recipients.length}). Preview again before sending.`);
  }

  const jobRef = jobs().doc(bulletinJobId(newsId, group));
  const senderName = ((await db.collection(COLLECTIONS.users).doc(caller.uid).get()).get("fullName") as string | undefined) ?? caller.uid;
  await db.runTransaction(async (tx) => {
    const job = await tx.get(jobRef);
    const status = job.get("status") as string | undefined;
    if (status === "SENT") throw new HttpsError("already-exists", "This news has already been sent to this group on WhatsApp.");
    const lastUpdate = (job.get("updatedAt") as { toMillis(): number } | undefined)?.toMillis() ?? 0;
    if (status === "SENDING" && Date.now() - lastUpdate < STALE_SENDING_MS) {
      throw new HttpsError("already-exists", "This bulletin is already being sent.");
    }
    const fields = {
      messageId: jobRef.id,
      newsId,
      recipientGroup: group,
      templateName: deps.provider.templateName,
      preview: renderBulletin(params),
      status: "SENDING",
      attempts: ((job.get("attempts") as number | undefined) ?? 0) + 1,
      requestedBy: caller.uid,
      requestedByName: senderName,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (job.exists) tx.update(jobRef, fields);
    else {
      tx.create(jobRef, {
        ...fields,
        counts: { total: 0, accepted: 0, failed: 0, delivered: 0, read: 0 },
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });

  // On a retry, people who already received the message are skipped.
  const previous = new Map((await jobRef.collection("recipients").get()).docs.map((d) => [d.id, d.get("status") as WhatsAppRecipientDoc["status"]]));
  const pending = recipients.filter((r) => (previous.get(r.id) ?? "FAILED") === "FAILED");

  await pool(pending, CONCURRENCY, async (r) => {
    const phone = r.get("phone") as string;
    const recipientRef = jobRef.collection("recipients").doc(r.id);
    try {
      const providerMessageId = await deps.provider.sendTemplate(phone, params);
      const batch = db.batch();
      batch.set(recipientRef, { phone, status: "ACCEPTED", providerMessageId, error: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(db.collection(COLLECTIONS.whatsappDeliveries).doc(providerMessageId), { jobId: jobRef.id, subscriberId: r.id });
      await batch.commit();
    } catch (err) {
      const error = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      await recipientRef.set({ phone, status: "FAILED", error, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  });

  // Recount from the recipient records so retries and webhooks stay consistent.
  const all = (await jobRef.collection("recipients").get()).docs.map((d) => d.get("status") as WhatsAppRecipientDoc["status"]);
  const failed = all.filter((s) => s === "FAILED").length;
  const accepted = all.length - failed;
  const status = failed === 0 ? "SENT" : accepted === 0 ? "FAILED" : "PARTIAL";
  await jobRef.update({
    status,
    "counts.total": all.length,
    "counts.accepted": accepted,
    "counts.failed": failed,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    actorId: caller.uid,
    action: "WHATSAPP_BULLETIN_SENT",
    targetType: "news",
    targetId: newsId,
    relevantMetadata: { group, status, accepted, failed },
  });
  return { messageId: jobRef.id, status, counts: { total: all.length, accepted, failed } };
}
