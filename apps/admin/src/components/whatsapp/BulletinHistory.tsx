"use client";

import { callFunction, errorMessage, formatDateTime, getFirebase, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, WHATSAPP_GROUP_ALL, type WhatsAppMessageDoc, type WhatsAppRecipientDoc } from "@swarajya/shared";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { Fragment, useState } from "react";

const TONE: Record<WhatsAppMessageDoc["status"], string> = { SENDING: "info", SENT: "ok", PARTIAL: "warn", FAILED: "danger" };

export function BulletinHistory({ districtName }: { districtName: Map<string, string> }) {
  const { data, error } = useLiveQuery<WhatsAppMessageDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.whatsappMessages), orderBy("updatedAt", "desc"), limit(30)),
    [],
  );
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function retry(job: WhatsAppMessageDoc) {
    setBusy(job.messageId);
    setMessage(null);
    try {
      // Re-check the current list so the confirmation shows the real number.
      const preview = await callFunction("previewWhatsAppBulletin", { newsId: job.newsId, group: job.recipientGroup });
      if (!window.confirm(`Retry the failed recipients of this bulletin? (Recipients who already received it are skipped.)`)) return;
      const res = await callFunction("sendWhatsAppBulletin", { newsId: job.newsId, group: job.recipientGroup, expectedRecipients: preview.recipients });
      setMessage(`Retry finished: ${res.counts.accepted} accepted, ${res.counts.failed} failed.`);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="panel-alert" role="alert">{error}</p>;
  if (!data) return <p className="panel-muted">Loading…</p>;
  return (
    <section className="panel-section">
      {message && <p className="panel-notice" role="status">{message}</p>}
      <div className="panel-table-wrap">
        <table className="panel-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Bulletin</th>
              <th>Group</th>
              <th>Sent by</th>
              <th>Accepted</th>
              <th>Delivered</th>
              <th>Read</th>
              <th>Failed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => (
              <Fragment key={job.messageId}>
                <tr>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(job.updatedAt?.toDate())}</td>
                  <td style={{ maxWidth: 360 }}>{job.preview.split("\n\n")[1] ?? job.newsId}</td>
                  <td>{job.recipientGroup === WHATSAPP_GROUP_ALL ? "All" : districtName.get(job.recipientGroup) ?? job.recipientGroup}</td>
                  <td>{job.requestedByName}</td>
                  <td>{job.counts.accepted}/{job.counts.total}</td>
                  <td>{job.counts.delivered}</td>
                  <td>{job.counts.read}</td>
                  <td>
                    {job.counts.failed > 0 ? (
                      <button type="button" className="panel-link" onClick={() => setOpen(open === job.messageId ? null : job.messageId)}>
                        {job.counts.failed} {open === job.messageId ? "▲" : "▼"}
                      </button>
                    ) : 0}
                  </td>
                  <td>
                    <span className="panel-badge" data-tone={TONE[job.status]}>{job.status}</span>
                    {(job.status === "PARTIAL" || job.status === "FAILED") && (
                      <div>
                        <button type="button" className="panel-secondary" disabled={busy === job.messageId} onClick={() => retry(job)}>
                          {busy === job.messageId ? "Retrying…" : "Retry failed"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {open === job.messageId && (
                  <tr>
                    <td colSpan={9}><FailedRecipients jobId={job.messageId} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={9} className="panel-muted">No WhatsApp bulletins sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FailedRecipients({ jobId }: { jobId: string }) {
  const { data, error } = useLiveQuery<WhatsAppRecipientDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.whatsappMessages, jobId, "recipients"), where("status", "==", "FAILED"), limit(200)),
    [jobId],
  );
  if (error) return <p className="panel-alert">{error}</p>;
  if (!data) return <p className="panel-muted">Loading…</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {data.map((r) => (
        <li key={r.phone}><code>{r.phone}</code> — {r.error ?? "failed"}</li>
      ))}
    </ul>
  );
}
