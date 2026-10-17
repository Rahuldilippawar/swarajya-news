"use client";

import { hasPermission, type Permission } from "@swarajya/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout, useAuth } from "./AuthProvider";

export interface NavItem {
  href: string;
  label: string;
  /** Hide the item from users without this permission. */
  permission?: Permission;
}

export function PanelShell({ title, nav, children }: { title: string; nav: readonly NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const visible = nav.filter((item) => !item.permission || hasPermission(role, item.permission));
  // Highlight the most specific match, so /news/create does not also light up /news.
  const current = visible
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar">
        <div className="panel-brand">
          <img src="/logo.svg" alt="" width={56} height={32} />
          <span>{title}</span>
        </div>
        <nav>
          {visible.map((item) => (
            <Link key={item.href} href={item.href} aria-current={item.href === current ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="panel-main">
        <header className="panel-topbar">
          <span className="panel-muted">
            {user?.email} · {role}
          </span>
          <button type="button" onClick={() => logout()}>Sign out</button>
        </header>
        <main className="panel-content">{children}</main>
      </div>
    </div>
  );
}
