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
- Clients can edit article content (subject to rules) but can never write `status`, `approvedBy`, `publishedAt`, `videoStatus` or `viewCount`.
- On submit and publish the function checks the YouTube video through oEmbed. Unavailable videos block publishing;
  if YouTube can't be reached the article is marked `UNVERIFIED` rather than guessed. A published article's video
  cannot be changed until it is unpublished.
- Every callable function also requires the caller's profile to be ACTIVE, so a suspended user's unexpired token is useless.

## Public website data flow

The website renders on the server with the Firestore **Lite** client, reading anonymously — it has no special
access. Every public query filters `status == PUBLISHED` (and `isActive == true` for taxonomy), which the rules
require. Results go through Next.js's data cache (`unstable_cache`), so one Firestore read serves every visitor for
the cache period; article pages are additionally cached as static pages and refreshed every five minutes.

## Private data on public documents

A published article is world-readable, so anything confidential must live elsewhere. Reporters' source notes are in
`news/{id}/private/sourceNotes`, readable only by the article's reporter and editors.

## Taxonomy

- Categories use their slug as document ID (`categories/politics`), so URLs are stable and unique.
- Locations: `STATE → DISTRICT → TALUKA → VILLAGE`, linked by `parentLocationId`. The rules check each new
  location's parent has the right type and forbid moving or retyping. Deactivate instead of deleting, so old articles
  keep their location.

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
| `transitionNews` | depends on the step (see workflow) | The only way to change an article's status; validates, checks the YouTube video, records reviews and audit logs |
| `recordView` (HTTP) | anyone | Adds one view to a published article; silently ignores anything else |
| `health` | anyone | Liveness check |

\* OWNER may only manage EDITOR, REPORTER and SOCIAL_MEDIA_MANAGER accounts (`canManageRole`).
Request/response types live in `shared/src/api.ts` and are used by both the panels and the functions.

## Shared code

- `shared` is plain TypeScript with no SDK dependencies so it can be used by
  the Next.js apps (via `transpilePackages`) and by Cloud Functions (bundled by
  esbuild, because `firebase deploy` uploads only the `functions` directory).
- The Flutter app cannot import TypeScript. When it needs the same rules
  (e.g. YouTube ID parsing), port them to Dart and keep the test cases in sync.
