/** "just now", "5 min ago", "3 h ago", "2 days ago" — for waiting times in queues. */
export function timeAgo(date: Date | undefined, now = Date.now()): string {
  if (!date) return "—";
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatDateTime(date: Date | undefined): string {
  return date ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
