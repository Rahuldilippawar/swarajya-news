# Swarajya News — स्वराज्य न्यूज

Independent digital news platform for the Swarajya News channel: a public
website, an Android app, an Admin Panel and a Reporter Panel, all on one
Firebase backend. Recorded video news is served from the official
[Swarajya News YouTube channel](https://www.youtube.com/@swarajyanews2025).
The platform does not depend on GTPL.

```
Reporter submits → Editor reviews → Editor approves → Published on website + app
                                                   → optional push notification
                                                   → optional WhatsApp bulletin
```

## Repository layout

| Path | What it is | Stack |
| --- | --- | --- |
| `apps/website` | Public news website (port 3000) | Next.js, TypeScript |
| `apps/admin` | Admin Panel for admins, editors, owner, social media (port 3001) | Next.js, TypeScript |
| `apps/reporter` | Reporter Panel (port 3002) | Next.js, TypeScript |
| `apps/android` | Android app | Flutter, Dart |
| `functions` | Cloud Functions for privileged operations | Node 22, Firebase Functions v2 |
| `shared` | Domain model used everywhere: roles, editorial workflow, YouTube URL validation, slugs, Firestore types | TypeScript |
| `panel-kit` | Firebase client, auth state, role guard and login form shared by both panels | React |
| `tests/rules` | Firestore Security Rules tests (run against the emulator) | Vitest |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Backend security and indexes | — |
| `docs/` | Architecture, setup and milestone notes | — |

## Prerequisites

- Node.js 22 (`nvm use`)
- Java 11+ (for the Firebase emulators)
- Flutter 3.35+ (for the Android app) and Android Studio / Android SDK for device builds
- A Firebase **development** project (keep production separate; see [docs/SETUP.md](docs/SETUP.md))

## Quick start

```bash
npm install                      # installs every workspace, including firebase-tools

# Web apps — copy the env template and fill in the Firebase web config
cp apps/website/.env.example apps/website/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/reporter/.env.example apps/reporter/.env.local

npm run dev:website              # http://localhost:3000
npm run dev:admin                # http://localhost:3001
npm run dev:reporter             # http://localhost:3002

# Android app (see apps/android/README.md for config/dev.json)
cd apps/android
flutter pub get
flutter run --dart-define-from-file=config/dev.json
```

To work fully offline against the Firebase emulators, set
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` and
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-swarajya` in the panels' `.env.local`, then run
`npx firebase emulators:start --project demo-swarajya`.

## Checks

```bash
npm run lint          # ESLint for the Next.js apps
npm run typecheck     # TypeScript in every workspace
npm test              # unit tests + Cloud Functions tests (starts the Auth/Firestore emulators)
npm run test:rules    # Firestore Security Rules tests (starts the emulator)
npm run build         # production builds of all web apps + functions bundle

cd apps/android && flutter analyze && flutter test
```

CI runs all of the above on every push and pull request (`.github/workflows/ci.yml`).

## Roles and security

Roles (`SUPER_ADMIN`, `OWNER`, `EDITOR`, `REPORTER`, `SOCIAL_MEDIA_MANAGER`) are
stored as a Firebase Auth **custom claim**. Firestore Security Rules and Cloud
Functions read only that claim, so changing a `users` document cannot grant a
role, and frontend route guards are a convenience, not the protection.

- Only `PUBLISHED` news is publicly readable; drafts are visible only to their reporter and editors.
- No client can change an article's `status`. Every editorial transition goes through Cloud Functions, which enforce the workflow in `shared/src/newsStatus.ts` and write the audit log.
- Secrets (WhatsApp token, service accounts) live in Cloud Secret Manager, never in Firestore, `.env` files in git, or client code.

- Suspended staff lose write access immediately (rules check `users/{uid}.status`), not just when their token expires.

The first Super Admin is created with an Admin-SDK script that only project owners can run; every other account
is created from the Admin Panel. See [docs/SETUP.md](docs/SETUP.md#2-create-the-first-super-admin).

## Status

Milestones 1–10 (setup, roles, news management, reporter workflow, editorial approval, public website, Android app, push notifications, WhatsApp, ads and reports) are complete. See [docs/MILESTONES.md](docs/MILESTONES.md) for what is done and what comes next.
