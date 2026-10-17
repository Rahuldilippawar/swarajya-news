import { logger } from "firebase-functions";
import { HttpsError, onCall, type CallableOptions } from "firebase-functions/v2/https";
import { COLLECTIONS, isRole, type CallableName, type CallableResponse } from "@swarajya/shared";
import { db } from "./admin";
import type { Caller } from "./users";

// Turn on once App Check is registered for the web apps and Android app
// (set ENFORCE_APP_CHECK=true in functions/.env.<project>).
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";

/**
 * A suspended user's ID token stays valid until it expires (up to an hour),
 * so privileged calls also require an ACTIVE profile.
 */
export async function assertActiveCaller(uid: string): Promise<void> {
  const profile = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (profile.get("status") !== "ACTIVE") {
    throw new HttpsError("permission-denied", "Your account is not active. Contact the Swarajya News office.");
  }
}

/**
 * Wraps a handler as a callable function: requires a signed-in, active caller,
 * passes the role from the verified token, and hides unexpected errors from clients.
 */
export function callable<N extends CallableName>(
  name: N,
  handler: (caller: Caller, data: unknown) => Promise<CallableResponse<N>>,
  options: Pick<CallableOptions, "secrets" | "timeoutSeconds" | "memory"> = {},
) {
  return onCall({ enforceAppCheck, ...options }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const role = request.auth.token.role;
    const caller: Caller = { uid: request.auth.uid, role: isRole(role) ? role : null };
    try {
      await assertActiveCaller(caller.uid);
      return await handler(caller, request.data);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error(`${name} failed`, { uid: caller.uid, error: err });
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  });
}
