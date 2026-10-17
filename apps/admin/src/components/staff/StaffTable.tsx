"use client";

import { callFunction, errorMessage } from "@swarajya/panel-kit";
import { canManageRole, ROLE_LABELS, ROLES, type Role } from "@swarajya/shared";
import { useMemo, useState } from "react";
import type { StaffRow } from "./useStaff";

export function StaffTable({ rows, actorUid, actorRole }: { rows: StaffRow[]; actorUid: string; actorRole: Role }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!roleFilter || r.role === roleFilter) &&
        (!term || [r.fullName, r.email, r.reporterId ?? ""].some((v) => v.toLowerCase().includes(term))),
    );
  }, [rows, search, roleFilter]);

  async function run(uid: string, action: () => Promise<unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(uid);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="panel-section">
      <div className="panel-row panel-section">
        <h2 style={{ margin: 0 }}>Staff ({visible.length})</h2>
        <span className="panel-spacer" />
        <input type="search" placeholder="Search name, email or reporter ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")} aria-label="Filter by role">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      <div className="panel-table-wrap">
        <table className="panel-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Reporter ID</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const editable = row.uid !== actorUid && canManageRole(actorRole, row.role);
              const busy = pending === row.uid;
              const suspended = row.status === "SUSPENDED";
              return (
                <tr key={row.uid}>
                  <td>{row.fullName}</td>
                  <td>{row.email}</td>
                  <td>{row.reporterId ?? "—"}</td>
                  <td>
                    {editable ? (
                      <select
                        value={row.role}
                        disabled={busy}
                        aria-label={`Role for ${row.fullName}`}
                        onChange={(e) => {
                          const role = e.target.value as Role;
                          void run(row.uid, () => callFunction("setStaffRole", { uid: row.uid, role }),
                            `Change ${row.fullName}'s role to ${ROLE_LABELS[role]}? They will be signed out.`);
                        }}
                      >
                        {ROLES.filter((r) => canManageRole(actorRole, r)).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[row.role] ?? row.role
                    )}
                  </td>
                  <td>
                    <span className="panel-badge" data-tone={suspended ? "danger" : "ok"}>{suspended ? "Suspended" : "Active"}</span>
                  </td>
                  <td>
                    {editable && (
                      <button
                        type="button"
                        className={suspended ? "panel-secondary" : "panel-danger"}
                        disabled={busy}
                        onClick={() =>
                          run(
                            row.uid,
                            () => callFunction("setStaffStatus", { uid: row.uid, status: suspended ? "ACTIVE" : "SUSPENDED" }),
                            suspended ? undefined : `Suspend ${row.fullName}? They will lose access immediately.`,
                          )
                        }
                      >
                        {suspended ? "Reactivate" : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="panel-muted">No staff match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
