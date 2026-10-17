# Security

How access is enforced, who may do what, and how it is tested.

## Principles

- **Roles live in a Firebase Auth custom claim** (`role`), set only by Cloud Functions or the Admin-SDK script.
  Firestore Security Rules and Cloud Functions read the claim; editing a `users` document cannot grant a role.
- **Suspension is immediate.** An ID token keeps its claim for up to an hour, so every staff read of private data,
  every write, and every callable function also requires `users/{uid}.status == "ACTIVE"`. Open panel pages switch
  to an "Account suspended" notice as soon as the account is suspended.
- **Only published news is public.** No client can change an article's status; every editorial step goes through
  the `transitionNews` function, which enforces `shared/src/newsStatus.ts` and writes the audit log.
- **Frontend checks are a convenience.** Menus and route guards hide what a role cannot use; the rules and functions
  are the protection, and the tests below call them directly.
- **Secrets stay server-side** in Cloud Secret Manager (WhatsApp token, app secret, verify token). Firestore never
  holds passwords or API secrets; the web config in `.env.local` is a public identifier.

## Role matrix

✅ allowed · — not allowed. "Own" means only for the user's own articles.

| Action | Super Admin | Owner | Editor | Reporter | Social Media |
| --- | :-: | :-: | :-: | :-: | :-: |
| Create news | ✅ | — | ✅ | ✅ | — |
| Edit a draft / returned article | ✅ | — | ✅ | own | — |
| Read unpublished news | ✅ | — | ✅ | own | — |
| Review, approve, reject, publish, unpublish, archive | ✅ | — | ✅ | — | — |
| Submit for review | ✅ | — | ✅ | own | — |
| Read private source notes | ✅ | — | ✅ | own | — |
| Categories, locations (write) | ✅ | — | — | — | — |
| Website/app settings (write) | ✅ | — | — | — | — |
| Create/edit staff accounts | ✅ (all roles) | ✅ (Editor, Reporter, Social Media) | — | — | — |
| Read staff profiles | ✅ | ✅ | ✅ | self | self |
| Advertisements and ad statistics | ✅ | ✅ | — | — | — |
| Reports | ✅ | ✅ | ✅ | — | — |
| Push notifications | ✅ | — | ✅ | — | ✅ |
| WhatsApp subscribers and bulletins | ✅ | — | ✅ | — | ✅ |
| Audit log | ✅ | — | — | — | — |

The source of truth is `shared/src/roles.ts` (permissions used by functions and menus) and `firestore.rules`.

## Public endpoints

| Endpoint | Protection |
| --- | --- |
| Firestore (anonymous reads) | Rules allow only published news, active categories/locations/ads and public settings, and require list queries to filter on them. |
| `recordView`, `recordAdEvent` | Count only published articles / running ads; ignore malformed input silently; limited to 60 views and 120 ad events per minute per IP address per instance (extra requests get the same answer but count nothing). Counts are indicative, not audited. |
| `whatsappWebhook` | POST bodies must carry Meta's HMAC-SHA256 signature; the GET verify token is compared in constant time. |
| `health` | Returns a static status only. |

## Web headers

All three Next.js apps send `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
a restrictive `Permissions-Policy` and HSTS, and omit `X-Powered-By`. The panels refuse to be framed by any site
(`frame-ancestors 'none'`) and are `noindex`; the website may be framed only by itself. React escapes all article
text; article JSON-LD is serialised with `<` escaped.

## Input validation

- **Rules** check types, lengths and allowed fields for news, categories, locations, ads and settings; https-only
  links and images; YouTube IDs; URL-safe slugs (letters of any script, digits, single hyphens).
- **Functions** re-validate everything they accept, verify YouTube videos through oEmbed before publishing,
  regenerate a missing, malformed or duplicate slug on publish, and never return internal error details.
- **CSV exports** add a UTF-8 BOM and neutralise cells that start with `=`, `+`, `-`, `@`, tab or CR.

## Tests

| Suite | What it covers | Command |
| --- | --- | --- |
| Rules tests (48) | Every collection, suspended staff, URL-safe slugs, and a **role matrix** that runs 11 actions for each of the 5 roles plus a signed-in user with no role | `npm run test:rules` |
| Functions tests | Every callable against the Auth/Firestore emulators, rate limiter, webhook signature and token checks, restore check | `npm test -w functions` |
| Shared tests | Workflow transitions, permissions, slugs, YouTube parsing, CSV | `npm test -w shared` |
| Android tests | Screens, data, notifications, ads, settings | `cd apps/android && flutter test` |

Before each release, also sign in as each role against the emulators and open every page in its menu (done for
Milestone 11: no permission errors; a suspended editor's open page switched to the suspended notice and recovered
on re-activation).

## Dependencies

`npm audit --omit=dev` (what runs in production) reports no known vulnerabilities; `postcss`, `@grpc/grpc-js` and
`uuid` are pinned through `overrides` in the root `package.json`. The remaining advisories are in development
tools only (firebase-tools, the test runner) and never ship. Re-run the audit before each release.

## Reporting a problem

Report suspected vulnerabilities privately to the Super Admin; do not open a public issue.
