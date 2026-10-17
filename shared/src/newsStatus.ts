import { hasPermission, type Permission, type Role } from "./roles";

export const NEWS_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "REJECTED",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type NewsStatus = (typeof NEWS_STATUSES)[number];

interface TransitionRule {
  from: NewsStatus;
  to: NewsStatus;
  /** The article's own reporter may perform this transition. */
  author: boolean;
  /** Permission that lets any other user perform this transition. */
  permission: Permission;
  /** A remark explaining the decision is mandatory. */
  requiresRemarks?: boolean;
}

/**
 * The editorial workflow:
 *   DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED
 *   UNDER_REVIEW → CHANGES_REQUESTED → SUBMITTED
 *   UNDER_REVIEW → REJECTED
 *   PUBLISHED → APPROVED (unpublish)
 */
export const NEWS_TRANSITIONS: readonly TransitionRule[] = [
  { from: "DRAFT", to: "SUBMITTED", author: true, permission: "news.editAny" },
  { from: "SUBMITTED", to: "UNDER_REVIEW", author: false, permission: "news.review" },
  { from: "UNDER_REVIEW", to: "APPROVED", author: false, permission: "news.review" },
  { from: "UNDER_REVIEW", to: "CHANGES_REQUESTED", author: false, permission: "news.review", requiresRemarks: true },
  { from: "UNDER_REVIEW", to: "REJECTED", author: false, permission: "news.review", requiresRemarks: true },
  { from: "CHANGES_REQUESTED", to: "SUBMITTED", author: true, permission: "news.editAny" },
  { from: "APPROVED", to: "PUBLISHED", author: false, permission: "news.publish" },
  { from: "PUBLISHED", to: "APPROVED", author: false, permission: "news.publish" },
  { from: "PUBLISHED", to: "ARCHIVED", author: false, permission: "news.publish" },
];

/** Statuses in which the author may still edit the article content. */
export const AUTHOR_EDITABLE_STATUSES: readonly NewsStatus[] = ["DRAFT", "CHANGES_REQUESTED"];

/** Only this status is ever visible to the public website and app. */
export const PUBLIC_STATUS: NewsStatus = "PUBLISHED";

export interface TransitionContext {
  role: Role;
  /** True when the acting user is the article's reporter. */
  isAuthor: boolean;
  remarks?: string;
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function findTransition(from: NewsStatus, to: NewsStatus): TransitionRule | undefined {
  return NEWS_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function nextStatuses(from: NewsStatus): NewsStatus[] {
  return NEWS_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

/**
 * Decides whether `ctx` may move an article from `from` to `to`. Review and
 * publish steps are never open to the author, so a reporter cannot approve or
 * publish their own work.
 */
export function canTransition(from: NewsStatus, to: NewsStatus, ctx: TransitionContext): TransitionCheck {
  const rule = findTransition(from, to);
  if (!rule) return { ok: false, reason: `Transition ${from} → ${to} is not allowed.` };

  const asAuthor = rule.author && ctx.isAuthor && hasPermission(ctx.role, "news.create");
  if (!asAuthor && !hasPermission(ctx.role, rule.permission)) {
    return { ok: false, reason: `Role ${ctx.role} may not move news from ${from} to ${to}.` };
  }
  if (rule.requiresRemarks && !ctx.remarks?.trim()) {
    return { ok: false, reason: "Remarks are required for this decision." };
  }
  return { ok: true };
}
