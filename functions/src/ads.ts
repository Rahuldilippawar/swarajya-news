import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@swarajya/shared";
import { db } from "./admin";

const AD_ID = /^[\w-]{1,128}$/;

/** "2026-10-17" in India time. */
export function indiaDate(date: Date): string {
  return new Date(date.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Counts an impression or click for an ad that is currently running (totals on
 * the ad, plus per-day counts). Anything else is ignored silently.
 */
export async function recordAdEvent(adId: unknown, type: unknown, now = new Date()): Promise<"counted" | "ignored"> {
  if (typeof adId !== "string" || !AD_ID.test(adId) || (type !== "impression" && type !== "click")) return "ignored";
  const ref = db.collection(COLLECTIONS.advertisements).doc(adId);
  const ad = await ref.get();
  const start = ad.get("startAt") as Timestamp | undefined;
  const end = ad.get("endAt") as Timestamp | undefined;
  if (!ad.exists || ad.get("isActive") !== true || !start || !end || start.toDate() > now || end.toDate() <= now) return "ignored";

  const field = type === "click" ? "clicks" : "impressions";
  const batch = db.batch();
  batch.update(ref, { [field]: FieldValue.increment(1) });
  batch.set(ref.collection("daily").doc(indiaDate(now)), { date: indiaDate(now), [field]: FieldValue.increment(1) }, { merge: true });
  await batch.commit();
  return "counted";
}
