import { COLLECTIONS, type NewsStatus } from "@swarajya/shared";
import { collection, query, where, type Firestore, type Query } from "firebase/firestore";

/** Groups shown to reporters; "Pending review" covers both waiting and in-review. */
export const MY_NEWS_GROUPS: { key: string; label: string; statuses: NewsStatus[] }[] = [
  { key: "draft", label: "Drafts", statuses: ["DRAFT"] },
  { key: "pending", label: "Pending review", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "returned", label: "Returned for changes", statuses: ["CHANGES_REQUESTED"] },
  { key: "approved", label: "Approved", statuses: ["APPROVED"] },
  { key: "published", label: "Published", statuses: ["PUBLISHED"] },
  { key: "rejected", label: "Rejected", statuses: ["REJECTED"] },
];

/**
 * The reporter's own news. Security Rules only allow reporters to read their
 * own drafts, so every query must filter on reporterUid.
 */
export function myNewsQuery(db: Firestore, uid: string, statuses?: NewsStatus[]): Query {
  const base = query(collection(db, COLLECTIONS.news), where("reporterUid", "==", uid));
  return statuses ? query(base, where("status", "in", statuses)) : base;
}
