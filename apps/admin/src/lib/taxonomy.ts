"use client";

import { getFirebase, useLiveQuery } from "@swarajya/panel-kit";
import { COLLECTIONS, type CategoryDoc, type LocationDoc, type LocationType } from "@swarajya/shared";
import { collection, orderBy, query, where } from "firebase/firestore";

const col = (name: string) => collection(getFirebase().db, name);

export function useCategories() {
  return useLiveQuery<CategoryDoc>(() => query(col(COLLECTIONS.categories), orderBy("displayOrder")), []);
}

/** Children of a location, or all STATE locations when `parentId` is null. */
export function useChildLocations(parentId: string | null) {
  return useLiveQuery<LocationDoc>(
    () =>
      parentId
        ? query(col(COLLECTIONS.locations), where("parentLocationId", "==", parentId), orderBy("name"))
        : query(col(COLLECTIONS.locations), where("type", "==", "STATE"), orderBy("name")),
    [parentId],
  );
}

/** All locations of one type (e.g. every district), for pickers. */
export function useLocationsOfType(type: LocationType) {
  return useLiveQuery<LocationDoc>(() => query(col(COLLECTIONS.locations), where("type", "==", type), orderBy("name")), [type]);
}

/** Options for a cascading select: active entries, plus the current value even if it was deactivated. */
export function selectable<T extends { isActive: boolean }>(items: T[] | null, isCurrent: (item: T) => boolean): T[] {
  return (items ?? []).filter((i) => i.isActive || isCurrent(i));
}
