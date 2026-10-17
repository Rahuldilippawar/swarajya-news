const STATS = [
  "Total news",
  "Published",
  "Drafts",
  "Pending approval",
  "Returned",
  "Rejected",
  "Active reporters",
  "Video news",
] as const;

// Counts are wired to Firestore aggregation queries in Milestone 3.
export default function DashboardPage() {
  return (
    <>
      <h1>Dashboard</h1>
      <div className="panel-stats">
        {STATS.map((label) => (
          <div key={label} className="panel-card">
            <span className="panel-muted">{label}</span>
            <strong>—</strong>
          </div>
        ))}
      </div>
    </>
  );
}
