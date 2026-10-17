"use client";

import {
  callFunction,
  errorMessage,
  getFirebase,
  timeAgo,
  useAuth,
  useCategories,
  useLiveQuery,
  useLocationsOfType,
} from "@swarajya/panel-kit";
import { COLLECTIONS, hasPermission, type NewsDoc, type NewsStatus, type VideoStatus } from "@swarajya/shared";
import { collection, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStaffNames } from "@/lib/useStaffNames";

interface Queue {
  status: NewsStatus;
  title: string;
  empty: string;
  /** Oldest first, by when the article entered this queue. */
  since: "submittedAt" | "approvedAt";
}

const QUEUES: Queue[] = [
  { status: "SUBMITTED", title: "Waiting for review", empty: "No new submissions.", since: "submittedAt" },
  { status: "UNDER_REVIEW", title: "In review", empty: "Nothing is being reviewed.", since: "submittedAt" },
  { status: "APPROVED", title: "Approved — ready to publish", empty: "Nothing is waiting to be published.", since: "approvedAt" },
];

const VIDEO_TONE: Record<VideoStatus, { tone: string; label: string }> = {
  AVAILABLE: { tone: "ok", label: "Video OK" },
  UNAVAILABLE: { tone: "danger", label: "Video unavailable" },
  UNVERIFIED: { tone: "warn", label: "Video unverified" },
};

function useQueue(queue: Queue) {
  return useLiveQuery<NewsDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.news), where("status", "==", queue.status), orderBy(queue.since, "asc")),
    [queue.status],
  );
}

export default function PendingApprovalPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState<NewsStatus>("SUBMITTED");
  // All three queues stay live so the tab counts are always current.
  const submitted = useQueue(QUEUES[0]!);
  const inReview = useQueue(QUEUES[1]!);
  const approved = useQueue(QUEUES[2]!);
  const results: Record<string, ReturnType<typeof useQueue>> = {
    SUBMITTED: submitted,
    UNDER_REVIEW: inReview,
    APPROVED: approved,
  };

  if (!hasPermission(role, "news.review")) {
    return <p className="panel-alert" role="alert">Only editors can review news.</p>;
  }

  const queue = QUEUES.find((q) => q.status === tab)!;
  const current = results[tab]!;

  return (
    <>
      <h1>Pending Approval</h1>
      <div className="panel-row panel-section" role="tablist">
        {QUEUES.map((q) => {
          const count = results[q.status]!.data?.length;
          return (
            <button
              key={q.status}
              type="button"
              role="tab"
              aria-selected={tab === q.status}
              className={tab === q.status ? undefined : "panel-secondary"}
              onClick={() => setTab(q.status)}
            >
              {q.title} {count === undefined ? "" : `(${count})`}
            </button>
          );
        })}
      </div>
      {current.error && <p className="panel-alert" role="alert">{current.error}</p>}
      {!current.data && !current.error && <p className="panel-muted">Loading…</p>}
      {current.data && <QueueTable queue={queue} items={current.data} />}
    </>
  );
}

function QueueTable({ queue, items }: { queue: Queue; items: NewsDoc[] }) {
  const staff = useStaffNames();
  const categories = useCategories();
  const districts = useLocationsOfType("DISTRICT");
  const names = useMemo(() => {
    const map = new Map<string, string>();
    categories.data?.forEach((c) => map.set(c.categoryId, c.name));
    districts.data?.forEach((d) => map.set(d.locationId, d.name));
    return map;
  }, [categories.data, districts.data]);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function run(news: NewsDoc, to: NewsStatus, done: string) {
    setPending(news.newsId);
    setMessage(null);
    try {
      const res = await callFunction("transitionNews", { newsId: news.newsId, to });
      const note = res.videoStatus === "UNVERIFIED" ? " The video could not be verified with YouTube; check it manually." : "";
      setMessage({ tone: "ok", text: `“${news.headline}” ${done}.${note}` });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {message && (
        <p className={message.tone === "ok" ? "panel-notice" : "panel-alert"} role={message.tone === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      <div className="panel-table-wrap">
        <table className="panel-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Reporter</th>
              <th>District</th>
              <th>Category</th>
              <th>{queue.since === "approvedAt" ? "Approved" : "Submitted"}</th>
              {queue.status === "UNDER_REVIEW" && <th>Reviewer</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((n) => {
              const busy = pending === n.newsId;
              const video = n.videoStatus ? VIDEO_TONE[n.videoStatus] : null;
              return (
                <tr key={n.newsId}>
                  <td>
                    <Link href={`/news/${n.newsId}/edit`}>{n.headline}</Link>
                    <div className="panel-row" style={{ gap: 6, marginTop: 4 }}>
                      {n.isBreaking && <span className="panel-badge" data-tone="danger">Breaking</span>}
                      {video && <span className="panel-badge" data-tone={video.tone}>{video.label}</span>}
                      {n.lastReview?.action === "REQUEST_CHANGES" && <span className="panel-badge" data-tone="info">Resubmitted</span>}
                    </div>
                  </td>
                  <td>{n.reporterName}{n.reporterId ? <div className="panel-hint">{n.reporterId}</div> : null}</td>
                  <td>{names.get(n.districtId) ?? "—"}</td>
                  <td>{names.get(n.categoryId) ?? "—"}</td>
                  <td title={n[queue.since]?.toDate().toLocaleString("en-IN")}>{timeAgo(n[queue.since]?.toDate())}</td>
                  {queue.status === "UNDER_REVIEW" && (
                    <td>{n.lastReview?.action === "START_REVIEW" ? staff.get(n.lastReview.reviewerId) ?? "—" : "—"}</td>
                  )}
                  <td>
                    <div className="panel-row" style={{ flexWrap: "nowrap" }}>
                      {queue.status === "SUBMITTED" && (
                        <button type="button" disabled={busy} onClick={() => run(n, "UNDER_REVIEW", "is now in review")}>
                          Start review
                        </button>
                      )}
                      {queue.status === "UNDER_REVIEW" && (
                        <button type="button" disabled={busy} onClick={() => run(n, "APPROVED", "approved")}>Approve</button>
                      )}
                      {queue.status === "APPROVED" && (
                        <button type="button" disabled={busy || n.videoStatus === "UNAVAILABLE"} onClick={() => run(n, "PUBLISHED", "published")}>
                          Publish
                        </button>
                      )}
                      <Link href={`/news/${n.newsId}/edit`}>
                        <button type="button" className="panel-secondary">{queue.status === "UNDER_REVIEW" ? "Review" : "Open"}</button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="panel-muted">{queue.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="panel-hint">To request changes or reject, open the article: those decisions need remarks for the reporter.</p>
    </>
  );
}
