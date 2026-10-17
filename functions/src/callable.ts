import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { isRole, type CallableName, type CallableResponse } from "@swarajya/shared";
import type { Caller } from "./users";

// Turn on once App Check is registered for the web apps and Android app
// (set ENFORCE_APP_CHECK=true in functions/.env.<project>).
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";

/**
 * Wraps a handler as a callable function: requires a signed-in caller, passes
 * the role from the verified token, and hides unexpected errors from clients.
 */
export function callable<N extends CallableName>(
  name: N,
  handler: (caller: Caller, data: unknown) => Promise<CallableResponse<N>>,
) {
  return onCall({ enforceAppCheck }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const role = request.auth.token.role;
    const caller: Caller = { uid: request.auth.uid, role: isRole(role) ? role : null };
    try {
      return await handler(caller, request.data);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error(`${name} failed`, { uid: caller.uid, error: err });
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  });
}
