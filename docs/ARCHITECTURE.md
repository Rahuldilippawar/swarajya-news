# Architecture

```
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │   Website    │   │ Android app  │   │ Admin Panel  │   │Reporter Panel│
            │  (Next.js)   │   │  (Flutter)   │   │  (Next.js)   │   │  (Next.js)   │
            └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
     read PUBLISHED│      read PUBLISHED│     read/write via rules│  own drafts via rules│
                   ▼                    ▼                         ▼                      ▼
            ┌─────────────────────────────────────────────────────────────────────────────┐
            │  Cloud Firestore  (protected by firestore.rules, role = custom claim)       │
            └──────────────────────────────────▲──────────────────────────────────────────┘
                                               │ privileged writes (Admin SDK)
            ┌──────────────────────────────────┴──────────────────────────────────────────┐
            │  Cloud Functions: roles, status transitions, audit log, FCM, WhatsApp API     │
            └───────────────┬──────────────────────────────┬─────────────────────────────┘
                            ▼                              ▼
                  Firebase Cloud Messaging       WhatsApp Business API
```

Videos are never stored in Firebase. Articles store the YouTube video ID and
the apps embed the official channel's player.

## Editorial workflow

Defined once in `shared/src/newsStatus.ts` and enforced by Cloud Functions:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED
                        │   │                     │
                        │   └→ REJECTED           └→ APPROVED (unpublish)
                        └→ CHANGES_REQUESTED → SUBMITTED
```

- Reporters may submit and resubmit **their own** articles only.
- Review, approval and publication require the `news.review` / `news.publish` permission (EDITOR, SUPER_ADMIN), so a reporter can never publish their own work.
- Rejecting and requesting changes require remarks.
- Clients can edit article content (subject to rules) but can never write `status`, `approvedBy`, `publishedAt` or `viewCount`.

## Permissions

| Permission | SUPER_ADMIN | OWNER | EDITOR | REPORTER | SOCIAL_MEDIA_MANAGER |
| --- | :-: | :-: | :-: | :-: | :-: |
| users.manage | ✓ | ✓ | | | |
| settings.manage, taxonomy.manage, auditLogs.view | ✓ | | | | |
| ads.manage | ✓ | ✓ | | | |
| reports.view | ✓ | ✓ | ✓ | | |
| news.create | ✓ | | ✓ | ✓ | |
| news.editAny, news.review, news.publish | ✓ | | ✓ | | |
| notifications.send, whatsapp.send | ✓ | | ✓ | | ✓ |

Source of truth: `shared/src/roles.ts`. `firestore.rules` mirrors it; the rules
tests in `tests/rules` check the important cases.

## Cloud Functions

| Function | Who may call it | What it does |
| --- | --- | --- |
| `createStaffUser` | SUPER_ADMIN, OWNER* | Creates the Auth account, role claim, profile, reporter ID; returns a password setup link |
| `setStaffRole` | SUPER_ADMIN, OWNER* | Changes a role and signs the user out everywhere |
| `setStaffStatus` | SUPER_ADMIN, OWNER* | Suspends or reactivates an account |
| `updateStaffProfile` | SUPER_ADMIN, OWNER* | Updates name and assigned locations |
| `health` | anyone | Liveness check |

\* OWNER may only manage EDITOR, REPORTER and SOCIAL_MEDIA_MANAGER accounts (`canManageRole`).
Request/response types live in `shared/src/api.ts` and are used by both the panels and the functions.

## Shared code

- `shared` is plain TypeScript with no SDK dependencies so it can be used by
  the Next.js apps (via `transpilePackages`) and by Cloud Functions (bundled by
  esbuild, because `firebase deploy` uploads only the `functions` directory).
- The Flutter app cannot import TypeScript. When it needs the same rules
  (e.g. YouTube ID parsing), port them to Dart and keep the test cases in sync.
