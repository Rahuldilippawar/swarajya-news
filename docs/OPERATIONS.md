# Operations

Backups, restore drills, monitoring and cost control for the **production** Firebase project. Commands use the
Google Cloud CLI (`gcloud`) signed in as a project owner; replace `PROJECT` with the production project ID and
`LOCATION` with the Firestore location (for example `asia-south1`).

```bash
gcloud config set project PROJECT
```

## 1. Firestore backups

Firestore's managed backups need no bucket or code. Set up both schedules once, at launch:

```bash
# Daily backups, kept 14 days
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d

# Weekly backups (Sunday), kept 14 weeks
gcloud firestore backups schedules create --database='(default)' --recurrence=weekly --day-of-week=SUN --retention=14w

# Check
gcloud firestore backups schedules list --database='(default)'
gcloud firestore backups list --location=LOCATION
```

Also turn on **point-in-time recovery**, which keeps every version of every document for 7 days, so a mistake
made at 11:40 can be undone to 11:39:

```bash
gcloud firestore databases update --database='(default)' --enable-pitr
```

Backups and PITR are billed by stored size; for a regional news site this is a few rupees a month.

## 2. Restore drill (do this before launch, then every quarter)

A restore always goes into a **new** database, never over the live one, so a drill cannot harm production.

```bash
# 1. Pick the latest backup
gcloud firestore backups list --location=LOCATION --format="table(name, database, snapshotTime, state)"

# 2. Restore it into a test database
gcloud firestore databases restore \
  --source-backup=projects/PROJECT/locations/LOCATION/backups/BACKUP_ID \
  --destination-database=restore-test

# 3. Compare document counts with the live database (exits 1 if anything differs)
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json GCLOUD_PROJECT=PROJECT \
  npm run verify-restore -w functions -- --database restore-test

# 4. Delete the test database
gcloud firestore databases delete --database=restore-test
```

Documents created after the backup's snapshot time show up as small differences in step 3 (view and ad counts
live inside documents and do not affect it); run the drill at a quiet time or check that the differences match
recent activity. Record the date, backup ID and result in the operations log.

**Real recovery.** If data is lost: restore into a new database as above, confirm it with `verify-restore`, then
either copy the affected documents back (small mistakes) or point the apps at the restored database (major loss —
change the database ID in the functions and web config and redeploy). For a mistake in the last 7 days, PITR
reads are simpler: read the documents as they were with a `readTime` and write them back.

## 3. Other data

| Data | Backup |
| --- | --- |
| Firebase Auth accounts | `npx firebase auth:export auth-YYYY-MM-DD.json --format=json --project PROJECT` monthly. The file contains password hashes: store it encrypted, never in git. Roles are custom claims and are restored with `auth:import`. |
| Storage (thumbnails, banners) | Cloud Storage soft delete keeps deleted files 7 days by default; extend it: `gcloud storage buckets update gs://BUCKET --soft-delete-duration=30d`. Images can also be re-uploaded from the reporters' originals. |
| Video | Lives on YouTube, not in Firebase. |
| Secrets | Cloud Secret Manager keeps versions; the WhatsApp values can also be re-issued in Meta Business Manager. |
| Code and configuration | Git (this repository). Firestore rules and indexes deploy from it. |

## 4. Monitoring and alerts

In Google Cloud console → **Monitoring → Alerting**, create:

- **Function errors**: log-based alert on `severity>=ERROR` for Cloud Functions (`transitionNews`, `sendNotification`,
  `sendWhatsAppBulletin` failures appear here with the article ID).
- **Uptime check** on the website home page and on the `health` function URL (every 5 minutes).
- **Budget alerts**: Billing → Budgets & alerts → a monthly budget with e-mails at 50 %, 90 % and 100 %.
  A budget alert does not stop spending; it only warns.

Watch weekly at first: Firestore reads per day (Firebase console → Firestore → Usage), function invocations,
Hosting bandwidth, and the App Check metrics.

## 5. Cost and performance notes

- **Website reads are cached on the server** (lists 60 s, articles and taxonomy 5 min), so Firestore reads grow
  with the number of pages, not the number of visitors. A spike of readers on one article costs a handful of reads.
- **The Android app reads Firestore directly**, so its reads do grow with users: about 20–40 reads per app open.
  At 10,000 daily users that is 200,000–400,000 reads a day, roughly ₹10–25 a day at current Blaze prices
  (the first 50,000 reads a day are free).
  If it grows far beyond that, add an app feed endpoint cached the same way as the website.
- **Counters** (`recordView`, `recordAdEvent`) are one write each and rate-limited per IP; `maxInstances`
  (5 and 10) caps their cost under abuse.
- **Search** scans the latest 300 published articles per query (cached). Move to a search service if the archive
  grows past a few thousand articles and search becomes popular.
- **Functions** run in `asia-south1` with `maxInstances: 10` by default; cold starts are about 1–2 s, which only
  affects panel actions.
- **WhatsApp** messages are billed by Meta per delivered template message; the panel shows the recipient count
  before every send.

## 6. App Check

App Check proves that requests come from your real panels and app, not from a script using your public Firebase
config.

- **Enforce it on the callable functions** (the panels): register the panels with reCAPTCHA Enterprise
  (SETUP.md §5), watch the metrics until verified traffic is near 100 %, then set `ENFORCE_APP_CHECK=true` in
  `functions/.env.<project>` and redeploy the functions.
- **Do not enforce it on Firestore or Storage.** The website reads Firestore from its server without an App Check
  token, and the Android app reads public data without the App Check SDK; enforcing would take both offline.
  Firestore access is already limited by the Security Rules.

## 7. Firebase Auth settings (console → Authentication → Settings)

- **Email enumeration protection**: on.
- **Password policy**: require at least 10 characters with upper/lower case and a number; enforce for new
  passwords.
- **Authorized domains**: only the production website and panel domains (remove `localhost` in production).
- **Multi-factor authentication** (needs Identity Platform): turn on SMS or authenticator MFA and ask Super Admins
  and Owners to enrol.
- **User actions**: disable "Enable create (sign-up)" and "Enable delete" so accounts are created only by the
  Admin Panel.

## 8. Routine checklist

| When | Task |
| --- | --- |
| Daily | Glance at function errors and the pending-approval queue age. |
| Weekly | Usage and costs; App Check metrics; WhatsApp opt-outs and failed sends. |
| Monthly | Auth export; review staff accounts and suspend leavers; `npm audit --omit=dev`. |
| Quarterly | Restore drill (§2); review the audit log for unusual role changes; rotate the WhatsApp access token. |
