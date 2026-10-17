import 'package:firebase_core/firebase_core.dart';

/// Build-time configuration, passed with `--dart-define-from-file=config/dev.json`
/// (see README). Nothing project-specific is committed to the repository.
class AppConfig {
  static const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const firebaseAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const firebaseSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const firebaseStorageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');

  /// Public website, used for share links (e.g. https://example.com). Empty: share without a link.
  static const siteUrl = String.fromEnvironment('SITE_URL');

  /// Talk to the local Firestore emulator (host as seen from the device, e.g. 10.0.2.2 for the Android emulator).
  static const firestoreEmulatorHost = String.fromEnvironment('FIRESTORE_EMULATOR_HOST');

  static bool get isFirebaseConfigured =>
      firebaseApiKey.isNotEmpty && firebaseAppId.isNotEmpty && firebaseProjectId.isNotEmpty;

  static FirebaseOptions get firebaseOptions => const FirebaseOptions(
        apiKey: firebaseApiKey,
        appId: firebaseAppId,
        projectId: firebaseProjectId,
        messagingSenderId: firebaseSenderId,
        storageBucket: firebaseStorageBucket == '' ? null : firebaseStorageBucket,
      );

  static String? articleUrl(String slug) => siteUrl.isEmpty ? null : '${siteUrl.replaceAll(RegExp(r'/+$'), '')}/news/$slug';
}
