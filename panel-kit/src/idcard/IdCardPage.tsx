"use client";

import { APP_SETTINGS_DOC_ID, COLLECTIONS, type AppSettingsDoc, type CallableRequest, type IdCardDoc, type UserDoc } from "@swarajya/shared";
import { doc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { getFirebase } from "../firebase";
import { callFunction, errorMessage } from "../functions";
import { useLiveDoc } from "../useLiveQuery";
import { IdCard } from "./IdCard";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Shrinks a photo to at most 600 px on its long side as JPEG, so it stays well under the 2 MB upload limit. */
async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo."))), "image/jpeg", 0.85),
  );
}

/**
 * A staff member's press card with its controls: photo upload (the member
 * themselves, or a manager), and for managers the designation and renewal.
 * The card itself is created by the server whenever the account changes.
 */
export function IdCardPage({ uid, canManage }: { uid: string; canManage: boolean }) {
  const { db, storage } = getFirebase();
  const user = useLiveDoc<UserDoc>(() => doc(db, COLLECTIONS.users, uid), [uid]);
  const cardId = user.data?.cardId;
  const card = useLiveDoc<IdCardDoc>(() => (cardId ? doc(db, COLLECTIONS.idCards, cardId) : null), [cardId]);
  const settings = useLiveDoc<AppSettingsDoc>(() => doc(db, COLLECTIONS.appSettings, APP_SETTINGS_DOC_ID), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [designation, setDesignation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setDesignation(user.data?.designation ?? ""), [user.data?.designation]);

  async function save(label: string, request: Omit<CallableRequest<"updateStaffProfile">, "uid">, done?: string) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await callFunction("updateStaffProfile", { uid, ...request });
      if (done) setNotice(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhoto(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP photo.");
    setBusy("photo");
    setError(null);
    setNotice(null);
    try {
      const fileRef = ref(storage, `staff-photos/${uid}/${Date.now()}.jpg`);
      await uploadBytes(fileRef, await resizePhoto(file), { contentType: "image/jpeg" });
      await callFunction("updateStaffProfile", { uid, photoUrl: await getDownloadURL(fileRef) });
      setNotice("Photo updated on the card.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const loadError = user.error || card.error || settings.error;
  if (loadError) return <p className="panel-alert" role="alert">{loadError}</p>;
  if (user.exists === false) return <p className="panel-alert" role="alert">This staff profile does not exist.</p>;
  if (!user.data || settings.exists === null) return <p className="panel-muted">Loading…</p>;

  const cardSettings = settings.data ?? { channelName: "स्वराज्य न्यूज", contactDetails: {} };
  return (
    <>
      <h1>ID card · {user.data.fullName}</h1>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {notice && <p className="panel-callout" role="status">{notice}</p>}

      {!cardId || card.exists === false ? (
        <div className="panel-card panel-form-stack">
          <p>The card has not been generated yet.</p>
          <div className="panel-row">
            <button type="button" disabled={busy !== null} onClick={() => save("generate", {}, "Card generated.")}>
              {busy === "generate" ? "Generating…" : "Generate ID card"}
            </button>
          </div>
        </div>
      ) : card.data ? (
        <div className="id-print panel-section">
          <IdCard card={card.data} settings={cardSettings} siteUrl={SITE_URL} />
        </div>
      ) : (
        <p className="panel-muted">Loading…</p>
      )}

      <div className="panel-card panel-form-stack panel-section" style={{ maxWidth: 560 }}>
        <div className="panel-row">
          <button type="button" disabled={!card.data} onClick={() => window.print()}>Print / Save as PDF</button>
          <button type="button" className="panel-secondary" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
            {busy === "photo" ? "Uploading…" : user.data.photoUrl ? "Change photo" : "Upload photo"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            hidden
            aria-label="Card photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadPhoto(file);
            }}
          />
        </div>
        <span className="panel-hint">Use a recent passport-style photo with the face clearly visible. The QR code on the card opens its verification page on the website.</span>

        {canManage && (
          <>
            <label className="panel-field">
              Designation on the card
              <input
                value={designation}
                maxLength={60}
                placeholder="Empty: from the role and district (e.g. प्रतिनिधी धुळे जिल्हा)"
                onChange={(e) => setDesignation(e.target.value)}
              />
            </label>
            <div className="panel-row">
              <button
                type="button"
                className="panel-secondary"
                disabled={busy !== null || designation.trim() === (user.data.designation ?? "")}
                onClick={() => save("designation", { designation: designation.trim() }, "Designation saved.")}
              >
                {busy === "designation" ? "Saving…" : "Save designation"}
              </button>
              <button
                type="button"
                className="panel-secondary"
                disabled={busy !== null || !card.data}
                onClick={() => window.confirm("Renew this card for one year from today?") && save("renew", { renewCard: true }, "Card renewed for one year.")}
              >
                {busy === "renew" ? "Renewing…" : "Renew for 1 year"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
