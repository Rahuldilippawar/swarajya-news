import type { NavItem } from "@swarajya/panel-kit";
import { ADMIN_PANEL_ROLES, type Role } from "@swarajya/shared";

export const ALLOWED_ROLES: readonly Role[] = ADMIN_PANEL_ROLES;

/** Sections shown in the navigation but built in later milestones. */
export const PLANNED_SECTIONS: Record<string, { label: string; milestone: number }> = {
  advertisements: { label: "Advertisements", milestone: 10 },
  reports: { label: "Reports", milestone: 10 },
  settings: { label: "Settings", milestone: 10 },
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pending-approval", label: "Pending Approval", permission: "news.review" },
  { href: "/news", label: "News", permission: "news.editAny" },
  { href: "/notifications", label: "Notifications", permission: "notifications.send" },
  { href: "/whatsapp", label: "WhatsApp", permission: "whatsapp.send" },
  { href: "/categories", label: "Categories" },
  { href: "/locations", label: "Locations" },
  { href: "/reporters", label: "Staff & Reporters", permission: "users.manage" },
  { href: "/audit-log", label: "Audit log", permission: "auditLogs.view" },
  ...Object.entries(PLANNED_SECTIONS).map(([slug, { label }]) => ({ href: `/${slug}`, label })),
];
