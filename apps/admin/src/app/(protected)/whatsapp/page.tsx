"use client";

import { useAuth, useLocationsOfType } from "@swarajya/panel-kit";
import { hasPermission } from "@swarajya/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { BulletinHistory } from "@/components/whatsapp/BulletinHistory";
import { SendBulletin } from "@/components/whatsapp/SendBulletin";
import { Subscribers } from "@/components/whatsapp/Subscribers";

const TABS = [
  { id: "send", label: "Send bulletin" },
  { id: "history", label: "History" },
  { id: "subscribers", label: "Subscribers" },
] as const;

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<p className="panel-muted">Loading…</p>}>
      <WhatsApp />
    </Suspense>
  );
}

function WhatsApp() {
  const { role } = useAuth();
  const initialNewsId = useSearchParams().get("newsId") ?? "";
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("send");
  const districts = useLocationsOfType("DISTRICT");
  const districtName = useMemo(() => new Map(districts.data?.map((d) => [d.locationId, d.name])), [districts.data]);

  if (!hasPermission(role, "whatsapp.send")) {
    return <p className="panel-alert" role="alert">You do not have permission to use WhatsApp distribution.</p>;
  }
  return (
    <>
      <h1>WhatsApp</h1>
      <div className="panel-row panel-section" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? undefined : "panel-secondary"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "send" && <SendBulletin initialNewsId={initialNewsId} districts={districts.data ?? []} />}
      {tab === "history" && <BulletinHistory districtName={districtName} />}
      {tab === "subscribers" && <Subscribers districts={districts.data ?? []} />}
    </>
  );
}
