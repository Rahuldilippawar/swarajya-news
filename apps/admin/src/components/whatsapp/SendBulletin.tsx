"use client";

import { callFunction, errorMessage, getFirebase, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, MAX_BULLETIN_RECIPIENTS, PUBLIC_STATUS, WHATSAPP_GROUP_ALL, type CallableResponse, type NewsDoc } from "@swarajya/shared";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

type Preview = CallableResponse<"previewWhatsAppBulletin">;

export function SendBulletin({ initialNewsId, districts }: { initialNewsId: string; districts: { locationId: string; name: string; isActive: boolean }[] }) {
  const published = useLiveQuery<NewsDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.news), where("status", "==", PUBLIC_STATUS), orderBy("publishedAt", "desc"), limit(30)),
    [],
  );
  const [newsId, setNewsId] = useState(initialNewsId);
  const [group, setGroup] = useState(WHATSAPP_GROUP_ALL);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!newsId) return;
    let cancelled = false;
    setLoading(true);
    setPreview(null);
    setPreviewError(null);
    callFunction("previewWhatsAppBulletin", { newsId, group })
      .then((p) => !cancelled && setPreview(p))
      .catch((err) => !cancelled && setPreviewError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [newsId, group, refresh]);

  const groupName = group === WHATSAPP_GROUP_ALL ? "all subscribers" : `${districts.find((d) => d.locationId === group)?.name ?? group} district subscribers`;
  const canSend = preview && preview.recipients > 0 && !preview.alreadySent && !preview.tooMany && !sending;

  async function send() {
    if (!preview) return;
    if (!window.confirm(`Send this WhatsApp bulletin to ${preview.recipients} recipients (${groupName})? This cannot be undone.`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await callFunction("sendWhatsAppBulletin", { newsId, group, expectedRecipients: preview.recipients });
      setResult({
        tone: res.status === "SENT" ? "ok" : "error",
        text:
          res.status === "SENT"
            ? `Sent to ${res.counts.accepted} subscribers. Delivery updates appear in History.`
            : `${res.counts.accepted} accepted, ${res.counts.failed} failed. See History for details and to retry.`,
      });
    } catch (err) {
      setResult({ tone: "error", text: errorMessage(err) });
    } finally {
      setSending(false);
      setRefresh((r) => r + 1);
    }
  }

  return (
    <section className="panel-card panel-section">
      <div className="panel-editor">
        <div className="panel-form-stack">
          <label>
            Published news
            <select value={newsId} onChange={(e) => setNewsId(e.target.value)}>
              <option value="">Select a published article</option>
              {published.data?.map((n) => (
                <option key={n.newsId} value={n.newsId}>{n.isBreaking ? "🔴 " : ""}{n.headline}</option>
              ))}
            </select>
          </label>
          <label>
            Recipients
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value={WHATSAPP_GROUP_ALL}>All subscribers</option>
              {districts.filter((d) => d.isActive).map((d) => (
                <option key={d.locationId} value={d.locationId}>{d.name} district subscribers</option>
              ))}
            </select>
          </label>
          {loading && <p className="panel-muted">Preparing preview…</p>}
          {previewError && <p className="panel-alert" role="alert">{previewError}</p>}
          {preview && (
            <>
              <p>
                Recipients: <strong>{preview.recipients}</strong> ({groupName}) · template <code>{preview.templateName}</code>
              </p>
              {preview.alreadySent && (
                <p className="panel-callout" data-tone="warn" role="note">This article has already been sent to this group. Subscribers will not receive it twice.</p>
              )}
              {preview.tooMany && (
                <p className="panel-callout" data-tone="danger" role="note">
                  More than {MAX_BULLETIN_RECIPIENTS} recipients: large lists need queued sending, which is not set up yet. Send by district instead.
                </p>
              )}
              {preview.recipients === 0 && <p className="panel-muted">No subscribers in this group yet.</p>}
              <button type="button" onClick={send} disabled={!canSend}>
                {sending ? "Sending…" : `Send to ${preview.recipients} subscribers`}
              </button>
            </>
          )}
          {result && (
            <p className={result.tone === "ok" ? "panel-notice" : "panel-alert"} role={result.tone === "ok" ? "status" : "alert"}>{result.text}</p>
          )}
        </div>
        <aside>
          <p className="panel-field">Message preview</p>
          <div className="wa-chat">
            <div className="wa-bubble">{preview?.preview ?? (newsId ? "…" : "Choose an article to see the message.")}</div>
          </div>
          <p className="panel-hint">
            Sent as the approved WhatsApp template, so the wording outside the article text cannot be changed here.
            Business-initiated WhatsApp messages are charged by Meta per conversation.
          </p>
        </aside>
      </div>
    </section>
  );
}
