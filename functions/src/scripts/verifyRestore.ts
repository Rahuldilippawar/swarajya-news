/**
 * Restore drill check: compares document counts in the live (default)
 * database with a database restored from a backup (docs/OPERATIONS.md).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json GCLOUD_PROJECT=<project> \
 *     npm run verify-restore -w functions -- --database restore-test
 *
 * Exits with code 1 when any collection differs.
 */
import { parseArgs } from "node:util";
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { db } from "../admin";
import { compareCounts } from "../restoreCheck";

async function main() {
  const { values } = parseArgs({ options: { database: { type: "string" } } });
  if (!values.database || values.database === "(default)") throw new Error("Usage: --database <restored database ID>");
  const rows = await compareCounts(db, getFirestore(getApp(), values.database));
  console.table(rows);
  const bad = rows.filter((r) => !r.ok);
  console.log(bad.length ? `${bad.length} collection(s) differ.` : "All collections match.");
  process.exitCode = bad.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
