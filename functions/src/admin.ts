import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Transaction } from "firebase-admin/firestore";
import { COLLECTIONS } from "@swarajya/shared";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export const REGION = "asia-south1";

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  relevantMetadata?: Record<string, unknown>;
}

/** Writes an audit log entry, inside `tx` when given so it commits atomically with the change. */
export async function writeAuditLog(entry: AuditEntry, tx?: Transaction): Promise<void> {
  const ref = db.collection(COLLECTIONS.auditLogs).doc();
  const data = { logId: ref.id, ...entry, timestamp: FieldValue.serverTimestamp() };
  if (tx) tx.set(ref, data);
  else await ref.set(data);
}
