# Production launch

Step-by-step go-live for Swarajya News. Work top to bottom; each step says who does it. Steps marked 🧪 should be
done on the **dev** project first, so launch day only repeats what already worked.

## 0. Decisions before starting (management)

| Decision | Notes |
| --- | --- |
| Website and panel domains | e.g. `swarajyanews.in`, `admin.swarajyanews.in`, `reporter.swarajyanews.in` |
| Android application ID | Currently `com.swarajyanews.swarajya_news`. **Permanent after the first Play upload.** Change it now if you want e.g. `in.swarajyanews.app` (namespace and `applicationId` in `apps/android/android/app/build.gradle.kts`, the package of `MainActivity.kt`, and the Android app in Firebase). |
| Privacy and editorial policies | Drafts are live at `/privacy-policy` and `/editorial-policy` and describe what the system really does. Approve or edit the wording; update the date. |
| Grievance officer | Name and contact for complaints about content, shown on the Contact page (Admin → Settings → address/e-mail). |
| Legal registration | Digital news publishers in India have obligations under the IT Rules, 2021 (code of ethics, grievance redressal, information to the Ministry of Information & Broadcasting). Confirm with your legal advisor before launch. |
| Play Console account | Organization account recommended (needs a D-U-N-S number); a personal account must first run a 14-day closed test. |
| Web hosting | Vercel or Firebase App Hosting (§5). |

## 1. Production Firebase project (owner) 🧪

Follow [SETUP.md §1](SETUP.md#1-firebase-projects) for a project named e.g. `swarajya-news-prod`, then:

- **Upgrade to Blaze** (pay as you go), required for Cloud Functions. Set a budget with alerts (OPERATIONS.md §4).
- Firestore and Storage in `asia-south1`.
- Authentication: Email/Password on; *user actions → create and delete* off; the settings in OPERATIONS.md §7.
- Register one **Web app** (its config is used by all three sites) and one **Android app** with the final
  application ID. Copy the Android values into `apps/android/config/prod.json` (from `config/example.json`) with
  `SITE_URL` set to the live https website and `FIRESTORE_EMULATOR_HOST` empty.

## 2. GitHub setup (owner)

Settings → Environments → create **dev** and **production**. Give *production* required reviewers (the owner),
so every production deploy waits for approval.

| Environment item | Value |
| --- | --- |
| Secret `FIREBASE_SERVICE_ACCOUNT` | JSON key of a deploy service account (below) |
| Variable `FIREBASE_PROJECT_ID` | e.g. `swarajya-news-prod` |
| Variable `PUBLIC_SITE_URL` | `https://swarajyanews.in` (links in notifications and WhatsApp) |
| Variable `WHATSAPP_PHONE_NUMBER_ID` | From Meta (SETUP.md §8); empty until WhatsApp is ready |
| Variable `ENFORCE_APP_CHECK` | leave unset; `true` later (OPERATIONS.md §6) |
| Secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_PROD_CONFIG_JSON` | production only, see §8 |

**Deploy service account**: Google Cloud console → IAM → Service accounts → create `github-deploy` with roles
*Firebase Admin*, *Cloud Functions Admin*, *Service Account User* and *Secret Manager Viewer*; create a JSON key,
paste it into the secret, then delete the downloaded file. If a deploy reports a missing permission, grant the
role it names. Rotate the key yearly.

## 3. Backend deploy (owner) 🧪

1. Set the WhatsApp secrets once (they can be placeholders until WhatsApp goes live, SETUP.md §8):
   `npx firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project swarajya-news-prod` (and
   `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`).
2. GitHub → Actions → **Deploy backend** → Run workflow → *production*. It runs typecheck and all tests, deploys
   Firestore rules and indexes, Storage rules and Cloud Functions, then smoke-tests the functions.
3. Indexes take a few minutes to build after the first deploy (Firebase console → Firestore → Indexes).

## 4. First accounts and starter data (owner)

1. Create the first Super Admin: [SETUP.md §2](SETUP.md#2-create-the-first-super-admin).
2. Load categories and districts/talukas: [SETUP.md §3](SETUP.md#3-starter-data); then adjust them in the Admin Panel.
3. Admin Panel → **Settings**: channel name, tagline, phone, WhatsApp, e-mail, address (with the grievance
   officer), social links.
4. Admin Panel → **Staff & Reporters**: create the Owner, editors, social media manager and reporters, with their
   assigned districts. Each receives a link to set a password.

## 5. Websites (owner) 🧪

Each Next.js app is deployed as its own site from this repository. Environment variables (all three):
the `NEXT_PUBLIC_FIREBASE_*` values from the production Web app, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`.
Website also: `NEXT_PUBLIC_SITE_URL=https://swarajyanews.in`. Panels also (when App Check is set up):
`NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`.

**Vercel** (simplest for this repository layout): import the repository three times, setting *Root Directory* to
`apps/website`, `apps/admin` and `apps/reporter`; framework Next.js; function region Mumbai (`bom1`). A news site
with ads is commercial use, which needs the Pro plan.

**Firebase App Hosting** (keeps everything in the Google project): create one backend per app with its *root
directory* set the same way and the environment variables above. Try it on the dev project first: if the build
cannot resolve the shared packages (`@swarajya/shared`, `@swarajya/panel-kit`), use Vercel.

Then: add each domain at the host and in your DNS; add the panel domains to Firebase **Authentication → Settings →
Authorized domains**; remove `localhost` there in production.

## 6. Verify (owner) 🧪

```bash
npm run smoke -- --site https://swarajyanews.in --admin https://admin.swarajyanews.in \
  --reporter https://reporter.swarajyanews.in --functions https://asia-south1-swarajya-news-prod.cloudfunctions.net
```

It checks pages, headers, sitemap domain, policy pages (not placeholders), 404s and the public functions. Then do
one real article end to end: reporter submits → editor approves and publishes → it appears on the website and app
→ send a push notification to a test phone.

## 7. Backups and monitoring (owner)

Do [OPERATIONS.md](OPERATIONS.md) §1 (backup schedules, PITR), §2 (one restore drill now), §4 (alerts, uptime
checks) and §3 (Storage soft delete). Record the drill result.

## 8. Android release (owner + newsroom)

1. Create the upload key once, on a trusted computer:
   `keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`.
   Store the file and passwords in the password manager.
2. Add the §2 Android secrets to the *production* environment: `base64 -w0 upload-keystore.jks` →
   `ANDROID_KEYSTORE_BASE64`; the passwords; alias `upload`; the full contents of `config/prod.json` →
   `ANDROID_PROD_CONFIG_JSON`.
3. GitHub → Actions → **Release Android** → Run. It refuses a config with an emulator host or a non-https site URL,
   runs the tests, and produces a signed `.aab` (download it from the run's artifacts).
4. Play Console: create the app, fill in the listing and forms from
   [apps/android/store/listing.md](../apps/android/store/listing.md), upload the `.aab` to **Internal testing**,
   and install it on newsroom phones from the testing link.
5. On the phones: news loads, video plays, notifications arrive and open the right article, sharing links point
   to the live website. Then promote to Closed testing / Production (staged rollout, e.g. 20 %).

For each update: bump `version:` in `apps/android/pubspec.yaml`, run **Release Android**, upload.

## 9. WhatsApp (social media manager + owner)

Follow [SETUP.md §8](SETUP.md#8-whatsapp-business-api-meta-cloud-api): business verification, phone number,
`news_bulletin` template approval (Marathi), real secrets, webhook URL and token, then set
`WHATSAPP_PHONE_NUMBER_ID` in the production environment and run **Deploy backend** again. Import only subscribers
who gave consent, and send a first bulletin to a small test group.

## 10. Go-live day

- [ ] Smoke test passes on the production domains.
- [ ] At least 10–15 published articles, with photos or videos, across several districts and categories.
- [ ] Contact, privacy and editorial pages approved; Settings complete.
- [ ] Every staff member has signed in once; reporters know how to submit, editors how to approve.
- [ ] Backups scheduled; one restore drill done; alerts and budget set.
- [ ] Android app in testing on newsroom phones (Production when Play approves).
- [ ] Search Console: add the website property and submit `https://swarajyanews.in/sitemap.xml`.
- [ ] Announce: YouTube channel description and community post, social media, WhatsApp bulletin (consented list).

## Rollback

| What | How |
| --- | --- |
| Functions or rules | Actions → **Deploy backend** → *Use workflow from* the previous good commit or tag → production. Tag each production deploy (`git tag prod-YYYY-MM-DD`). |
| Websites | Vercel: *Instant Rollback* to the previous deployment. App Hosting: roll out the previous build. |
| Android app | Play Console → halt the staged rollout; fix and upload a new version (a version can never be re-used). |
| Data | OPERATIONS.md §2 (restore into a new database; PITR for the last 7 days). |
| A wrong article | Editor → Unpublish (it returns to Approved and disappears from the website and app within minutes). |
