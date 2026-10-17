# Milestones

| # | Milestone | Status |
| - | --- | --- |
| 1 | Project setup | ✅ Done |
| 2 | Authentication and roles | ✅ Done |
| 3 | Firestore and news management | ✅ Done |
| 4 | Reporter workflow | 🟡 Backend ready |
| 5 | Editorial approval | 🟡 Backend and editor actions ready |
| 6 | Public website | ⬜ |
| 7 | Flutter Android app | ⬜ |
| 8 | Push notifications | ⬜ |
| 9 | WhatsApp integration | ⬜ |
| 10 | Ads and reports | ⬜ |
| 11 | Security and testing | ⬜ |
| 12 | Production launch | ⬜ |

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

## Already in place for later milestones

- **M4 / M5:** the workflow function already supports reporter submission and resubmission, editor review,
  request-changes with remarks, reject, approve, publish, unpublish and archive. Editors can already run every step
  from the news editor. What remains is the Reporter Panel screens and the Pending Approval queue.

## Next: Milestone 4 — Reporter workflow

- Reporter Panel: "My News" list, create/edit drafts (reusing the editor), submit, see editor remarks, correct and resubmit.
- Reporter dashboard counts for their own submissions.
