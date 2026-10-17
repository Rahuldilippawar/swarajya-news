import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, PUBLIC_STATUS } from "@swarajya/shared";
import { db } from "./admin";

const NEWS_ID = /^[\w-]{1,128}$/;

/**
 * Adds one view to a published article. Anything else (unknown IDs, drafts,
 * malformed input) is ignored silently so the endpoint reveals nothing about
 * unpublished articles.
 */
export async function recordView(newsId: unknown): Promise<"counted" | "ignored"> {
  if (typeof newsId !== "string" || !NEWS_ID.test(newsId)) return "ignored";
  const ref = db.collection(COLLECTIONS.news).doc(newsId);
  const snap = await ref.get();
  if (!snap.exists || snap.get("status") !== PUBLIC_STATUS) return "ignored";
  await ref.update({ viewCount: FieldValue.increment(1) });
  return "counted";
}
