import { NEWS_STATUS_LABELS, type NewsStatus } from "@swarajya/shared";

const TONE: Record<NewsStatus, string> = {
  DRAFT: "muted",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  CHANGES_REQUESTED: "warn",
  REJECTED: "danger",
  APPROVED: "info",
  PUBLISHED: "ok",
  ARCHIVED: "muted",
};

export function StatusBadge({ status }: { status: NewsStatus }) {
  return <span className="panel-badge" data-tone={TONE[status]}>{NEWS_STATUS_LABELS[status] ?? status}</span>;
}
