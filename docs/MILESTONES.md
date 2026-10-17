# Milestones

| # | Milestone | Status |
| - | --- | --- |
| 1 | Project setup | ✅ Done |
| 2 | Authentication and roles | 🟡 Partly started |
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

## Already in place for later milestones

- **M2:** custom-claim roles, login, logout, password reset, client route guards, secure Super Admin provisioning script.
- **M3:** Firestore types, collection names, Security Rules for every collection, composite indexes, YouTube URL validation, slug generation, news form validation, status transition rules (all unit-tested).

## Next: Milestone 2 — Authentication and roles

- Callable function for SUPER_ADMIN/OWNER to create staff accounts and set roles (OWNER cannot create SUPER_ADMIN).
- Reporter IDs and assigned locations.
- Suspend / reactivate accounts (disable in Auth + revoke tokens).
- Admin "Reporters" page.
- Turn on App Check.
