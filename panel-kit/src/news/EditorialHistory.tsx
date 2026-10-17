"use client";

import { getFirebase } from "../firebase";
import { useLiveQuery } from "../useLiveQuery";
import { COLLECTIONS, type EditorialReviewDoc } from "@swarajya/shared";
import { collection, orderBy, query, where } from "firebase/firestore";

const ACTION_LABELS: Record<EditorialReviewDoc["action"], string> = {
  START_REVIEW: "Review started",
  APPROVE: "Approved",
  REQUEST_CHANGES: "Changes requested",
  REJECT: "Rejected",
  PUBLISH: "Published",
  UNPUBLISH: "Unpublished",
  ARCHIVE: "Archived",
};

export function EditorialHistory({ newsId }: { newsId: string }) {
  const { data, error } = useLiveQuery<EditorialReviewDoc>(
    () => query(collection(getFirebase().db, COLLECTIONS.editorialReviews), where("newsId", "==", newsId), orderBy("createdAt", "desc")),
    [newsId],
  );

  if (error) return <p className="panel-alert">{error}</p>;
  if (!data) return <p className="panel-muted">Loading…</p>;
  if (data.length === 0) return <p className="panel-muted">No editorial decisions yet.</p>;
  return (
    <ul style={{ paddingLeft: 18, margin: 0 }}>
      {data.map((r) => (
        <li key={r.reviewId} style={{ marginBottom: 8 }}>
          <strong>{ACTION_LABELS[r.action]}</strong>
          <span className="panel-muted"> · {r.createdAt?.toDate().toLocaleString("en-IN") ?? "just now"}</span>
          {r.remarks && <div>“{r.remarks}”</div>}
        </li>
      ))}
    </ul>
  );
}
