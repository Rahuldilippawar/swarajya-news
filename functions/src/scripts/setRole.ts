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
import { isRole, ROLES } from "@swarajya/shared";
import { auth } from "../admin";
import { applyRole } from "../users";

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, role: { type: "string" }, name: { type: "string" } },
  });
  const { email, role, name } = values;
  if (!email || !isRole(role)) {
    throw new Error(`Usage: --email <email> --role <${ROLES.join("|")}> [--name "Full Name"]`);
  }

  let user = await auth.getUserByEmail(email).catch((err: { code?: string }) => {
    if (err.code === "auth/user-not-found") {
      throw new Error("No account with that e-mail. Create it first: Firebase console → Authentication → Users → Add user.");
    }
    throw err;
  });
  if (name) user = await auth.updateUser(user.uid, { displayName: name });
  const { reporterId } = await applyRole(user, role, "cli:set-role");

  console.log(`Set role ${role} for ${email} (${user.uid})${reporterId ? `, reporter ID ${reporterId}` : ""}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
