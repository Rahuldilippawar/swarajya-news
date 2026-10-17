# Milestones

| # | Milestone | Status |
| - | --- | --- |
| 1 | Project setup | ✅ Done |
| 2 | Authentication and roles | ✅ Done |
| 3 | Firestore and news management | 🟡 Foundations in place |
| 4 | Reporter workflow | ⬜ |
| 5 | Editorial approval | ⬜ |
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

## Already in place for later milestones

- **M3:** Firestore types, collection names, Security Rules for every collection, composite indexes, YouTube URL validation, slug generation, news form validation, status transition rules (all unit-tested).

## Next: Milestone 3 — Firestore and news management

- Category and location management (state → district → taluka → village), including a location picker for reporter assignment.
- News create/edit form in the Admin Panel with YouTube preview, drafts and slug generation.
- Callable function for status transitions (submit, review, approve, publish, archive) using `shared/src/newsStatus.ts`.
- Dashboard counts.
