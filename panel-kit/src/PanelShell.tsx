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

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar">
        <div className="panel-brand">
          <img src="/logo.svg" alt="" width={56} height={32} />
          <span>{title}</span>
        </div>
        <nav>
          {nav.filter((item) => !item.permission || hasPermission(role, item.permission)).map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
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
