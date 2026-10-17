import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, optKeyword, subscriberId, WHATSAPP_GROUP_ALL, type WhatsAppRecipientDoc } from "@swarajya/shared";
import { db } from "../admin";

/** Meta signs webhook bodies with the app secret (X-Hub-Signature-256: sha256=<hex>). */
export function verifySignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"));
  const given = Buffer.from(header.slice("sha256=".length));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

interface StatusUpdate {
  id: string;
  status: string;
  errors?: { title?: string; message?: string }[];
}

interface InboundMessage {
  from: string;
  type: string;
  text?: { body?: string };
}

interface WebhookPayload {
  entry?: { changes?: { value?: { statuses?: StatusUpdate[]; messages?: InboundMessage[] } }[] }[];
}

const RANK: Record<WhatsAppRecipientDoc["status"], number> = { FAILED: -1, ACCEPTED: 0, SENT: 1, DELIVERED: 2, READ: 3 };
const FROM_META: Record<string, WhatsAppRecipientDoc["status"]> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

/** Applies one delivery receipt. Statuses only move forward; counts on the job follow. */
async function applyStatus(update: StatusUpdate): Promise<boolean> {
  const next = FROM_META[update.status];
  if (!next) return false;
  const pointer = await db.collection(COLLECTIONS.whatsappDeliveries).doc(update.id).get();
  if (!pointer.exists) return false; // Not one of our bulletins.
  const jobRef = db.collection(COLLECTIONS.whatsappMessages).doc(pointer.get("jobId") as string);
  const recipientRef = jobRef.collection("recipients").doc(pointer.get("subscriberId") as string);

  return db.runTransaction(async (tx) => {
    const current = (await tx.get(recipientRef)).get("status") as WhatsAppRecipientDoc["status"] | undefined;
    if (!current || current === "FAILED") return false;
    const failedNow = next === "FAILED";
    if (!failedNow && RANK[next] <= RANK[current]) return false;

    const counts: Record<string, FieldValue> = {};
    if (failedNow) {
      counts["counts.failed"] = FieldValue.increment(1);
      counts["counts.accepted"] = FieldValue.increment(-1);
    }
    if (RANK[next] >= RANK.DELIVERED && RANK[current] < RANK.DELIVERED) counts["counts.delivered"] = FieldValue.increment(1);
    if (next === "READ") counts["counts.read"] = FieldValue.increment(1);

    const error = update.errors?.map((e) => e.message ?? e.title).filter(Boolean).join("; ").slice(0, 300);
    tx.update(recipientRef, { status: next, ...(error ? { error } : {}), updatedAt: FieldValue.serverTimestamp() });
    tx.update(jobRef, { ...counts, ...(failedNow ? { status: "PARTIAL" } : {}), updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/** STOP / START replies to the business number opt people out or back in. */
async function applyKeyword(message: InboundMessage): Promise<"OUT" | "IN" | null> {
  if (message.type !== "text" || !message.text?.body) return null;
  const keyword = optKeyword(message.text.body);
  if (!keyword) return null;
  const phone = `+${message.from.replace(/\D/g, "")}`;
  const ref = db.collection(COLLECTIONS.whatsappSubscribers).doc(subscriberId(phone));
  const snap = await ref.get();
  if (keyword === "OUT") {
    if (snap.exists) await ref.update({ status: "OPTED_OUT", optedOutAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return "OUT";
  }
  // Messaging START is itself a recorded opt-in.
  const consent = { source: "WhatsApp START message", recordedBy: "whatsapp", at: FieldValue.serverTimestamp() };
  if (snap.exists) {
    await ref.update({ status: "SUBSCRIBED", optedOutAt: FieldValue.delete(), consent, updatedAt: FieldValue.serverTimestamp() });
  } else {
    await ref.set({
      phone,
      groups: [WHATSAPP_GROUP_ALL],
      status: "SUBSCRIBED",
      consent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return "IN";
}

export async function handleWebhook(payload: WebhookPayload): Promise<{ statuses: number; optOuts: number; optIns: number }> {
  const result = { statuses: 0, optOuts: 0, optIns: 0 };
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const s of change.value?.statuses ?? []) if (await applyStatus(s)) result.statuses++;
      for (const m of change.value?.messages ?? []) {
        const k = await applyKeyword(m);
        if (k === "OUT") result.optOuts++;
        if (k === "IN") result.optIns++;
      }
    }
  }
  return result;
}
