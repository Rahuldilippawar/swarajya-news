"use client";

import { errorMessage, getFirebase, useAuth } from "@swarajya/panel-kit";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Uploads a photo to Storage (news-images/<uid>/…) and stores its https URL. */
export function ThumbnailField({ value, fallback, onChange }: { value: string; fallback?: string; onChange: (url: string) => void }) {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("The image must be smaller than 5 MB.");
    if (!user) return;
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-60);
      const fileRef = ref(getFirebase().storage, `news-images/${user.uid}/${Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      onChange(await getDownloadURL(fileRef));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = value || fallback;
  return (
    <div className="panel-form-stack">
      <div className="panel-field">
        Thumbnail
        {shown ? (
          <img className="panel-thumb" src={shown} alt="" />
        ) : (
          <span className="panel-hint">No image yet. The YouTube thumbnail is used when a video is attached.</span>
        )}
        {!value && fallback && <span className="panel-hint">Showing the YouTube thumbnail.</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        hidden
        aria-label="Thumbnail image file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="panel-row">
        <button type="button" className="panel-secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {value && <button type="button" className="panel-link" onClick={() => onChange("")}>Remove</button>}
      </div>
      {error && <p className="panel-alert" role="alert">{error}</p>}
    </div>
  );
}
