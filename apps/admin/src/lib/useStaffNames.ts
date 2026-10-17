"use client";

import { getFirebase, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, type UserDoc } from "@swarajya/shared";
import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";

/** uid → full name for every staff account (readable by editors and managers). */
export function useStaffNames(): Map<string, string> {
  const { data } = useLiveQuery<UserDoc>(() => query(collection(getFirebase().db, COLLECTIONS.users), orderBy("fullName")), []);
  return useMemo(() => new Map((data ?? []).map((u) => [u.uid, u.fullName])), [data]);
}
