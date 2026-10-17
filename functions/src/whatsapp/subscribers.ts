import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  COLLECTIONS,
  hasPermission,
  normalizePhone,
  subscriberId,
  WHATSAPP_GROUP_ALL,
  type CallableResponse,
} from "@swarajya/shared";
import { db, writeAuditLog } from "../admin";
import type { Caller } from "../users";
import { asPayload, optionalString, requireString } from "../validate";

const MAX_ENTRIES = 500;
const subscribers = () => db.collection(COLLECTIONS.whatsappSubscribers);

export function requireWhatsAppPermission(caller: Caller): void {
  if (!hasPermission(caller.role, "whatsapp.send")) {
    throw new HttpsError("permission-denied", "You are not allowed to manage WhatsApp distribution.");
  }
}

async function validDistricts(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const snaps = await db.getAll(...[...new Set(ids)].map((id) => db.collection(COLLECTIONS.locations).doc(id)));
  return new Set(snaps.filter((s) => s.exists && s.get("type") === "DISTRICT").map((s) => s.id));
}

/**
 * Adds or updates subscribers. Every entry needs recorded consent; people who
 * opted out are never re-subscribed by an import (only by their own START
 * message or an explicit status change with new consent).
 */
export async function addWhatsAppSubscribers(caller: Caller, data: unknown): Promise<CallableResponse<"addWhatsAppSubscribers">> {
  requireWhatsAppPermission(caller);
  const payload = asPayload(data);
  const consentSource = requireString(payload, "consentSource", { min: 3, max: 200 });
  const entries = payload.entries;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) {
    throw new HttpsError("invalid-argument", `entries must be a list of 1–${MAX_ENTRIES} people.`);
  }

  const invalid: string[] = [];
  const parsed = new Map<string, { phone: string; name?: string; districtIds: string[] }>();
  for (const raw of entries as Record<string, unknown>[]) {
    const phone = typeof raw?.phone === "string" ? normalizePhone(raw.phone) : null;
    if (!phone) {
      invalid.push(String(raw?.phone ?? ""));
      continue;
    }
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 100) : undefined;
    const districtIds = Array.isArray(raw.districtIds) ? raw.districtIds.filter((d): d is string => typeof d === "string").slice(0, 10) : [];
    // The same person may appear twice (e.g. "98765 43210" and "+919876543210"): merge, never drop details.
    const seen = parsed.get(phone);
    parsed.set(phone, {
      phone,
      name: name ?? seen?.name,
      districtIds: [...new Set([...(seen?.districtIds ?? []), ...districtIds])],
    });
  }
  const districts = await validDistricts([...parsed.values()].flatMap((p) => p.districtIds));

  let added = 0;
  let updated = 0;
  let skippedOptedOut = 0;
  const items = [...parsed.values()];
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const snaps = await db.getAll(...chunk.map((p) => subscribers().doc(subscriberId(p.phone))));
    const batch = db.batch();
    chunk.forEach((p, j) => {
      const snap = snaps[j]!;
      const groups = [WHATSAPP_GROUP_ALL, ...p.districtIds.filter((d) => districts.has(d))];
      if (!snap.exists) {
        added++;
        batch.set(snap.ref, {
          phone: p.phone,
          ...(p.name ? { name: p.name } : {}),
          groups,
          status: "SUBSCRIBED",
          consent: { source: consentSource, recordedBy: caller.uid, at: FieldValue.serverTimestamp() },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (snap.get("status") === "OPTED_OUT") {
        skippedOptedOut++;
      } else {
        updated++;
        batch.update(snap.ref, {
          ...(p.name ? { name: p.name } : {}),
          groups: FieldValue.arrayUnion(...groups),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
    await batch.commit();
  }

  await writeAuditLog({
    actorId: caller.uid,
    action: "WHATSAPP_SUBSCRIBERS_ADDED",
    targetType: "whatsapp",
    targetId: "subscribers",
    relevantMetadata: { added, updated, skippedOptedOut, invalid: invalid.length, consentSource },
  });
  return { added, updated, skippedOptedOut, invalid };
}

export async function setWhatsAppSubscriberStatus(
  caller: Caller,
  data: unknown,
): Promise<CallableResponse<"setWhatsAppSubscriberStatus">> {
  requireWhatsAppPermission(caller);
  const payload = asPayload(data);
  const phone = normalizePhone(requireString(payload, "phone", { max: 30 }));
  if (!phone) throw new HttpsError("invalid-argument", "Not a valid phone number.");
  const status = payload.status;
  if (status !== "SUBSCRIBED" && status !== "OPTED_OUT") throw new HttpsError("invalid-argument", "status must be SUBSCRIBED or OPTED_OUT.");
  const consentSource = optionalString(payload, "consentSource", { min: 3, max: 200 });
  if (status === "SUBSCRIBED" && !consentSource) {
    throw new HttpsError("invalid-argument", "Re-subscribing needs a new consent record (how did they agree?).");
  }

  const ref = subscribers().doc(subscriberId(phone));
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Subscriber not found.");
  await ref.update(
    status === "OPTED_OUT"
      ? { status, optedOutAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
      : {
          status,
          optedOutAt: FieldValue.delete(),
          consent: { source: consentSource, recordedBy: caller.uid, at: FieldValue.serverTimestamp() },
          updatedAt: FieldValue.serverTimestamp(),
        },
  );
  await writeAuditLog({
    actorId: caller.uid,
    action: status === "OPTED_OUT" ? "WHATSAPP_OPTED_OUT" : "WHATSAPP_RESUBSCRIBED",
    targetType: "whatsapp",
    targetId: subscriberId(phone),
  });
  return { phone, status };
}
