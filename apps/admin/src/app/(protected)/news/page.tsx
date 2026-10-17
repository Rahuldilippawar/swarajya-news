"use client";

import { getFirebase, StatusBadge, useAuth, useCategories, useLiveQuery, useLocationsOfType } from "@swarajya/panel-kit";
import { COLLECTIONS, hasPermission, NEWS_STATUS_LABELS, NEWS_STATUSES, type NewsDoc, type NewsStatus } from "@swarajya/shared";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 25;

export default function NewsListPage() {
  const { role } = useAuth();
  const [status, setStatus] = useState<NewsStatus | "">("");
  const [pageCount, setPageCount] = useState(1);
  const [search, setSearch] = useState("");

  const { data, error } = useLiveQuery<NewsDoc>(() => {
    const col = collection(getFirebase().db, COLLECTIONS.news);
    const n = PAGE_SIZE * pageCount;
    return status
      ? query(col, where("status", "==", status), orderBy("updatedAt", "desc"), limit(n))
      : query(col, orderBy("updatedAt", "desc"), limit(n));
  }, [status, pageCount]);

  const categories = useCategories();
  const districts = useLocationsOfType("DISTRICT");
  const names = useMemo(() => {
    const map = new Map<string, string>();
    categories.data?.forEach((c) => map.set(c.categoryId, c.name));
    districts.data?.forEach((d) => map.set(d.locationId, d.name));
    return map;
  }, [categories.data, districts.data]);

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter((n) => !term || n.headline.toLowerCase().includes(term) || n.tags?.some((t) => t.toLowerCase().includes(term)));
  const mayHaveMore = (data?.length ?? 0) >= PAGE_SIZE * pageCount;

  if (!hasPermission(role, "news.editAny")) {
    return <p className="panel-alert" role="alert">You do not have permission to manage news.</p>;
  }

  return (
    <>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>News</h1>
        <span className="panel-spacer" />
        <Link href="/news/create"><button type="button">Create news</button></Link>
      </div>
      <div className="panel-row panel-section">
        <select
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setStatus(e.target.value as NewsStatus | "");
            setPageCount(1);
          }}
        >
          <option value="">All statuses</option>
          {NEWS_STATUSES.map((s) => (
            <option key={s} value={s}>{NEWS_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input type="search" placeholder="Search loaded headlines and tags" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {!data && !error && <p className="panel-muted">Loading…</p>}
      {data && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Headline</th>
                <th>Status</th>
                <th>Category</th>
                <th>District</th>
                <th>Reporter</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.newsId}>
                  <td>
                    <Link href={`/news/${n.newsId}/edit`}>{n.headline}</Link>
                    {n.isBreaking && <> <span className="panel-badge" data-tone="danger">Breaking</span></>}
                    {n.youtubeVideoId && <> <span className="panel-badge" data-tone="muted">Video</span></>}
                  </td>
                  <td><StatusBadge status={n.status} /></td>
                  <td>{names.get(n.categoryId) ?? "—"}</td>
                  <td>{names.get(n.districtId) ?? "—"}</td>
                  <td>{n.reporterName}</td>
                  <td>{n.updatedAt?.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="panel-muted">No news found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {mayHaveMore && (
        <p><button type="button" className="panel-secondary" onClick={() => setPageCount((p) => p + 1)}>Load more</button></p>
      )}
    </>
  );
}
