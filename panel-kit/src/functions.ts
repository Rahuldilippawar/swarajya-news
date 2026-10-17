import type { CallableName, CallableRequest, CallableResponse } from "@swarajya/shared";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebase } from "./firebase";

/** Calls a Cloud Function with request/response types from `@swarajya/shared`. */
export async function callFunction<N extends CallableName>(name: N, data: CallableRequest<N>): Promise<CallableResponse<N>> {
  const fn = httpsCallable<CallableRequest<N>, CallableResponse<N>>(getFirebase().functions, name);
  return (await fn(data)).data;
}

/** A message that is safe and useful to show to staff. */
export function errorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === "functions/unavailable" || err.code === "auth/network-request-failed") {
      return "Network error. Check your connection and try again.";
    }
    if (err.code === "functions/unauthenticated") return "Your session has expired. Please sign in again.";
    if (err.code === "permission-denied" || err.code === "firestore/permission-denied") {
      return "You do not have permission to do this.";
    }
    // Callable functions send a readable message for expected errors.
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
