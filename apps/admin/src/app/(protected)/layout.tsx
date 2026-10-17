"use client";

import { PanelShell, RequireRole } from "@swarajya/panel-kit";
import { ALLOWED_ROLES, NAV } from "@/lib/sections";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowed={ALLOWED_ROLES}>
      <PanelShell title="Admin Panel" nav={NAV}>
        {children}
      </PanelShell>
    </RequireRole>
  );
}
