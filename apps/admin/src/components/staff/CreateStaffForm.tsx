"use client";

import { callFunction, errorMessage, PHOTO_TYPES, uploadStaffPhoto } from "@swarajya/panel-kit";
import { canManageRole, defaultDesignation, ROLE_LABELS, ROLES, type Role } from "@swarajya/shared";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface Created {
  uid: string;
  email: string;
  reporterId: string | null;
  link: string;
}

export function CreateStaffForm({ actorRole }: { actorRole: Role }) {
  const assignable = ROLES.filter((r) => canManageRole(actorRole, r));
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("REPORTER");
  const [designation, setDesignation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const res = await callFunction("createStaffUser", { email: email.trim(), fullName: fullName.trim(), role });
      setCreated({ uid: res.uid, email: email.trim(), reporterId: res.reporterId, link: res.passwordSetupLink });
      setEmail("");
      setFullName("");
      // The ID card is generated with the account; the photo and designation are added to it straight away.
      if (photo || designation.trim()) {
        try {
          await callFunction("updateStaffProfile", {
            uid: res.uid,
            ...(photo ? { photoUrl: await uploadStaffPhoto(res.uid, photo) } : {}),
            ...(designation.trim() ? { designation: designation.trim() } : {}),
          });
        } catch (err) {
          setError(`The account was created, but the photo or designation was not saved (${errorMessage(err)}). Add them from its ID card page.`);
        }
      }
      setDesignation("");
      setPhoto(null);
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
        <label>
          Designation on the ID card
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            maxLength={60}
            placeholder={`Empty: ${defaultDesignation(role, role === "REPORTER" ? "<जिल्हा>" : undefined)}`}
          />
        </label>
        <div className="panel-field">
          Photo for the ID card
          <div className="panel-row">
            {preview && <img src={preview} alt="" className="staff-photo-preview" />}
            <button type="button" className="panel-secondary" onClick={() => photoInput.current?.click()}>
              {photo ? "Change photo" : "Choose photo"}
            </button>
            {photo && <button type="button" className="panel-link" onClick={() => setPhoto(null)}>Remove</button>}
          </div>
          <input
            ref={photoInput}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            hidden
            aria-label="ID card photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setPhoto(file);
            }}
          />
          <span className="panel-hint">Passport-style photo, face clearly visible. Optional; it can be added later.</span>
        </div>
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
          <div className="panel-row">
            <button type="button" className="panel-secondary" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
            <Link href={`/reporters/${created.uid}/id-card`}>View ID card</Link>
          </div>
        </div>
      )}
    </section>
  );
}
