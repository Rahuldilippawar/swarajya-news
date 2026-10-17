const STATS = ["Drafts", "Submitted", "Pending review", "Published", "Returned", "Rejected"] as const;

// Counts of the reporter's own submissions are wired up in Milestone 4.
export default function DashboardPage() {
  return (
    <>
      <h1>My submissions</h1>
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
