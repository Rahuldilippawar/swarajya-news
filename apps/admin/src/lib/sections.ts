import type { NavItem } from "@swarajya/panel-kit";
import { ADMIN_PANEL_ROLES, type Role } from "@swarajya/shared";

export const ALLOWED_ROLES: readonly Role[] = ADMIN_PANEL_ROLES;

/** Sections shown in the navigation but built in later milestones. */
export const PLANNED_SECTIONS: Record<string, { label: string; milestone: number }> = {
  news: { label: "News", milestone: 3 },
  "pending-approval": { label: "Pending Approval", milestone: 5 },
  categories: { label: "Categories", milestone: 3 },
  locations: { label: "Locations", milestone: 3 },
  advertisements: { label: "Advertisements", milestone: 10 },
  notifications: { label: "Notifications", milestone: 8 },
  whatsapp: { label: "WhatsApp", milestone: 9 },
  reports: { label: "Reports", milestone: 10 },
  settings: { label: "Settings", milestone: 3 },
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reporters", label: "Staff & Reporters", permission: "users.manage" },
  ...Object.entries(PLANNED_SECTIONS).map(([slug, { label }]) => ({ href: `/${slug}`, label })),
];
