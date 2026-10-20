"use client";

import { errorMessage, getFirebase, useAuth, useLiveDoc } from "@swarajya/panel-kit";
import { APP_SETTINGS_DOC_ID, COLLECTIONS, hasPermission, SOCIAL_NETWORKS, type AppSettingsDoc, type SocialNetwork } from "@swarajya/shared";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";

const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  youtube: "YouTube channel",
  facebook: "Facebook page",
  instagram: "Instagram",
  whatsapp: "WhatsApp channel / group link",
  telegram: "Telegram channel",
  x: "X (Twitter) profile",
};

const EMPTY: AppSettingsDoc = { channelName: "स्वराज्य न्यूज", contactDetails: {}, socialLinks: { youtube: "https://www.youtube.com/@swarajyanews2025" } };

export default function SettingsPage() {
  const { user, role } = useAuth();
  const canEdit = hasPermission(role, "settings.manage");
  const { data, exists, error: loadError } = useLiveDoc<AppSettingsDoc>(() => doc(getFirebase().db, COLLECTIONS.appSettings, APP_SETTINGS_DOC_ID), []);
  const [form, setForm] = useState<AppSettingsDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (form || exists === null) return;
    setForm(data ?? EMPTY);
  }, [data, exists, form]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    const bad = SOCIAL_NETWORKS.find((n) => form.socialLinks[n] && !/^https:\/\/\S+$/.test(form.socialLinks[n]!));
    if (bad) return setMessage({ tone: "error", text: `${SOCIAL_LABELS[bad]} must be an https:// link.` });
    setBusy(true);
    setMessage(null);
    try {
      const clean = <T extends Record<string, string | undefined>>(m: T) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v));
      await setDoc(doc(getFirebase().db, COLLECTIONS.appSettings, APP_SETTINGS_DOC_ID), {
        channelName: form.channelName.trim(),
        ...(form.tagline?.trim() ? { tagline: form.tagline.trim() } : {}),
        ...(form.tvChannel?.trim() ? { tvChannel: form.tvChannel.trim() } : {}),
        contactDetails: clean(form.contactDetails),
        socialLinks: clean(form.socialLinks),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      setMessage({ tone: "ok", text: "Saved. The website shows the change within five minutes; the app on next launch." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <p className="panel-alert" role="alert">{loadError}</p>;
  if (!form) return <p className="panel-muted">Loading…</p>;
  const setContact = (k: keyof AppSettingsDoc["contactDetails"], v: string) => setForm({ ...form, contactDetails: { ...form.contactDetails, [k]: v } });

  return (
    <form onSubmit={onSubmit}>
      <h1>Settings</h1>
      {!canEdit && <p className="panel-callout" role="note">Only the Super Admin can change these settings.</p>}
      <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <section className="panel-card panel-section panel-form-stack">
          <h2 style={{ margin: 0 }}>Channel</h2>
          <label>Channel name<input value={form.channelName} onChange={(e) => setForm({ ...form, channelName: e.target.value })} maxLength={60} required /></label>
          <label>Tagline <span className="panel-hint">optional</span><input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={120} /></label>
          <label>Watch on TV <span className="panel-hint">optional, e.g. cable network and channel number</span><input value={form.tvChannel ?? ""} onChange={(e) => setForm({ ...form, tvChannel: e.target.value })} maxLength={120} /></label>
        </section>
        <section className="panel-card panel-section panel-form-stack">
          <h2 style={{ margin: 0 }}>Contact details <span className="panel-hint">shown on the website and app Contact page</span></h2>
          <div className="panel-form">
            <label>Phone<input value={form.contactDetails.phone ?? ""} onChange={(e) => setContact("phone", e.target.value)} inputMode="tel" maxLength={30} /></label>
            <label>WhatsApp number<input value={form.contactDetails.whatsapp ?? ""} onChange={(e) => setContact("whatsapp", e.target.value)} inputMode="tel" maxLength={30} /></label>
            <label>Email<input type="email" value={form.contactDetails.email ?? ""} onChange={(e) => setContact("email", e.target.value)} maxLength={100} /></label>
          </div>
          <label>Address<textarea value={form.contactDetails.address ?? ""} onChange={(e) => setContact("address", e.target.value)} maxLength={300} style={{ minHeight: 60 }} /></label>
          <div className="panel-form">
            <label>Director / Chief Editor<input value={form.contactDetails.editorName ?? ""} onChange={(e) => setContact("editorName", e.target.value)} maxLength={80} /></label>
            <label>Editor&apos;s phone<input value={form.contactDetails.editorPhone ?? ""} onChange={(e) => setContact("editorPhone", e.target.value)} inputMode="tel" maxLength={30} /></label>
          </div>
        </section>
        <section className="panel-card panel-section panel-form-stack">
          <h2 style={{ margin: 0 }}>Social links</h2>
          {SOCIAL_NETWORKS.map((n) => (
            <label key={n}>
              {SOCIAL_LABELS[n]}
              <input type="url" value={form.socialLinks[n] ?? ""} placeholder="https://" onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, [n]: e.target.value } })} />
            </label>
          ))}
        </section>
        {message && <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>{message.text}</p>}
        {canEdit && <button type="submit">{busy ? "Saving…" : "Save settings"}</button>}
      </fieldset>
    </form>
  );
}
