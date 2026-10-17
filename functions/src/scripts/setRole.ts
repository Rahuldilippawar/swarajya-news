/**
 * Assigns a role to an existing Firebase Auth user by setting the `role`
 * custom claim and mirroring it in users/{uid}. This is the secure way to
 * create the first SUPER_ADMIN: it needs Admin SDK credentials, which only
 * project owners have, so it cannot be triggered from any client.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npm run set-role -w functions -- --email editor@example.com --role SUPER_ADMIN
 *
 * Against the emulators, set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099,
 * FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and GCLOUD_PROJECT instead.
 */
import { parseArgs } from "node:util";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, isRole, ROLES } from "@swarajya/shared";
import { auth, db, writeAuditLog } from "../admin";

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, role: { type: "string" }, name: { type: "string" } },
  });
  const { email, role, name } = values;
  if (!email || !isRole(role)) {
    throw new Error(`Usage: --email <email> --role <${ROLES.join("|")}> [--name "Full Name"]`);
  }

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });
  // Force existing sessions to pick up the new role on their next token refresh.
  await auth.revokeRefreshTokens(user.uid);

  const ref = db.collection(COLLECTIONS.users).doc(user.uid);
  const existing = await ref.get();
  await ref.set(
    {
      uid: user.uid,
      email,
      fullName: name ?? existing.get("fullName") ?? user.displayName ?? email,
      role,
      status: "ACTIVE",
      assignedLocations: existing.get("assignedLocations") ?? [],
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  await writeAuditLog({
    actorId: "cli:set-role",
    action: "USER_ROLE_SET",
    targetType: "user",
    targetId: user.uid,
    relevantMetadata: { role, previousRole: user.customClaims?.role ?? null },
  });

  console.log(`Set role ${role} for ${email} (${user.uid}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
