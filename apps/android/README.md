# Swarajya News — Android app

Flutter app for reading and watching published Swarajya News stories. No login is needed.

## Features

- **Home:** breaking news strip, featured story, latest news, top categories.
- **Video:** video news and YouTube Shorts (vertical grid).
- **Browse:** categories, and districts → talukas → villages.
- **Saved:** stories saved on the phone (full text, works offline; swipe to remove).
- **Article:** text, photo or click-to-play YouTube video (YouTube's own embedded player, plus "open in YouTube"),
  event time, tags, related news, WhatsApp share and system share.
- **Search** by words with category and district filters.
- Latest and breaking feeds, About, Contact and Privacy Policy in the menu.
- Loading, empty and error states with retry everywhere; pull to refresh; infinite scroll;
  1 column on phones, 2–3 on tablets; Marathi interface and dates.

Push notifications arrive in Milestone 8.

## Configure

The app reads Firebase settings at build time, so nothing project-specific is committed:

```bash
cp config/example.json config/dev.json   # fill in from Firebase console → Project settings → Android app
```

| Key | Meaning |
| --- | --- |
| `FIREBASE_API_KEY`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_STORAGE_BUCKET` | From the Android app registered in Firebase |
| `SITE_URL` | Public website, used in share links (`<SITE_URL>/news/<slug>`). Leave empty to share without a link. |
| `FIRESTORE_EMULATOR_HOST` | Optional: `10.0.2.2` to use the local Firestore emulator from the Android emulator |

`config/*.json` is git-ignored except the example.

## Run, test, build

```bash
flutter pub get
flutter run --dart-define-from-file=config/dev.json
flutter analyze
flutter test
flutter build appbundle --release --dart-define-from-file=config/prod.json   # Play Store
```

Tests use an in-memory repository (`test/fakes.dart`), so they need neither Firebase nor a network.

## Architecture

- `lib/data/` — `NewsRepository` interface, `FirestoreNewsRepository` (same queries and indexes as the
  website; reads only published news), models, saved news (`shared_preferences`), YouTube URL parsing
  (a port of `shared/src/youtube.ts`, with mirrored tests).
- `lib/screens/` — tabs, article, video player, search, place, info screens.
- `lib/widgets/` — cards, images with placeholders, paged list, loading/error/empty states.
- `lib/bootstrap.dart` — Firebase start-up behind the splash screen (with retry on failure).

## Before the first Play Store release

- Confirm the application ID in `android/app/build.gradle.kts` (currently `com.swarajyanews.swarajya_news`) —
  it can never change after publishing.
- Set up release signing and replace the launcher icon with the official logo.
- Test on physical devices (the CI builds a debug APK; it has not yet been run on a real phone).
