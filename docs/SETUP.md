# Setup

## 1. Firebase projects

Create **two** Firebase projects, never share data between them:

| Alias | Suggested project ID | Purpose |
| --- | --- | --- |
| `dev` | `swarajya-news-dev` | Development and testing |
| `prod` | `swarajya-news-prod` | Live website and app |

```bash
cp .firebaserc.example .firebaserc   # then edit the project IDs
npx firebase login
npx firebase use dev
```

In each project:

1. **Authentication** → enable *Email/Password*. Do not enable public sign-up in the panels; staff accounts are created by an admin.
2. **Firestore** → create the database in `asia-south1` (Mumbai).
3. **Storage** → create the default bucket in the same region.
4. **Project settings → Your apps** → add a *Web app* and copy its config into each Next.js app's `.env.local`.
5. Add an *Android app* (package `com.swarajyanews.swarajya_news`, see below) and run `flutterfire configure` inside `apps/android` when Firebase is wired into the app (Milestone 7).
6. **Billing** → set a budget with email alerts. Alerts do not stop spending automatically.

Deploy rules and indexes:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 2. Create the first Super Admin

The first `SUPER_ADMIN` cannot be created from any web page: it uses the
Admin SDK, which needs a service-account key that only project owners can
download.

1. In the Firebase console, **Authentication → Users → Add user** with the admin's email and a strong password.
2. **Project settings → Service accounts → Generate new private key.** Store the file outside the repository (it is in `.gitignore` as `service-account*.json`, but keep it elsewhere anyway) and delete it when you are done.
3. Run:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
  npm run set-role -w functions -- --email admin@example.com --role SUPER_ADMIN --name "Full Name"
```

The script sets the `role` custom claim, mirrors it into `users/{uid}`,
revokes the user's existing sessions so the new role applies on next sign-in,
and writes an `auditLogs` entry. Enable multi-factor authentication for
privileged users once Identity Platform is enabled on the project.

Against the emulators, use instead:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-swarajya \
  npm run set-role -w functions -- --email admin@example.com --role SUPER_ADMIN
```

## 3. Adding staff

After the first Super Admin exists, all other accounts are created from the
Admin Panel → **Staff & Reporters**. The panel shows a one-time password setup
link; send it to the person privately (anyone holding it can set the
password). Suspending an account takes effect immediately.

## 4. App Check

1. In Google Cloud, create a **reCAPTCHA Enterprise** key for the panel domains.
2. Firebase console → **App Check** → register each web app with that key, and the Android app with Play Integrity.
3. Set `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` in each panel's environment and redeploy.
4. Watch the App Check metrics until all traffic is verified, then:
   - set `ENFORCE_APP_CHECK=true` in `functions/.env.<project>` and redeploy functions;
   - enforce App Check for Firestore and Storage in the console.

## 5. Android package ID

The app is generated with the application ID `com.swarajyanews.swarajya_news`
(`apps/android/android/app/build.gradle.kts`). **Confirm the final ID before the
first Play Store upload** — it can never change afterwards.

## 6. Secrets

| Secret | Where it lives |
| --- | --- |
| Firebase web config | `.env.local` in each Next.js app (public identifiers, not secrets) |
| Service-account keys | Never in the repo. Only used locally for provisioning. |
| WhatsApp Business API token, YouTube Data API key | `npx firebase functions:secrets:set NAME` (Cloud Secret Manager) |

## 7. Hosting

The Next.js apps can be deployed to Firebase App Hosting or any Next.js host
(e.g. Vercel). Use separate sites/domains, for example:

- `swarajyanews.in` → website
- `admin.swarajyanews.in` → Admin Panel
- `reporter.swarajyanews.in` → Reporter Panel

Add each panel domain to **Authentication → Settings → Authorized domains**.
