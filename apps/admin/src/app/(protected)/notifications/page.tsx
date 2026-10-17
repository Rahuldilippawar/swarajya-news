"use client";

import { callFunction, errorMessage, formatDateTime, getFirebase, useAuth, useLiveQuery, useLocationsOfType } from "@swarajya/panel-kit";
import {
  COLLECTIONS,
  hasPermission,
  NOTIFICATION_LIMITS,
  notificationJobId,
  PUBLIC_STATUS,
  type NewsDoc,
  type NotificationDoc,
  type NotificationTarget,
} from "@swarajya/shared";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<p className="panel-muted">Loading…</p>}>
      <Notifications />
    </Suspense>
  );
}

const STATUS_TONE: Record<NotificationDoc["status"], string> = { QUEUED: "muted", SENDING: "info", SENT: "ok", FAILED: "danger" };

function Notifications() {
  const { role } = useAuth();
  const districts = useLocationsOfType("DISTRICT");
  const districtName = useMemo(() => new Map(districts.data?.map((d) => [d.locationId, d.name])), [districts.data]);

  if (!hasPermission(role, "notifications.send")) {
    return <p className="panel-alert" role="alert">You do not have permission to send notifications.</p>;
  }
  return (
    <>
      <h1>Push notifications</h1>
      <Compose districtName={districtName} districts={districts.data ?? []} />
      <History districtName={districtName} canOpenNews={hasPermission(role, "news.editAny")} />
    </>
  );
}

function audienceLabel(targetType: string, districtId: string | undefined, names: Map<string, string>) {
  return targetType === "ALL" ? "All readers" : `${names.get(districtId ?? "") ?? districtId} district`;
}

function Compose({ districtName, districts }: { districtName: Map<string, string>; districts: { locationId: string; name: string; isActive: boolean }[] }) {
  const initialNewsId = useSearchParams().get("newsId") ?? "";
  const { db } = getFirebase();
  const published = useLiveQuery<NewsDoc>(
    () => query(collection(db, COLLECTIONS.news), where("status", "==", PUBLIC_STATUS), orderBy("publishedAt", "desc"), limit(30)),
    [],
  );
  const [newsId, setNewsId] = useState(initialNewsId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "DISTRICT">("ALL");
  const [districtId, setDistrictId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const article = published.data?.find((n) => n.newsId === newsId) ?? null;
  const sent = useLiveQuery<NotificationDoc>(
    () => (newsId ? query(collection(db, COLLECTIONS.notifications), where("newsId", "==", newsId)) : null),
    [newsId],
  );

  // Prefill from the chosen article; the editor can then shorten or reword.
  useEffect(() => {
    if (!article) return;
    setTitle(article.headline.slice(0, NOTIFICATION_LIMITS.title));
    setBody((article.summary || article.headline).slice(0, NOTIFICATION_LIMITS.body));
    setDistrictId(article.districtId);
  }, [article]);

  const target: NotificationTarget | null =
    audience === "ALL" ? { type: "ALL" } : districtId ? { type: "DISTRICT", districtId } : null;
  const alreadySent = target && newsId ? sent.data?.find((j) => j.notificationId === notificationJobId(newsId, target) && j.status !== "FAILED") : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!article || !target) return;
    const who = audienceLabel(target.type, target.type === "DISTRICT" ? target.districtId : undefined, districtName);
    if (!window.confirm(`Send this notification to ${who.toLowerCase()} now? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await callFunction("sendNotification", { newsId: article.newsId, title: title.trim(), body: body.trim(), target });
      setMessage({ tone: "ok", text: `Notification sent to ${who.toLowerCase()}.` });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-section">
      <h2 style={{ marginTop: 0 }}>Send a notification</h2>
      <div className="panel-editor">
        <form className="panel-form-stack" onSubmit={onSubmit}>
          <label>
            Published news
            <select value={newsId} onChange={(e) => setNewsId(e.target.value)} required>
              <option value="">Select a published article</option>
              {newsId && !article && published.data && <option value={newsId}>(not in the latest 30 published)</option>}
              {published.data?.map((n) => (
                <option key={n.newsId} value={n.newsId}>{n.isBreaking ? "🔴 " : ""}{n.headline}</option>
              ))}
            </select>
            {published.error && <span className="panel-field-error">{published.error}</span>}
          </label>
          <label>
            Title <span className="panel-hint">{title.length}/{NOTIFICATION_LIMITS.title}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={NOTIFICATION_LIMITS.title} required />
          </label>
          <label>
            Message <span className="panel-hint">{body.length}/{NOTIFICATION_LIMITS.body}</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={NOTIFICATION_LIMITS.body} required style={{ minHeight: 80 }} />
          </label>
          <fieldset className="panel-form-stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="panel-field" style={{ marginBottom: 6 }}>Audience</legend>
            <label className="panel-check">
              <input type="radio" name="audience" checked={audience === "ALL"} onChange={() => setAudience("ALL")} />
              All app readers
            </label>
            <label className="panel-check">
              <input type="radio" name="audience" checked={audience === "DISTRICT"} onChange={() => setAudience("DISTRICT")} />
              Readers following one district
            </label>
            {audience === "DISTRICT" && (
              <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} aria-label="District" required>
                <option value="">Select district</option>
                {districts.filter((d) => d.isActive).map((d) => (
                  <option key={d.locationId} value={d.locationId}>{d.name}</option>
                ))}
              </select>
            )}
          </fieldset>
          {alreadySent && (
            <p className="panel-callout" data-tone="warn" role="note">
              Already sent to this audience on {formatDateTime(alreadySent.createdAt?.toDate())} by {alreadySent.createdByName}. Readers will not be
              notified twice.
            </p>
          )}
          {message && (
            <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>{message.text}</p>
          )}
          <button type="submit" disabled={busy || !article || !target || !!alreadySent || !title.trim() || !body.trim()}>
            {busy ? "Sending…" : "Send notification"}
          </button>
        </form>
        <aside>
          <p className="panel-field">Preview</p>
          <div className="notif-preview" aria-label="Notification preview">
            <div className="notif-head">
              <img src="/logo.svg" alt="" width={20} height={12} /> Swarajya News · now
            </div>
            <strong>{title || "Title"}</strong>
            <p>{body || "Message"}</p>
            {article?.thumbnailUrl?.startsWith("https://") && <img className="panel-thumb" src={article.thumbnailUrl} alt="" />}
          </div>
          <p className="panel-hint">Tapping the notification opens this article in the app. Images appear only for https photos.</p>
        </aside>
      </div>
    </section>
  );
}

function History({ districtName, canOpenNews }: { districtName: Map<string, string>; canOpenNews: boolean }) {
  const { data, error } = useLiveQuery<NotificationDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.notifications), orderBy("createdAt", "desc"), limit(50)),
    [],
  );
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function retry(job: NotificationDoc) {
    setRetrying(job.notificationId);
    setRetryError(null);
    try {
      await callFunction("sendNotification", {
        newsId: job.newsId,
        title: job.title,
        body: job.body,
        target: job.targetType === "ALL" ? { type: "ALL" } : { type: "DISTRICT", districtId: job.targetValue ?? "" },
      });
    } catch (err) {
      setRetryError(errorMessage(err));
    } finally {
      setRetrying(null);
    }
  }

  return (
    <section className="panel-section">
      <h2>History</h2>
      {(error || retryError) && <p className="panel-alert" role="alert">{error ?? retryError}</p>}
      {!data && !error && <p className="panel-muted">Loading…</p>}
      {data && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Notification</th>
                <th>Audience</th>
                <th>Sent by</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((job) => (
                <tr key={job.notificationId}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(job.createdAt?.toDate())}</td>
                  <td>
                    <strong>{job.title}</strong>
                    <div className="panel-hint">{job.body}</div>
                    {canOpenNews && <Link href={`/news/${job.newsId}/edit`} className="panel-hint">Open article</Link>}
                  </td>
                  <td>{audienceLabel(job.targetType, job.targetValue, districtName)}</td>
                  <td>{job.createdByName}</td>
                  <td>
                    <span className="panel-badge" data-tone={STATUS_TONE[job.status]}>{job.status}</span>
                    {job.attempts > 1 && <div className="panel-hint">{job.attempts} attempts</div>}
                    {job.status === "FAILED" && (
                      <>
                        <div className="panel-field-error" title={job.error ?? undefined}>
                          {job.error && job.error.length > 140 ? `${job.error.slice(0, 140)}…` : job.error}
                        </div>
                        <button type="button" className="panel-secondary" disabled={retrying === job.notificationId} onClick={() => retry(job)}>
                          {retrying === job.notificationId ? "Retrying…" : "Retry"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="panel-muted">No notifications sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
