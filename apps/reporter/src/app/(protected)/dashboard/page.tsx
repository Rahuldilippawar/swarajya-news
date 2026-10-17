"use client";

import { errorMessage, getFirebase, useAuth } from "@swarajya/panel-kit";
import { getCountFromServer } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MY_NEWS_GROUPS, myNewsQuery } from "@/lib/myNews";

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    for (const group of MY_NEWS_GROUPS) {
      getCountFromServer(myNewsQuery(getFirebase().db, user.uid, group.statuses))
        .then((snap) => !cancelled && setCounts((c) => ({ ...c, [group.key]: snap.data().count })))
        .catch((err) => !cancelled && setCounts((c) => ({ ...c, [group.key]: errorMessage(err) })));
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const returned = counts.returned;
  return (
    <>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>My submissions</h1>
        <span className="panel-spacer" />
        <Link href="/news/create"><button type="button">Submit news</button></Link>
      </div>
      {typeof returned === "number" && returned > 0 && (
        <p className="panel-callout panel-section" data-tone="warn">
          {returned === 1 ? "1 story was" : `${returned} stories were`} returned by the editor for changes.{" "}
          <Link href="/news?status=returned">Review the remarks</Link>
        </p>
      )}
      <div className="panel-stats">
        {MY_NEWS_GROUPS.map((g) => {
          const value = counts[g.key];
          return (
            <Link key={g.key} href={`/news?status=${g.key}`} className="panel-card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="panel-muted">{g.label}</span>
              {typeof value === "string" ? <span className="panel-alert">{value}</span> : <strong>{value ?? "…"}</strong>}
            </Link>
          );
        })}
      </div>
    </>
  );
}
