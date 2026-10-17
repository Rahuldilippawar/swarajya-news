"use client";

import { callFunction, errorMessage, useAuth } from "@swarajya/panel-kit";
import { hasPermission, toCsv, type CallableResponse, type ReportRow } from "@swarajya/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DailyBars } from "@/components/DailyBars";

type Report = CallableResponse<"getReport">;

/** YYYY-MM-DD in India time. */
function indiaDay(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

const PRESETS = [
  { id: "today", label: "Today", days: 1 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
] as const;

function rangeFor(days: number) {
  const now = new Date();
  return { from: indiaDay(new Date(now.getTime() - (days - 1) * 86400_000)), to: indiaDay(now) };
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { role } = useAuth();
  const [range, setRange] = useState(rangeFor(7));
  const [preset, setPreset] = useState<string>("7");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (r: { from: string; to: string }) => {
    setLoading(true);
    setError(null);
    try {
      setReport(await callFunction("getReport", r));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  if (!hasPermission(role, "reports.view")) return <p className="panel-alert" role="alert">You do not have permission to view reports.</p>;

  const suffix = report ? `${report.from}_to_${report.to}` : "";
  const rowsCsv = (rows: ReportRow[], what: string) => toCsv([what, "Published", "Views"], rows.map((r) => [r.label, r.published, r.views]));

  return (
    <>
      <h1>Reports</h1>
      <div className="panel-row panel-section" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={preset === p.id ? undefined : "panel-secondary"}
            aria-pressed={preset === p.id}
            onClick={() => {
              setPreset(p.id);
              setRange(rangeFor(p.days));
            }}
          >
            {p.label}
          </button>
        ))}
        <label className="panel-check" style={{ gap: 6 }}>
          From <input type="date" value={range.from} max={range.to} onChange={(e) => { setPreset("custom"); setRange({ ...range, from: e.target.value }); }} />
        </label>
        <label className="panel-check" style={{ gap: 6 }}>
          To <input type="date" value={range.to} min={range.from} onChange={(e) => { setPreset("custom"); setRange({ ...range, to: e.target.value }); }} />
        </label>
        {loading && <span className="panel-muted">Loading…</span>}
      </div>
      {error && <p className="panel-alert" role="alert">{error}</p>}

      {report && (
        <>
          <div className="panel-stats panel-section">
            {[
              ["Published", report.totals.published],
              ["Submitted", report.totals.submitted],
              ["Approved", report.totals.approved],
              ["Returned", report.totals.changesRequested],
              ["Rejected", report.totals.rejected],
              ["Video news", report.totals.videos],
              ["Views of these articles", report.totals.views],
            ].map(([label, value]) => (
              <div key={label} className="panel-card">
                <span className="panel-muted">{label}</span>
                <strong>{Number(value).toLocaleString("en-IN")}</strong>
              </div>
            ))}
          </div>
          {report.truncated && <p className="panel-callout" data-tone="warn">This range is very large; lists show the first results only. Choose a shorter range for full detail.</p>}

          <section className="panel-card panel-section">
            <DailyBars days={report.byDay} />
            <details style={{ marginTop: 8 }}>
              <summary className="panel-hint">Show as a table</summary>
              <table className="panel-table">
                <thead><tr><th>Date</th><th>Published</th></tr></thead>
                <tbody>{report.byDay.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.published}</td></tr>)}</tbody>
              </table>
            </details>
            <button type="button" className="panel-secondary" onClick={() => download(`daily_${suffix}.csv`, toCsv(["Date", "Published"], report.byDay.map((d) => [d.date, d.published])))}>
              Download CSV
            </button>
          </section>

          <Table
            title="By reporter"
            head={["Reporter", "ID", "Submitted", "Published", "Returned", "Rejected", "Views"]}
            rows={report.byReporter.map((r) => [r.name, r.reporterId || "—", r.submitted, r.published, r.changesRequested, r.rejected, r.views])}
            onCsv={() => download(`reporters_${suffix}.csv`, toCsv(["Reporter", "Reporter ID", "Submitted", "Published", "Returned", "Rejected", "Views"], report.byReporter.map((r) => [r.name, r.reporterId, r.submitted, r.published, r.changesRequested, r.rejected, r.views])))}
          />
          <div className="panel-editor" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Table title="By category" head={["Category", "Published", "Views"]} rows={report.byCategory.map((r) => [r.label, r.published, r.views])} onCsv={() => download(`categories_${suffix}.csv`, rowsCsv(report.byCategory, "Category"))} />
            <Table title="By district" head={["District", "Published", "Views"]} rows={report.byDistrict.map((r) => [r.label, r.published, r.views])} onCsv={() => download(`districts_${suffix}.csv`, rowsCsv(report.byDistrict, "District"))} />
          </div>
          <Table
            title="Most viewed (published in this range)"
            head={["Headline", "Reporter", "Published", "Views"]}
            rows={report.articles.slice(0, 20).map((a) => [
              <Link key={a.newsId} href={`/news/${a.newsId}/edit`}>{a.headline}</Link>,
              a.reporterName,
              new Date(a.publishedAt).toLocaleDateString("en-IN"),
              a.views,
            ])}
            onCsv={() =>
              download(
                `articles_${suffix}.csv`,
                toCsv(
                  ["Published at", "Headline", "Reporter", "Category ID", "District ID", "Video", "Views", "Slug"],
                  report.articles.map((a) => [a.publishedAt, a.headline, a.reporterName, a.categoryId, a.districtId, a.hasVideo ? "yes" : "no", a.views, a.slug]),
                ),
              )
            }
            csvLabel="Download all articles (CSV)"
          />
        </>
      )}
    </>
  );
}

function Table({ title, head, rows, onCsv, csvLabel = "Download CSV" }: { title: string; head: string[]; rows: React.ReactNode[][]; onCsv: () => void; csvLabel?: string }) {
  return (
    <section className="panel-section">
      <div className="panel-row" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span className="panel-spacer" />
        <button type="button" className="panel-secondary" onClick={onCsv} disabled={rows.length === 0}>{csvLabel}</button>
      </div>
      <div className="panel-table-wrap">
        <table className="panel-table">
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>)}
            {rows.length === 0 && <tr><td colSpan={head.length} className="panel-muted">Nothing in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
