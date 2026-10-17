"use client";

import { useAuth } from "@swarajya/panel-kit";
import { hasPermission } from "@swarajya/shared";
import { CreateStaffForm } from "@/components/staff/CreateStaffForm";
import { StaffTable } from "@/components/staff/StaffTable";
import { useStaff } from "@/components/staff/useStaff";

export default function StaffPage() {
  const { user, role } = useAuth();
  const canManage = hasPermission(role, "users.manage");
  const { rows, error } = useStaff();

  if (!user || !role || !canManage) {
    return <p className="panel-alert" role="alert">You do not have permission to manage staff.</p>;
  }

  return (
    <>
      <h1>Staff &amp; Reporters</h1>
      <CreateStaffForm actorRole={role} />
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {!rows && !error && <p className="panel-muted">Loading…</p>}
      {rows && <StaffTable rows={rows} actorUid={user.uid} actorRole={role} />}
    </>
  );
}
