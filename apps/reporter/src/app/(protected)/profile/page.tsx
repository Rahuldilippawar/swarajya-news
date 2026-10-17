"use client";

import { errorMessage, getFirebase, useAuth } from "@swarajya/panel-kit";
import { COLLECTIONS, ROLE_LABELS, type UserDoc } from "@swarajya/shared";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

type Profile = Pick<UserDoc, "fullName" | "email" | "role" | "status" | "assignedLocations"> & { reporterId?: string | null };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(getFirebase().db, COLLECTIONS.users, user.uid),
      (snap) => {
        if (snap.exists()) setProfile(snap.data() as Profile);
        else setError("Your profile has not been set up yet. Contact the Swarajya News office.");
      },
      (err) => setError(errorMessage(err)),
    );
  }, [user]);

  async function changePassword() {
    if (!user?.email) return;
    setNotice(null);
    setError(null);
    try {
      await sendPasswordResetEmail(getFirebase().auth, user.email);
      setNotice(`A password change link has been sent to ${user.email}.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (error) return <p className="panel-alert" role="alert">{error}</p>;
  if (!profile) return <p className="panel-muted">Loading…</p>;

  const suspended = profile.status === "SUSPENDED";
  return (
    <div className="panel-card" style={{ maxWidth: 560 }}>
      <h1>{profile.fullName}</h1>
      <table className="panel-table">
        <tbody>
          <tr><th scope="row">Reporter ID</th><td>{profile.reporterId ?? "—"}</td></tr>
          <tr><th scope="row">Email</th><td>{profile.email}</td></tr>
          <tr><th scope="row">Role</th><td>{ROLE_LABELS[profile.role] ?? profile.role}</td></tr>
          <tr>
            <th scope="row">Account status</th>
            <td><span className="panel-badge" data-tone={suspended ? "danger" : "ok"}>{suspended ? "Suspended" : "Active"}</span></td>
          </tr>
          <tr>
            <th scope="row">Assigned locations</th>
            <td>{profile.assignedLocations?.length ? profile.assignedLocations.join(", ") : "Not assigned yet"}</td>
          </tr>
        </tbody>
      </table>
      <p className="panel-muted">To change your name or locations, contact the Swarajya News office.</p>
      <button type="button" className="panel-secondary" onClick={changePassword}>Change password</button>
      {notice && <p className="panel-notice" role="status">{notice}</p>}
    </div>
  );
}
