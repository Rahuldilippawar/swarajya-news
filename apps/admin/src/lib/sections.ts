import type { NavItem } from "@swarajya/panel-kit";
import { ADMIN_PANEL_ROLES, type Role } from "@swarajya/shared";

export const ALLOWED_ROLES: readonly Role[] = ADMIN_PANEL_ROLES;

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pending-approval", label: "Pending Approval", permission: "news.review" },
  { href: "/news", label: "News", permission: "news.editAny" },
  { href: "/notifications", label: "Notifications", permission: "notifications.send" },
  { href: "/whatsapp", label: "WhatsApp", permission: "whatsapp.send" },
  { href: "/categories", label: "Categories" },
  { href: "/locations", label: "Locations" },
  { href: "/reporters", label: "Staff & Reporters", permission: "users.manage" },
  { href: "/advertisements", label: "Advertisements", permission: "ads.manage" },
  { href: "/reports", label: "Reports", permission: "reports.view" },
  { href: "/audit-log", label: "Audit log", permission: "auditLogs.view" },
  { href: "/settings", label: "Settings" },
];
