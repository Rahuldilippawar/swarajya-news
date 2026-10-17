import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@swarajya/shared";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export const REGION = "asia-south1";

export async function writeAuditLog(entry: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  relevantMetadata?: Record<string, unknown>;
}): Promise<void> {
  const ref = db.collection(COLLECTIONS.auditLogs).doc();
  await ref.set({ logId: ref.id, ...entry, timestamp: FieldValue.serverTimestamp() });
}
