"use client";

import { getFirebase } from "@swarajya/panel-kit";
import { COLLECTIONS, type UserDoc } from "@swarajya/shared";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

export type StaffRow = Pick<UserDoc, "uid" | "fullName" | "email" | "role" | "status" | "assignedLocations"> & {
  reporterId?: string | null;
};

/** Live list of staff accounts (readable by SUPER_ADMIN and OWNER under the Security Rules). */
export function useStaff() {
  const [rows, setRows] = useState<StaffRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(getFirebase().db, COLLECTIONS.users), orderBy("fullName"));
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => d.data() as StaffRow)),
      (err) => setError(err.code === "permission-denied" ? "You do not have permission to view staff." : err.message),
    );
  }, []);

  return { rows, error };
}
