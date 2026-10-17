"use client";

import { errorMessage, getFirebase, useAuth } from "@swarajya/panel-kit";
import { COLLECTIONS, hasPermission, type NewsStatus } from "@swarajya/shared";
import { collection, getCountFromServer, query, where, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";

type Stat = { label: string; build: () => Query; permission: "news.editAny" | "users.manage" };

function newsWhere(field: string, value: unknown): () => Query {
  return () => query(collection(getFirebase().db, COLLECTIONS.news), where(field, "==", value));
}
const byStatus = (status: NewsStatus) => newsWhere("status", status);

const STATS: Stat[] = [
  { label: "Total news", build: () => collection(getFirebase().db, COLLECTIONS.news), permission: "news.editAny" },
  { label: "Published", build: byStatus("PUBLISHED"), permission: "news.editAny" },
  { label: "Drafts", build: byStatus("DRAFT"), permission: "news.editAny" },
  { label: "Pending approval", build: byStatus("SUBMITTED"), permission: "news.editAny" },
  { label: "Under review", build: byStatus("UNDER_REVIEW"), permission: "news.editAny" },
  { label: "Returned", build: byStatus("CHANGES_REQUESTED"), permission: "news.editAny" },
  { label: "Rejected", build: byStatus("REJECTED"), permission: "news.editAny" },
  { label: "Video news", build: newsWhere("videoProvider", "YOUTUBE"), permission: "news.editAny" },
  {
    label: "Active reporters",
    build: () =>
      query(collection(getFirebase().db, COLLECTIONS.users), where("role", "==", "REPORTER"), where("status", "==", "ACTIVE")),
    permission: "users.manage",
  },
];

export default function DashboardPage() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const visible = STATS.filter((s) => hasPermission(role, s.permission) || (s.permission === "users.manage" && hasPermission(role, "news.editAny")));

  useEffect(() => {
    let cancelled = false;
    for (const stat of visible) {
      getCountFromServer(stat.build())
        .then((snap) => !cancelled && setCounts((c) => ({ ...c, [stat.label]: snap.data().count })))
        .catch((err) => !cancelled && setCounts((c) => ({ ...c, [stat.label]: errorMessage(err) })));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <>
      <h1>Dashboard</h1>
      {visible.length === 0 && <p className="panel-muted">Statistics for your role arrive with reports (Milestone 10).</p>}
      <div className="panel-stats">
        {visible.map((s) => {
          const value = counts[s.label];
          return (
            <div key={s.label} className="panel-card">
              <span className="panel-muted">{s.label}</span>
              {typeof value === "string" ? <span className="panel-alert">{value}</span> : <strong>{value ?? "…"}</strong>}
            </div>
          );
        })}
      </div>
    </>
  );
}
