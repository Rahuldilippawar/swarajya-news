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

- **Notifications:** permission asked once, all-news alerts on by default, follow districts in
  Menu → सूचना सेटिंग्ज; tapping a notification opens its article; a banner shows alerts that arrive while the
  app is open. Topic names are in `lib/notifications/topics.dart` and must match `shared/src/notifications.ts`.

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

## Release

- Release builds are signed with the upload key from `android/key.properties` (copy
  `android/key.properties.example`; the file and the keystore are git-ignored). Without it they fall back to the
  debug key, which Google Play rejects.
- The **Release Android** GitHub workflow builds the signed bundle from secrets; see
  [docs/LAUNCH.md §8](../../docs/LAUNCH.md#8-android-release-owner--newsroom).
- Release builds ignore `FIRESTORE_EMULATOR_HOST`, so a store build can never point at an emulator.
- Launcher icons are generated from the website logo; Play Store graphics, listing text and the Data safety
  answers are in `store/`.
- Confirm the application ID before the first upload (it can never change), and test on physical phones through
  Play's internal testing track.
