# Swarajya News — Android app

Flutter app for browsing and watching published Swarajya News stories.

```bash
flutter pub get
flutter run          # on a connected device or emulator
flutter analyze
flutter test
```

Current state (Milestone 1): splash screen with retry on start-up failure, brand theme, and a
home shell with Home, Video, Categories and Saved tabs showing empty states.
Firebase (`flutterfire configure`), news feeds, YouTube playback and push notifications
arrive in Milestones 7–8.

Before the first Play Store release, confirm the application ID in
`android/app/build.gradle.kts` (currently `com.swarajyanews.swarajya_news`) and set up release signing.
