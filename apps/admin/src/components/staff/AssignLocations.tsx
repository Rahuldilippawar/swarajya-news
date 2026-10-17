"use client";

import { callFunction, errorMessage } from "@swarajya/panel-kit";
import type { LocationDoc } from "@swarajya/shared";
import { useState } from "react";

/** Shows a reporter's assigned districts and lets a manager change them. */
export function AssignLocations({
  uid,
  assigned,
  districts,
  editable,
}: {
  uid: string;
  assigned: string[];
  districts: LocationDoc[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(assigned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = assigned.map((id) => districts.find((d) => d.locationId === id)?.name ?? id);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await callFunction("updateStaffProfile", { uid, assignedLocations: selected });
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <span>
        {names.length ? names.join(", ") : <span className="panel-muted">None</span>}
        {editable && (
          <>
            {" "}
            <button type="button" className="panel-link" onClick={() => { setSelected(assigned); setOpen(true); }}>Edit</button>
          </>
        )}
      </span>
    );
  }

  return (
    <div className="panel-form-stack" style={{ minWidth: 220 }}>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
        {districts.filter((d) => d.isActive || selected.includes(d.locationId)).map((d) => (
          <label key={d.locationId} className="panel-check" style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={selected.includes(d.locationId)}
              onChange={(e) =>
                setSelected((s) => (e.target.checked ? [...s, d.locationId] : s.filter((id) => id !== d.locationId)))
              }
            />
            {d.name}
          </label>
        ))}
      </div>
      {error && <span className="panel-field-error">{error}</span>}
      <div className="panel-row">
        <button type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="panel-link" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
