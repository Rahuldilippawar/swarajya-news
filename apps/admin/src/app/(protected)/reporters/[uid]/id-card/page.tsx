"use client";

import { IdCardPage, useAuth } from "@swarajya/panel-kit";
import { hasPermission } from "@swarajya/shared";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function StaffIdCardPage() {
  const { uid } = useParams<{ uid: string }>();
  const { role } = useAuth();
  if (!hasPermission(role, "users.manage")) {
    return <p className="panel-alert" role="alert">You do not have permission to manage staff.</p>;
  }
  return (
    <>
      <p><Link href="/reporters">← Staff &amp; Reporters</Link></p>
      <IdCardPage uid={uid} canManage />
    </>
  );
}
