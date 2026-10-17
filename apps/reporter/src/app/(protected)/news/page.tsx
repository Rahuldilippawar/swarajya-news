"use client";

import { getFirebase, StatusBadge, useAuth, useCategories, useLiveQuery } from "@swarajya/panel-kit";
import type { NewsDoc } from "@swarajya/shared";
import { limit, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { MY_NEWS_GROUPS, myNewsQuery } from "@/lib/myNews";

const PAGE_SIZE = 25;

export default function MyNewsPage() {
  return (
    <Suspense fallback={<p className="panel-muted">Loading…</p>}>
      <MyNews />
    </Suspense>
  );
}

function MyNews() {
  const { user } = useAuth();
  const router = useRouter();
  const groupKey = useSearchParams().get("status") ?? "";
  const group = MY_NEWS_GROUPS.find((g) => g.key === groupKey);
  const [pageCount, setPageCount] = useState(1);

  const { data, error } = useLiveQuery<NewsDoc>(
    () => (user ? query(myNewsQuery(getFirebase().db, user.uid, group?.statuses), orderBy("updatedAt", "desc"), limit(PAGE_SIZE * pageCount)) : null),
    [user?.uid, groupKey, pageCount],
  );
  const categories = useCategories();
  const categoryNames = useMemo(() => new Map(categories.data?.map((c) => [c.categoryId, c.name])), [categories.data]);

  return (
    <>
      <div className="panel-row panel-section">
        <h1 style={{ margin: 0 }}>My News</h1>
        <span className="panel-spacer" />
        <Link href="/news/create"><button type="button">Submit news</button></Link>
      </div>
      <div className="panel-row panel-section">
        <select
          value={groupKey}
          aria-label="Filter by status"
          onChange={(e) => {
            setPageCount(1);
            router.replace(e.target.value ? `/news?status=${e.target.value}` : "/news");
          }}
        >
          <option value="">All my news</option>
          {MY_NEWS_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>
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
                <th>Editor remarks</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.map((n) => {
                const showRemarks = n.status === "CHANGES_REQUESTED" || n.status === "REJECTED";
                return (
                  <tr key={n.newsId}>
                    <td><Link href={`/news/${n.newsId}/edit`}>{n.headline}</Link></td>
                    <td><StatusBadge status={n.status} /></td>
                    <td>{categoryNames.get(n.categoryId) ?? "—"}</td>
                    <td>{showRemarks && n.lastReview?.remarks ? `“${n.lastReview.remarks}”` : "—"}</td>
                    <td>{n.updatedAt?.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="panel-muted">
                    {group ? "Nothing here." : <>You have not written any news yet. <Link href="/news/create">Submit your first story</Link>.</>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {(data?.length ?? 0) >= PAGE_SIZE * pageCount && (
        <p><button type="button" className="panel-secondary" onClick={() => setPageCount((p) => p + 1)}>Load more</button></p>
      )}
    </>
  );
}
