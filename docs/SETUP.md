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

## 3. Starter data

```bash
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json npm run seed -w functions
```

Adds Maharashtra, its 36 districts and 9 news categories. Existing documents are never overwritten, so it is safe
to run again. Talukas and villages are added in Admin → Locations.

## 4. Adding staff

After the first Super Admin exists, all other accounts are created from the
Admin Panel → **Staff & Reporters**. The panel shows a one-time password setup
link; send it to the person privately (anyone holding it can set the
password). Suspending an account takes effect immediately.

## 5. App Check

1. In Google Cloud, create a **reCAPTCHA Enterprise** key for the panel domains.
2. Firebase console → **App Check** → register each web app with that key, and the Android app with Play Integrity.
3. Set `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` in each panel's environment and redeploy.
4. Watch the App Check metrics until all traffic is verified, then set `ENFORCE_APP_CHECK=true` in
   `functions/.env.<project>` and redeploy functions.

Do **not** enforce App Check on Firestore or Storage: the website reads Firestore from its server without an App
Check token, so it would go offline. See [OPERATIONS.md](OPERATIONS.md#6-app-check).

## 6. Android package ID

The app is generated with the application ID `com.swarajyanews.swarajya_news`
(`apps/android/android/app/build.gradle.kts`). **Confirm the final ID before the
first Play Store upload** — it can never change afterwards.

## 7. Push notifications

Firebase Cloud Messaging needs no extra keys: Cloud Functions send with the project's own service account.

1. Firebase console → **Project settings → Cloud Messaging**: make sure the *Firebase Cloud Messaging API (V1)* is enabled.
2. Install the app on a phone (built with that project's `config/<env>.json`) and allow notifications.
3. Publish an article, then Admin Panel → **Notifications** → send to *All readers*. Tap the notification on the
   phone: the app should open that article.
4. Topics: `news_all` for everyone who keeps alerts on; `district_<districtId>` for readers following a district.

## 8. WhatsApp Business API (Meta Cloud API)

Bulletins are sent from the Admin Panel → **WhatsApp** through Meta's WhatsApp Cloud API. (Another provider such
as Gupshup or Interakt can be added by implementing `WhatsAppProvider` in `functions/src/whatsapp/provider.ts`.)

**1. Create the message template** in WhatsApp Manager → Message templates:

- Name: `news_bulletin` (or set `WHATSAPP_TEMPLATE_NAME`), language **Marathi** (`mr`), category **Marketing**
  (Meta classifies news alerts as marketing; utility is only for transactional messages).
- Body — exactly this (it must match `BULLETIN_TEMPLATE_BODY` in `shared/src/whatsapp.ts`):

  ```
  स्वराज्य न्यूज — {{1}}

  {{2}}

  {{3}}

  सविस्तर बातमी वाचा आणि व्हिडिओ पाहा:
  {{4}}

  सूचना बंद करण्यासाठी STOP पाठवा.
  ```

  Sample values for approval: `ब्रेकिंग न्यूज`, a headline, a summary, an article URL.

**2. Configure Cloud Functions**

```bash
npx firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN   # permanent System User token with whatsapp_business_messaging
npx firebase functions:secrets:set WHATSAPP_APP_SECRET     # Meta app → Settings → Basic → App secret
npx firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN   # any long random string
```

In `functions/.env.<projectId>` (not committed; `functions/.env` holds the shared defaults and empty placeholders):

```
PUBLIC_SITE_URL=https://your-website-domain
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID from WhatsApp Manager → API setup>
```

**3. Webhook** (delivery receipts and STOP/START replies): Meta app → WhatsApp → Configuration →
Callback URL `https://asia-south1-<projectId>.cloudfunctions.net/whatsappWebhook`, Verify token = the
`WHATSAPP_VERIFY_TOKEN` value; subscribe to the **messages** field. Every POST is checked against the app secret.

**4. Subscribers and consent.** WhatsApp only allows business-initiated messages to people who agreed to receive
them. Add people in Admin → WhatsApp → Subscribers (one at a time or a pasted list); each addition must say how
they agreed, and this is stored with who recorded it. People can reply **STOP** (or बंद) to opt out and **START**
to opt in; an import never re-subscribes someone who opted out.

**5. Test** with your own number first: add it, publish an article, Admin → WhatsApp → Send bulletin to a district
that only contains your number, and check History for *delivered* / *read*.

Costs: Meta charges per marketing conversation (see Meta's pricing for India). One send is limited to 1,000
recipients per run; larger lists need a queued sender (not built yet).

## 9. Secrets

| Secret | Where it lives |
| --- | --- |
| Firebase web config | `.env.local` in each Next.js app (public identifiers, not secrets) |
| Service-account keys | Never in the repo. Only used locally for provisioning. |
| WhatsApp access token, app secret, webhook verify token | `npx firebase functions:secrets:set NAME` (Cloud Secret Manager) — see section 8 |

## 10. Hosting

The Next.js apps can be deployed to Firebase App Hosting or any Next.js host
(e.g. Vercel). Use separate sites/domains, for example:

- `swarajyanews.in` → website
- `admin.swarajyanews.in` → Admin Panel
- `reporter.swarajyanews.in` → Reporter Panel

Add each panel domain to **Authentication → Settings → Authorized domains**.

Before launch, set up backups, the restore drill, alerts and the Auth settings in [OPERATIONS.md](OPERATIONS.md).
