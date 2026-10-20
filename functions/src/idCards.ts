import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, defaultDesignation, ID_CARD_VALID_DAYS, isRole, type IdCardDoc, type UserDoc } from "@swarajya/shared";
import { db } from "./admin";

const CARD_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 20 random URL-safe characters (~114 bits): the QR code's address cannot be guessed. */
export function newCardId(): string {
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => CARD_ID_CHARS[b % CARD_ID_CHARS.length]).join("");
}

/** The district a staff member covers: an assigned district, or the district above an assigned taluka/village. */
async function districtName(assigned: string[]): Promise<string | null> {
  if (assigned.length === 0) return null;
  const snaps = await db.getAll(...assigned.map((id) => db.collection(COLLECTIONS.locations).doc(id)));
  for (const s of snaps) if (s.get("type") === "DISTRICT") return (s.get("name") as string) ?? null;
  // A taluka's parent is a district; a village's parent is a taluka whose parent is a district.
  let parentId = snaps.find((s) => s.exists)?.get("parentLocationId") as string | undefined;
  for (let depth = 0; parentId && depth < 3; depth++) {
    const parent = await db.collection(COLLECTIONS.locations).doc(parentId).get();
    if (parent.get("type") === "DISTRICT") return (parent.get("name") as string) ?? null;
    parentId = parent.get("parentLocationId") as string | undefined;
  }
  return null;
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/**
 * Creates or refreshes the public card record for a staff member from their
 * profile. Called after every change to a staff account, so the card and its
 * QR verification always show the current name, designation, photo and status.
 */
export async function syncIdCard(uid: string, opts: { renew?: boolean; now?: Date } = {}): Promise<string | null> {
  const userRef = db.collection(COLLECTIONS.users).doc(uid);
  const user = (await userRef.get()).data() as Partial<UserDoc> | undefined;
  if (!user || !isRole(user.role)) return null;

  let cardId = user.cardId;
  if (!cardId) {
    cardId = newCardId();
    await userRef.set({ cardId }, { merge: true });
  }
  const cardRef = db.collection(COLLECTIONS.idCards).doc(cardId);
  const existing = await cardRef.get();
  const now = opts.now ?? new Date();
  const issuedAt = !existing.exists || opts.renew ? Timestamp.fromDate(now) : (existing.get("issuedAt") as Timestamp);

  const card: Omit<IdCardDoc, "updatedAt"> & { updatedAt: FieldValue } = {
    cardId,
    fullName: user.fullName ?? "",
    role: user.role,
    designation: user.designation?.trim() || defaultDesignation(user.role, await districtName(user.assignedLocations ?? [])),
    photoUrl: user.photoUrl ?? null,
    cardNumber: user.reporterId ?? `SN-S-${cardId.slice(0, 6).toUpperCase()}`,
    status: user.status ?? "ACTIVE",
    issuedAt,
    validUntil: !existing.exists || opts.renew ? Timestamp.fromDate(addDays(now, ID_CARD_VALID_DAYS)) : (existing.get("validUntil") as Timestamp),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await cardRef.set(card);
  return cardId;
}
