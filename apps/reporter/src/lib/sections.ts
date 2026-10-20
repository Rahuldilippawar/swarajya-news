import type { NavItem } from "@swarajya/panel-kit";
import type { Role } from "@swarajya/shared";

export const ALLOWED_ROLES: readonly Role[] = ["REPORTER"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/news", label: "My News" },
  { href: "/news/create", label: "Submit news" },
  { href: "/id-card", label: "ID card" },
  { href: "/profile", label: "Profile" },
];
