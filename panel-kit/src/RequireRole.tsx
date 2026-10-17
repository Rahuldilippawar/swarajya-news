"use client";

import type { Role } from "@swarajya/shared";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { logout, useAuth } from "./AuthProvider";

/**
 * Client-side route guard. This only controls what the UI shows — every read
 * and write is independently enforced by Firestore Security Rules and Cloud
 * Functions using the same custom claim.
 */
export function RequireRole({ allowed, children }: { allowed: readonly Role[]; children: ReactNode }) {
  const { status, role, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  if (status === "error") return <p className="panel-alert" role="alert">{error}</p>;
  if (status !== "signed-in") return <p className="panel-muted">Loading…</p>;

  if (!role || !allowed.includes(role)) {
    return (
      <div className="panel-card" role="alert">
        <h1>Access denied</h1>
        <p>Your account does not have permission to use this panel. Contact the Swarajya News administrator.</p>
        <button type="button" onClick={() => logout()}>Sign out</button>
      </div>
    );
  }
  return <>{children}</>;
}
