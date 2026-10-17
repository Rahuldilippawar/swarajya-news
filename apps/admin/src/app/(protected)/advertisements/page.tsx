"use client";

import { errorMessage, formatDateTime, getFirebase, useAuth, useLiveQuery } from "@swarajya/panel-kit";
import { AD_PLACEMENT_LABELS, AD_PLACEMENTS, COLLECTIONS, hasPermission, isAdRunning, type AdPlacement, type AdvertisementDoc } from "@swarajya/shared";
import { collection, deleteDoc, doc, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRef, useState, type FormEvent } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function adState(ad: AdvertisementDoc, now = new Date()): { label: string; tone: string } {
  if (!ad.isActive) return { label: "Off", tone: "muted" };
  if (isAdRunning(ad, now)) return { label: "Running", tone: "ok" };
  return ad.startAt.toDate() > now ? { label: "Scheduled", tone: "info" } : { label: "Ended", tone: "muted" };
}

export default function AdvertisementsPage() {
  const { role } = useAuth();
  const ads = useLiveQuery<AdvertisementDoc>(() => query(collection(getFirebase().db, COLLECTIONS.advertisements), orderBy("updatedAt", "desc")), []);
  const [editing, setEditing] = useState<AdvertisementDoc | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasPermission(role, "ads.manage")) return <p className="panel-alert" role="alert">Only the Owner and Super Admin can manage advertisements.</p>;

  async function toggle(ad: AdvertisementDoc) {
    setError(null);
    try {
      await updateDoc(doc(getFirebase().db, COLLECTIONS.advertisements, ad.advertisementId), { isActive: !ad.isActive, updatedAt: serverTimestamp() });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(ad: AdvertisementDoc) {
    if (!window.confirm(`Delete the advertisement “${ad.title}”? Its totals will no longer be shown. To keep the history, turn it off instead.`)) return;
    try {
      await deleteDoc(doc(getFirebase().db, COLLECTIONS.advertisements, ad.advertisementId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>Advertisements</h1>
        <span className="panel-spacer" />
        {!editing && <button type="button" onClick={() => setEditing("new")}>New advertisement</button>}
      </div>
      {editing && <AdForm ad={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {(ads.error || error) && <p className="panel-alert" role="alert">{ads.error ?? error}</p>}
      {!ads.data && !ads.error && <p className="panel-muted">Loading…</p>}
      {ads.data && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Placement</th>
                <th>Runs</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ads.data.map((ad) => {
                const state = adState(ad);
                const impressions = ad.impressions ?? 0;
                const clicks = ad.clicks ?? 0;
                return (
                  <tr key={ad.advertisementId}>
                    <td style={{ maxWidth: 280 }}>
                      <img src={ad.imageUrl} alt="" style={{ width: 160, maxHeight: 60, objectFit: "contain", display: "block" }} />
                      <strong>{ad.title}</strong>
                      <div className="panel-hint" style={{ wordBreak: "break-all" }}>{ad.targetUrl}</div>
                    </td>
                    <td>{AD_PLACEMENT_LABELS[ad.placement]}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(ad.startAt.toDate())}<br />→ {formatDateTime(ad.endAt.toDate())}</td>
                    <td>{impressions.toLocaleString("en-IN")}</td>
                    <td>{clicks.toLocaleString("en-IN")}</td>
                    <td>{impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—"}</td>
                    <td><span className="panel-badge" data-tone={state.tone}>{state.label}</span></td>
                    <td>
                      <div className="panel-row" style={{ flexWrap: "nowrap" }}>
                        <button type="button" className="panel-secondary" onClick={() => setEditing(ad)}>Edit</button>
                        <button type="button" className="panel-secondary" onClick={() => toggle(ad)}>{ad.isActive ? "Turn off" : "Turn on"}</button>
                        <button type="button" className="panel-link" onClick={() => remove(ad)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ads.data.length === 0 && <tr><td colSpan={8} className="panel-muted">No advertisements yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="panel-hint">
        Impressions and clicks are counted by the website and app (one impression each time the banner is shown). They
        are indicative, not audited figures.
      </p>
    </>
  );
}

function AdForm({ ad, onClose }: { ad: AdvertisementDoc | null; onClose: () => void }) {
  const now = new Date();
  const [title, setTitle] = useState(ad?.title ?? "");
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl ?? "");
  const [targetUrl, setTargetUrl] = useState(ad?.targetUrl ?? "https://");
  const [placement, setPlacement] = useState<AdPlacement>(ad?.placement ?? "HOME_TOP");
  const [startAt, setStartAt] = useState(toInput(ad?.startAt.toDate() ?? now));
  const [endAt, setEndAt] = useState(toInput(ad?.endAt.toDate() ?? new Date(now.getTime() + 30 * 86400_000)));
  const [isActive, setIsActive] = useState(ad?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) return setError("Use a JPG, PNG, WebP or GIF image.");
    if (f.size > 2 * 1024 * 1024) return setError("The banner must be smaller than 2 MB.");
    setBusy(true);
    try {
      const r = ref(getFirebase().storage, `ads/${Date.now()}-${f.name.replace(/[^\w.-]+/g, "_").slice(-60)}`);
      await uploadBytes(r, f, { contentType: f.type });
      setImageUrl(await getDownloadURL(r));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^https:\/\/\S+$/.test(targetUrl.trim())) return setError("The link must start with https://");
    if (!imageUrl) return setError("Upload a banner image.");
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(end > start)) return setError("The end must be after the start.");
    setBusy(true);
    try {
      const { db } = getFirebase();
      const fields = {
        title: title.trim(),
        imageUrl,
        targetUrl: targetUrl.trim(),
        placement,
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        isActive,
        updatedAt: serverTimestamp(),
      };
      if (ad) {
        await updateDoc(doc(db, COLLECTIONS.advertisements, ad.advertisementId), fields);
      } else {
        const r = doc(collection(db, COLLECTIONS.advertisements));
        await setDoc(r, { ...fields, advertisementId: r.id, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2 style={{ marginTop: 0 }}>{ad ? "Edit advertisement" : "New advertisement"}</h2>
      <form className="panel-form-stack" onSubmit={onSubmit}>
        <div className="panel-form">
          <label>
            Advertiser / title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
          </label>
          <label>
            Link (opens when tapped)
            <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required />
          </label>
          <label>
            Placement
            <select value={placement} onChange={(e) => setPlacement(e.target.value as AdPlacement)}>
              {AD_PLACEMENTS.map((p) => (
                <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="panel-form">
          <label>
            Starts
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </label>
          <label>
            Ends
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </label>
          <label className="panel-check">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
        <div className="panel-field">
          Banner image <span className="panel-hint">wide banner, e.g. 1200×200 for the website or 1080×300 for the app; max 2 MB</span>
          {imageUrl && <img src={imageUrl} alt="" style={{ maxWidth: 480, maxHeight: 120, objectFit: "contain", border: "1px solid var(--border)" }} />}
          <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Banner image file" onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }} />
          <div><button type="button" className="panel-secondary" disabled={busy} onClick={() => file.current?.click()}>{imageUrl ? "Replace image" : "Upload image"}</button></div>
        </div>
        {error && <p className="panel-alert" role="alert">{error}</p>}
        <div className="panel-row">
          <button type="submit" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save"}</button>
          <button type="button" className="panel-link" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
