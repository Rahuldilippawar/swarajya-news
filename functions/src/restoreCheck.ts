import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS, NEWS_PRIVATE_SUBCOLLECTION } from "@swarajya/shared";

/** Top-level collections plus the subcollections (counted across all parents). */
const GROUPS = [...Object.values(COLLECTIONS), NEWS_PRIVATE_SUBCOLLECTION, "daily", "recipients"];

export interface CountRow {
  collection: string;
  source: number;
  restored: number;
  ok: boolean;
}

/**
 * Compares document counts between the live database and a restored copy.
 * Counts use aggregation queries (one read per 1,000 documents), so this is
 * cheap to run after every restore drill. Writes made after the backup was
 * taken show up as differences; compare against a quiet period or expect them.
 */
export async function compareCounts(source: Firestore, restored: Firestore, groups: readonly string[] = GROUPS): Promise<CountRow[]> {
  return Promise.all(
    groups.map(async (group) => {
      const [a, b] = await Promise.all([
        source.collectionGroup(group).count().get(),
        restored.collectionGroup(group).count().get(),
      ]);
      const row = { collection: group, source: a.data().count, restored: b.data().count };
      return { ...row, ok: row.source === row.restored };
    }),
  );
}
