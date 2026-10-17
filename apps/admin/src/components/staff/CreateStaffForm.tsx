"use client";

import { callFunction, errorMessage } from "@swarajya/panel-kit";
import { canManageRole, ROLE_LABELS, ROLES, type Role } from "@swarajya/shared";
import { useState, type FormEvent } from "react";

interface Created {
  email: string;
  reporterId: string | null;
  link: string;
}

export function CreateStaffForm({ actorRole }: { actorRole: Role }) {
  const assignable = ROLES.filter((r) => canManageRole(actorRole, r));
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("REPORTER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const res = await callFunction("createStaffUser", { email: email.trim(), fullName: fullName.trim(), role });
      setCreated({ email: email.trim(), reporterId: res.reporterId, link: res.passwordSetupLink });
      setEmail("");
      setFullName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select the link and copy it manually.");
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2>Add staff member</h2>
      <form className="panel-form" onSubmit={onSubmit}>
        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {assignable.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {created && (
        <div className="panel-callout" role="status" style={{ marginTop: 16 }}>
          <p>
            <strong>Account created for {created.email}</strong>
            {created.reporterId && <> · Reporter ID <strong>{created.reporterId}</strong></>}
          </p>
          <p>
            Send this one-time password setup link to them privately (for example by WhatsApp to their own number).
            Anyone with the link can set the password.
          </p>
          <p><code>{created.link}</code></p>
          <button type="button" className="panel-secondary" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
        </div>
      )}
    </section>
  );
}
