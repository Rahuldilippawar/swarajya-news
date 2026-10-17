import { FieldValue } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { HttpsError } from "firebase-functions/v2/https";
import {
  canManageRole,
  COLLECTIONS,
  formatReporterId,
  hasPermission,
  isRole,
  type CallableRequest,
  type CallableResponse,
  type Role,
} from "@swarajya/shared";
import { auth, db, writeAuditLog } from "./admin";
import {
  asPayload,
  optionalIdList,
  optionalString,
  requireEmail,
  requireRole,
  requireStatus,
  requireString,
} from "./validate";

/** The verified identity behind a callable request. */
export interface Caller {
  uid: string;
  role: Role | null;
}

const usersCol = () => db.collection(COLLECTIONS.users);

function requireManager(caller: Caller): void {
  if (!hasPermission(caller.role, "users.manage")) {
    throw new HttpsError("permission-denied", "You are not allowed to manage staff accounts.");
  }
}

function requireCanManage(caller: Caller, role: Role, verb: string): void {
  if (!canManageRole(caller.role, role)) {
    throw new HttpsError("permission-denied", `You are not allowed to ${verb} a ${role} account.`);
  }
}

async function getAuthUser(uid: string): Promise<UserRecord> {
  try {
    return await auth.getUser(uid);
  } catch {
    throw new HttpsError("not-found", "User not found.");
  }
}

function roleOf(user: UserRecord): Role | null {
  const role = user.customClaims?.role;
  return isRole(role) ? role : null;
}

/** Allocates the next reporter ID (SN-R-0001, SN-R-0002, …) atomically. */
export async function allocateReporterId(): Promise<string> {
  const ref = db.collection(COLLECTIONS.counters).doc("reporterId");
  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const value = ((snap.get("next") as number | undefined) ?? 0) + 1;
    tx.set(ref, { next: value });
    return value;
  });
  return formatReporterId(next);
}

async function assertActiveLocations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const snaps = await db.getAll(...ids.map((id) => db.collection(COLLECTIONS.locations).doc(id)));
  const bad = snaps.filter((s) => !s.exists || s.get("isActive") !== true).map((s) => s.id);
  if (bad.length > 0) throw new HttpsError("invalid-argument", `Unknown or inactive locations: ${bad.join(", ")}.`);
}

/**
 * Sets the role claim, revokes existing sessions so the change applies on the
 * next sign-in, gives reporters an ID, and mirrors the result into users/{uid}.
 * Shared by the callable functions and the provisioning CLI.
 */
export async function applyRole(user: UserRecord, role: Role, actorId: string): Promise<{ reporterId: string | null }> {
  const ref = usersCol().doc(user.uid);
  const existing = await ref.get();
  let reporterId = (existing.get("reporterId") as string | undefined) ?? null;
  if (role === "REPORTER" && !reporterId) reporterId = await allocateReporterId();

  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });
  await auth.revokeRefreshTokens(user.uid);

  await ref.set(
    {
      uid: user.uid,
      email: user.email ?? "",
      fullName: existing.get("fullName") ?? user.displayName ?? user.email ?? "",
      role,
      status: existing.get("status") ?? (user.disabled ? "SUSPENDED" : "ACTIVE"),
      reporterId,
      assignedLocations: existing.get("assignedLocations") ?? [],
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  await writeAuditLog({
    actorId,
    action: "USER_ROLE_SET",
    targetType: "user",
    targetId: user.uid,
    relevantMetadata: { role, previousRole: roleOf(user) },
  });
  return { reporterId };
}

export async function createStaffUser(caller: Caller, data: unknown): Promise<CallableResponse<"createStaffUser">> {
  requireManager(caller);
  const payload = asPayload(data);
  const email = requireEmail(payload);
  const fullName = requireString(payload, "fullName", { max: 100 });
  const role = requireRole(payload);
  const assignedLocations = optionalIdList(payload, "assignedLocations") ?? [];
  requireCanManage(caller, role, "create");
  await assertActiveLocations(assignedLocations);

  let user: UserRecord;
  try {
    // No password is set here: the new user chooses one through the setup link.
    user = await auth.createUser({ email, displayName: fullName, emailVerified: false, disabled: false });
  } catch (err) {
    if ((err as { code?: string }).code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    throw err;
  }

  try {
    await usersCol().doc(user.uid).set({
      uid: user.uid,
      email,
      fullName,
      role,
      status: "ACTIVE",
      assignedLocations,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const { reporterId } = await applyRole(user, role, caller.uid);
    await writeAuditLog({
      actorId: caller.uid,
      action: "USER_CREATED",
      targetType: "user",
      targetId: user.uid,
      relevantMetadata: { email, role },
    });
    const passwordSetupLink = await auth.generatePasswordResetLink(email);
    return { uid: user.uid, reporterId, passwordSetupLink };
  } catch (err) {
    // Do not leave a half-created account behind.
    await Promise.allSettled([auth.deleteUser(user.uid), usersCol().doc(user.uid).delete()]);
    throw err;
  }
}

export async function setStaffRole(caller: Caller, data: unknown): Promise<CallableResponse<"setStaffRole">> {
  requireManager(caller);
  const payload = asPayload(data);
  const uid = requireString(payload, "uid", { max: 128 });
  const role = requireRole(payload);
  if (uid === caller.uid) throw new HttpsError("failed-precondition", "You cannot change your own role.");

  const user = await getAuthUser(uid);
  const current = roleOf(user);
  if (current) requireCanManage(caller, current, "change");
  requireCanManage(caller, role, "assign");

  const { reporterId } = await applyRole(user, role, caller.uid);
  return { uid, role, reporterId };
}

export async function setStaffStatus(caller: Caller, data: unknown): Promise<CallableResponse<"setStaffStatus">> {
  requireManager(caller);
  const payload = asPayload(data);
  const uid = requireString(payload, "uid", { max: 128 });
  const status = requireStatus(payload);
  if (uid === caller.uid) throw new HttpsError("failed-precondition", "You cannot change your own account status.");

  const user = await getAuthUser(uid);
  const current = roleOf(user);
  if (current) requireCanManage(caller, current, status === "SUSPENDED" ? "suspend" : "reactivate");

  // Disabling blocks new sign-ins; revoking ends existing sessions at their next token refresh.
  // Security Rules additionally check users/{uid}.status, which takes effect immediately.
  await auth.updateUser(uid, { disabled: status === "SUSPENDED" });
  if (status === "SUSPENDED") await auth.revokeRefreshTokens(uid);
  await usersCol().doc(uid).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAuditLog({
    actorId: caller.uid,
    action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
    targetType: "user",
    targetId: uid,
  });
  return { uid, status };
}

export async function updateStaffProfile(caller: Caller, data: unknown): Promise<CallableResponse<"updateStaffProfile">> {
  requireManager(caller);
  const payload = asPayload(data) as Partial<CallableRequest<"updateStaffProfile">> & Record<string, unknown>;
  const uid = requireString(payload, "uid", { max: 128 });
  const fullName = optionalString(payload, "fullName", { max: 100 });
  const assignedLocations = optionalIdList(payload, "assignedLocations");

  const user = await getAuthUser(uid);
  const current = roleOf(user);
  if (current) requireCanManage(caller, current, "edit");
  if (assignedLocations) await assertActiveLocations(assignedLocations);

  if (fullName) await auth.updateUser(uid, { displayName: fullName });
  await usersCol()
    .doc(uid)
    .set(
      {
        ...(fullName ? { fullName } : {}),
        ...(assignedLocations ? { assignedLocations } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  await writeAuditLog({
    actorId: caller.uid,
    action: "USER_PROFILE_UPDATED",
    targetType: "user",
    targetId: uid,
    relevantMetadata: { fields: [fullName && "fullName", assignedLocations && "assignedLocations"].filter(Boolean) },
  });
  return { uid };
}
