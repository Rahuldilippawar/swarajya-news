"use client";

import { canTransition, findTransition, nextStatuses, transitionLabel, type NewsStatus, type Role } from "@swarajya/shared";
import { useState } from "react";

/**
 * Buttons for the workflow steps the current user may take. The Cloud
 * Function re-checks every rule; this only hides buttons that would fail.
 */
export function StatusActions({
  status,
  role,
  isAuthor,
  busy,
  onTransition,
}: {
  status: NewsStatus;
  role: Role | null;
  isAuthor: boolean;
  busy: boolean;
  onTransition: (to: NewsStatus, remarks?: string) => Promise<boolean>;
}) {
  const [pending, setPending] = useState<NewsStatus | null>(null);
  const [remarks, setRemarks] = useState("");
  const options = nextStatuses(status).filter((to) => canTransition(status, to, { role, isAuthor, remarks: "x" }).ok);

  if (options.length === 0) return <p className="panel-muted">No workflow actions available.</p>;

  async function run(to: NewsStatus) {
    if (findTransition(status, to)?.requiresRemarks && pending !== to) {
      setPending(to);
      return;
    }
    const ok = await onTransition(to, remarks.trim() || undefined);
    if (ok) {
      setPending(null);
      setRemarks("");
    }
  }

  return (
    <div className="panel-form-stack">
      <div className="panel-row">
        {options.map((to) => (
          <button
            key={to}
            type="button"
            className={to === "REJECTED" || to === "ARCHIVED" ? "panel-danger" : to === "PUBLISHED" || to === "SUBMITTED" ? undefined : "panel-secondary"}
            disabled={busy}
            onClick={() => run(to)}
          >
            {transitionLabel(status, to)}
          </button>
        ))}
      </div>
      {pending && (
        <label>
          Remarks for the reporter <span className="panel-hint">required</span>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000} style={{ minHeight: 80 }} />
          <div className="panel-row">
            <button type="button" disabled={busy || !remarks.trim()} onClick={() => run(pending)}>
              Confirm: {transitionLabel(status, pending)}
            </button>
            <button type="button" className="panel-link" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </label>
      )}
    </div>
  );
}
