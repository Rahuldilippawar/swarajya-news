import type { NavItem } from "@swarajya/panel-kit";
import type { Role } from "@swarajya/shared";

export const ALLOWED_ROLES: readonly Role[] = ["REPORTER"];

export const PLANNED_SECTIONS: Record<string, { label: string; milestone: number }> = {
  news: { label: "My News", milestone: 4 },
  profile: { label: "Profile", milestone: 4 },
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  ...Object.entries(PLANNED_SECTIONS).map(([slug, { label }]) => ({ href: `/${slug}`, label })),
];
