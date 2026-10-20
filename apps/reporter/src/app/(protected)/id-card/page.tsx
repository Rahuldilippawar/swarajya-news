"use client";

import { IdCardPage, useAuth } from "@swarajya/panel-kit";

export default function MyIdCardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <IdCardPage uid={user.uid} canManage={false} />;
}
