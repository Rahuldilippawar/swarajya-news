"use client";

import { formatDateTime, getFirebase, useAuth, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, hasPermission, NEWS_STATUS_LABELS, type AuditLogDoc, type NewsStatus } from "@swarajya/shared";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStaffNames } from "@/lib/useStaffNames";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Created account",
  USER_ROLE_SET: "Set role",
  USER_SUSPENDED: "Suspended account",
  USER_REACTIVATED: "Reactivated account",
  USER_PROFILE_UPDATED: "Updated profile",
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const status = action.replace(/^NEWS_/, "") as NewsStatus;
  return action.startsWith("NEWS_") && NEWS_STATUS_LABELS[status] ? `News → ${NEWS_STATUS_LABELS[status]}` : action;
}

function details(meta: Record<string, unknown> | undefined): string {
  if (!meta) return "";
  const parts: string[] = [];
  if (typeof meta.role === "string") parts.push(`role ${meta.role}${meta.previousRole ? ` (was ${meta.previousRole})` : ""}`);
  if (typeof meta.email === "string") parts.push(meta.email);
  if (typeof meta.from === "string" && typeof meta.to === "string") parts.push(`${meta.from} → ${meta.to}`);
  if (typeof meta.remarks === "string") parts.push(`“${meta.remarks}”`);
  if (Array.isArray(meta.fields)) parts.push(`fields: ${meta.fields.join(", ")}`);
  return parts.join(" · ");
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<p className="panel-muted">Loading…</p>}>
      <AuditLog />
    </Suspense>
  );
}

function AuditLog() {
  const { role } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type") ?? "";
  const target = params.get("target") ?? "";
  const [pageCount, setPageCount] = useState(1);
  const staff = useStaffNames();

  const { data, error } = useLiveQuery<AuditLogDoc>(() => {
    const col = collection(getFirebase().db, COLLECTIONS.auditLogs);
    const n = limit(PAGE_SIZE * pageCount);
    if (target) return query(col, where("targetId", "==", target), orderBy("timestamp", "desc"), n);
    if (type) return query(col, where("targetType", "==", type), orderBy("timestamp", "desc"), n);
    return query(col, orderBy("timestamp", "desc"), n);
  }, [type, target, pageCount]);

  if (!hasPermission(role, "auditLogs.view")) {
    return <p className="panel-alert" role="alert">Only the Super Admin can view the audit log.</p>;
  }

  const who = (id: string) => staff.get(id) ?? (id.startsWith("cli:") ? "Command line" : id);

  return (
    <>
      <h1>Audit log</h1>
      <div className="panel-row panel-section">
        <select
          value={type}
          aria-label="Filter by type"
          onChange={(e) => {
            setPageCount(1);
            router.replace(e.target.value ? `/audit-log?type=${e.target.value}` : "/audit-log");
          }}
        >
          <option value="">Everything</option>
          <option value="news">News</option>
          <option value="user">Staff accounts</option>
        </select>
        {target && (
          <span className="panel-muted">
            Showing one record · <Link href="/audit-log">show all</Link>
          </span>
        )}
      </div>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {!data && !error && <p className="panel-muted">Loading…</p>}
      {data && (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map((log) => (
                <tr key={log.logId}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.timestamp?.toDate())}</td>
                  <td>{who(log.actorId)}</td>
                  <td>{actionLabel(log.action)}</td>
                  <td>
                    {log.targetType === "news" ? (
                      <Link href={`/news/${log.targetId}/edit`}>Article</Link>
                    ) : log.targetType === "user" ? (
                      who(log.targetId)
                    ) : (
                      `${log.targetType} ${log.targetId}`
                    )}{" "}
                    <Link href={`/audit-log?target=${log.targetId}`} className="panel-hint" title="History of this record">
                      history
                    </Link>
                  </td>
                  <td>{details(log.relevantMetadata)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="panel-muted">No entries.</td></tr>
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
