# Milestones

| # | Milestone | Status |
| - | --- | --- |
| 1 | Project setup | ✅ Done |
| 2 | Authentication and roles | ✅ Done |
| 3 | Firestore and news management | ✅ Done |
| 4 | Reporter workflow | ✅ Done |
| 5 | Editorial approval | ✅ Done |
| 6 | Public website | ✅ Done |
| 7 | Flutter Android app | ✅ Done (CI builds the APK; device testing pending) |
| 8 | Push notifications | ✅ Done (real-device delivery test pending) |
| 9 | WhatsApp integration | ✅ Done (live API test pending) |
| 10 | Ads and reports | ✅ Done |
| 11 | Security and testing | ✅ Done |
| 12 | Production launch | ✅ Ready (go-live steps need the production accounts) |

## Milestone 1 — Project setup ✅

Acceptance: *website and Flutter app start successfully* — met.

- npm-workspaces monorepo; Next.js 15 website, Admin Panel and Reporter Panel; Flutter Android app; Cloud Functions.
- Environment templates (`.env.example` in each app, `.firebaserc.example`).
- ESLint, TypeScript strict mode, `flutter analyze`, CI workflow.
- Basic error handling: website error/404 pages, panel config/network errors, Flutter splash retry.
- Website pages: home, latest, breaking, video, about, contact, privacy and editorial policy placeholders, `robots.txt`, `sitemap.xml`.

## Milestone 2 — Authentication and roles ✅

Acceptance: *unauthorised users cannot access protected functionality* — met, and covered by tests.

- Roles are a Firebase Auth custom claim; Security Rules and functions trust only the claim.
- Callable functions (`functions/src/users.ts`): `createStaffUser`, `setStaffRole`, `setStaffStatus`, `updateStaffProfile`.
  - SUPER_ADMIN manages everyone; OWNER manages EDITOR, REPORTER and SOCIAL_MEDIA_MANAGER only.
  - Nobody can change their own role or suspend themselves.
  - Reporters get sequential IDs (`SN-R-0001`, …) from a server-only counter.
  - New accounts have no password; the admin receives a one-time setup link to pass on privately.
  - Every change is written to `auditLogs`.
- Suspension disables the Auth account, revokes sessions, and is enforced **immediately** by Security Rules
  (writes require `users/{uid}.status == ACTIVE`), so an unexpired token cannot be used to keep writing.
- Admin Panel → **Staff & Reporters**: create accounts, change roles, suspend/reactivate, search and filter.
- Reporter Panel → **Profile**: reporter ID, role, assigned locations, account status, change password.
- Login, logout, password reset and role-based route guards in both panels.
- Secure first-Super-Admin provisioning via the Admin SDK CLI.
- App Check: clients attach tokens when `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` is set; functions enforce it when `ENFORCE_APP_CHECK=true`.

Tests: role rules (shared unit tests), 13 function tests against the Auth + Firestore emulators,
19 Security Rules tests, and a manual browser run of the full create → set password → sign in → suspend → reactivate flow.

## Milestone 3 — Firestore and news management ✅

Acceptance: *admin can create and manage draft news* — met, and checked end to end in a browser against the emulators.

- **Categories** (Admin → Categories): add, rename, reorder, activate/deactivate. The slug is the document ID, so
  category URLs never change and can never collide.
- **Locations** (Admin → Locations): state → district → taluka → village, added without code changes.
  Security Rules enforce the hierarchy and stop locations being moved or retyped.
- **Seed data**: `npm run seed -w functions` adds Maharashtra, its 36 districts and 9 starter categories
  (safe to re-run; never overwrites edits). *Please have the editorial team check the Marathi spellings.*
- **News editor** (Admin → News → Create): headline, summary, article, category, district/taluka/village,
  reporter (or office desk), photo upload to Storage, YouTube link with instant format check and embedded preview,
  tags, SEO title/description, breaking and featured flags, preview, editorial history.
- **News list** with status filter, search and "load more" pagination.
- **Workflow**: `transitionNews` Cloud Function is the only way to change status. It enforces
  `shared/src/newsStatus.ts`, validates required fields on submit, records editorial reviews and audit logs, keeps
  slugs unique on publish, and defaults the thumbnail to the YouTube one.
- **YouTube checks** on submit and publish via YouTube's oEmbed endpoint: unavailable (private, deleted,
  non-embeddable) videos block publishing; if YouTube can't be reached the video is marked *unverified* and the editor
  is told. A published article's video is locked until it is unpublished.
- **Dashboard** shows live counts by status, video news and active reporters.
- **Reporter location assignment** on the Staff page; reporters see their district names on their profile.
- Callable functions now also refuse callers whose profile is not ACTIVE.

## Milestone 4 — Reporter workflow ✅

Acceptance: *a reporter can submit news and track its status* — met, and checked end to end in a browser
(reporter submits → editor requests changes → reporter sees the remarks, corrects and resubmits → editor publishes).

- Reporter Panel → **Submit news**: the same editor as the Admin Panel, without editor-only controls
  (reporter picker, breaking/featured, SEO). The reporter's first assigned district is preselected.
- New fields: **news date & time** (when the event happened) and **private source notes**, stored in
  `news/{id}/private/sourceNotes` so they stay hidden from the public even after publication.
- Reporters can edit only while an article is a draft or returned for changes; otherwise it opens read-only with an
  explanation. Drafts can be deleted.
- **My News**: the reporter's own articles with a status filter, editor remarks for returned/rejected stories, paging.
- **Dashboard**: counts for drafts, pending review, returned, approved, published and rejected (each links to the
  filtered list), plus a banner when stories are returned for changes.
- The latest editor decision and remarks are stored on the article (`lastReview`, server-written) so lists show them
  without extra reads; the full history remains in `editorialReviews`.
- The news editor, taxonomy hooks and status badge moved into `panel-kit`, shared by both panels.

## Milestone 5 — Editorial approval ✅

Acceptance: *only authorised editors can approve and publish news* — met. Enforced by the `transitionNews` function
(tests cover OWNER, SOCIAL_MEDIA_MANAGER and REPORTER being refused) and by Security Rules that block any client
from writing `status`; checked in a browser with Editor, Owner and Super Admin accounts.

- **Pending Approval** (Admin, editors and Super Admin only): three live queues — *waiting for review*,
  *in review* (with the reviewer's name) and *approved, ready to publish* — oldest first, with breaking,
  video-status and "resubmitted" badges. One-click Start review / Approve / Publish; request changes and reject
  open the article because they need remarks. Publish is disabled when the video is known to be unavailable.
- **Audit log** (Super Admin only): every staff and editorial action with who, when, what and details
  (role changes, status moves, remarks); filter by news or staff accounts, drill into one record's full trail,
  and open it from any article ("Full audit trail").
- Dashboard cards for pending, in-review and ready-to-publish link straight to the queue.

## Milestone 6 — Public website ✅

Acceptance: *published articles appear publicly and draft articles remain private* — met. Checked in a production
build against the emulators: drafts never appear in any list, search, sitemap or by direct URL; the website reads
Firestore anonymously, so the Security Rules (which allow only published news) apply to it like any visitor.

- **Pages:** homepage (breaking ticker, featured story, latest, video news, Shorts, category sections, district
  links), latest, breaking, video news, category, district with taluka and village filters, article and search.
  "Older news" pagination everywhere.
- **Article page:** headline, summary, reporter, village/taluka/district, publish and update times, event time,
  click-to-play YouTube player (YouTube's own player, with a direct YouTube link as fallback; Shorts in a vertical
  frame) or photo, tags, related news, WhatsApp share (headline + summary + link) and copy link.
- **View counts:** the `recordView` function counts one view per article per browser session, published articles only.
- **SEO:** per-article title, description, canonical URL, Open Graph/Twitter cards, `NewsArticle` structured data
  (escaped against script injection), sitemap with categories, districts and up to 1,000 recent articles,
  robots.txt, optimised thumbnails via Next.js images, Marathi dates in Indian time.
- **Cost and resilience:** Firestore results are cached and shared by all visitors (lists 60 s, articles and
  taxonomy 5 min), so traffic spikes do not multiply database reads. Only successful results are cached: a
  Firestore outage or a build without configuration shows empty sections for that request without being stored.
- **Search** scans the latest 300 published articles (optionally by category/district) for headline, summary and
  tags. Fine for now; a search service can replace it when the archive grows.

Not yet: advertisement slots (Milestone 10) and instant cache refresh on publish (currently up to a minute; can
be added with on-demand revalidation).

## Milestone 7 — Flutter Android app ✅

Acceptance: *Android users can browse and watch published news* — met in widget tests (34 passing, run against an
in-memory repository); `flutter analyze` is clean. **Not yet run on a phone**: the Android SDK could not be
downloaded in the development sandbox, so CI now builds a debug APK on every push and a real-device check is
still needed with a real Firebase config.

- Home (breaking strip, featured, latest, categories), video news and Shorts, categories, district → taluka →
  village news, search with filters, saved news (offline, on device), about/contact/privacy.
- Article screen: text, photo, click-to-play YouTube's embedded player with "open in YouTube" fallback, event
  time, tags, related news, WhatsApp and system share, save.
- Loading, empty and error states with retry, pull to refresh, infinite scroll, phone and tablet layouts
  (checked down to 320 px wide), Marathi UI and dates.
- Reads only published news with the website's queries, so no new indexes or rules were needed.
- Firebase settings come from `--dart-define-from-file`, so nothing project-specific is committed.

Bugs the tests caught and that are fixed: services were not reachable from pushed screens (every article tap
would have crashed), retry buttons threw instead of retrying, the app bar overflowed on small phones, and the
lead story filled a whole tablet screen.

## Milestone 8 — Push notifications ✅

Acceptance: *a test notification opens the correct news article* — met in app tests (tap, cold start from a
notification, and the in-app banner all open the right article). **A real end-to-end delivery through Firebase Cloud
Messaging still needs testing** with a real Firebase project and phone; the development sandbox cannot reach FCM.

- **`sendNotification` Cloud Function** (EDITOR, SUPER_ADMIN, SOCIAL_MEDIA_MANAGER; active accounts only):
  published articles only; title and message limits; audience *all readers* (`news_all`) or one district
  (`district_<id>`). The job document ID is derived from article + audience, so double clicks or two editors
  sending at once notify readers **once** (tested with simultaneous sends). Failures are recorded and can be
  retried; every send/failure is in the audit log, with the sender's name kept on the job.
- **Admin Panel → Notifications:** pick a published article (or use "Send a push notification" from the
  article page), edit the prefilled title/message, choose the audience, see a phone-style preview and whether it
  was already sent, confirm, and review the history (status, attempts, errors, retry).
- **Android app:** asks for notification permission once (Android 13+), subscribes to all news by default,
  **Notification settings** to turn that off and follow districts (re-applied each launch, survives offline),
  tapping a notification opens its article (also when it launched the app), a banner with "पाहा" for
  notifications that arrive while the app is open, a high-importance "बातम्या" channel.

## Milestone 9 — WhatsApp integration ✅

Acceptance: *an authorised editor can send a test bulletin to an eligible recipient* — met against a local mock of
Meta's Cloud API (browser test: add subscribers, preview, send, partial failure, retry, signed delivery receipts,
STOP). **Not yet sent through the real WhatsApp API**: that needs the account's token, phone number ID and an
approved template (docs/SETUP.md §8).

- Provider: Meta WhatsApp Cloud API behind a `WhatsAppProvider` interface; credentials in Secret Manager.
- Approved template `news_bulletin` (Marathi) matching the spec's message: label, headline, summary, link,
  STOP instructions; parameters are cleaned to WhatsApp's rules.
- Subscribers (personal data; readable by distribution staff only, written only by functions): Indian numbers
  normalised to +91, one record per number, groups = all + districts, **consent source and recorder stored for
  every addition**, bulk import (500 per batch, duplicates merged), opted-out numbers never re-added by imports.
- Opt-out: STOP/बंद replies via the webhook, or Admin; opt-in: START replies (recorded as consent) or Admin with
  new consent.
- Sending: preview shows the exact message and recipient count; the send must confirm that count (refused if
  the list changed); once per article and group; up to 1,000 recipients per run, 5 parallel requests; per-recipient
  records; PARTIAL/FAILED jobs retry only the failed recipients; a crashed send can be retried after 15 minutes.
- Webhook: Meta verification handshake, `X-Hub-Signature-256` check, delivered/read/failed receipts that only move
  forward and keep the job's counts in step.
- Admin → WhatsApp: Send bulletin, History (accepted/delivered/read/failed, failed numbers with errors, retry),
  Subscribers (counts, add, import, find, opt out/re-subscribe). "Send on WhatsApp" link on published articles.

## Milestone 10 — Ads and reports ✅

Acceptance: *admin can manage banners and export basic reports* — met, checked in a browser as Owner and Super Admin
against the emulators (ads created, shown on the website, impressions and clicks counted; reports and CSV export).

- **Advertisements** (Owner, Super Admin): title, banner upload (≤ 2 MB), https link, placement (website home top,
  between sections, article top/bottom, side column; Android app banner), start/end, on/off; status (Running,
  Scheduled, Ended, Off), impressions, clicks and CTR. Rules validate every field, only allow https links, and
  keep the counters server-only.
- **On the website and app**: banners labelled "जाहिरात", `rel="sponsored"`, random rotation when several share a
  placement, expired/scheduled ads never shown. Impressions count once per page view when at least half the banner is
  visible (app: once per session); clicks count each tap. The `recordAdEvent` function only counts running ads and
  keeps per-day totals. Counts are indicative, not audited.
- **Reports** (Super Admin, Owner, Editor): today / 7 / 30 / 90 days or custom dates (India time); published,
  submitted, approved, returned, rejected, video news and views; daily chart (with table view); by reporter, category
  and district; most viewed; CSV downloads that open correctly in Excel with Marathi text (UTF-8 BOM) and are
  protected against formula injection. Built on the server by `getReport`, so the Owner gets complete numbers
  without access to drafts.
- **Settings** (Super Admin; others read-only): channel name, tagline, phone, WhatsApp, email, address, social links
  — used by the website footer and Contact page and the app's Contact screen.

## Milestone 11 — Security and testing ✅

Acceptance: *every role reviewed, backups with a tested restore procedure, public endpoints protected* — met.
Every role signed in against the emulators and opened every page in its menu with no permission errors.

- **Role matrix**: [SECURITY.md](SECURITY.md) lists who may do what; a rules test runs 11 actions for each of the
  five roles plus a signed-in user without a role (48 rules tests in total).
- **Suspension is immediate for reads too**: suspended staff can no longer read drafts, staff records, audit logs
  or distribution data, and an open panel page switches to an "Account suspended" notice without a reload.
- **Public counters**: `recordView` and `recordAdEvent` are rate-limited per IP address.
- **Slugs**: only URL-safe slugs are accepted (rules), and publishing replaces a malformed one.
- **Web headers**: nosniff, referrer policy, permissions policy, HSTS; panels cannot be framed by other sites.
- **WhatsApp webhook**: verify token compared in constant time (signatures already were).
- **Dependencies**: no known vulnerabilities in production dependencies (`npm audit --omit=dev`).
- **Backups**: [OPERATIONS.md](OPERATIONS.md) — daily and weekly managed Firestore backups, point-in-time recovery,
  a restore drill into a separate database, and `npm run verify-restore -w functions` to compare document counts
  (tested against the emulator). Also Auth export, Storage soft delete, alerts, budgets, App Check rollout,
  Auth console settings, and cost/performance notes.

Not testable from the development sandbox: the restore drill on a real project (needs the production project and
`gcloud`), App Check with real keys.

## Milestone 12 — Production launch ✅ (ready)

Everything that can be prepared in the repository is done; the remaining steps need the production Firebase
project, domains, Play Console and Meta accounts, and are listed in order in [LAUNCH.md](LAUNCH.md).

- **Go-live guide** ([LAUNCH.md](LAUNCH.md)): management decisions, production project, GitHub environments and
  deploy service account, backend deploy, first accounts and data, website hosting (Vercel or App Hosting),
  verification, backups, Android release, WhatsApp, go-live checklist and rollback.
- **Deploy backend** workflow (manual, approval-gated for production): runs typecheck and all tests, deploys rules,
  indexes and functions with per-project parameters, then smoke-tests the functions.
- **Smoke test** (`npm run smoke`): 13 read-only checks of the live sites and functions (pages, security headers,
  sitemap on the right domain, policies not placeholders, 404s, function endpoints). Passed against production
  builds and the emulators; confirmed it fails when the sitemap points at another domain.
- **Android**: release signing from `key.properties`, a **Release Android** workflow producing a signed App
  Bundle (refuses emulator or non-https configs), CI now builds the release bundle on every push, release builds
  ignore emulator settings, launcher icon from the official logo, Play icon and feature graphic, and listing
  text with Data safety and content form answers (`apps/android/store/`).
- **Policies**: privacy policy (website and app) and editorial policy drafted from what the platform actually
  does, for management approval.

Pending, outside the repository: production project and deploys, domains, Play Console review, WhatsApp template
approval, physical-device tests, real-device push and live WhatsApp tests, the first production restore drill.
