import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import 'config/app_config.dart';
import 'data/firestore_news_repository.dart';
import 'data/news_repository.dart';
import 'data/saved_news.dart';
import 'notifications/notification_prefs.dart';
import 'notifications/push_service.dart';

class AppDependencies {
  const AppDependencies(this.repository, this.saved, this.push, this.notificationPrefs);
  final NewsRepository repository;
  final SavedNews saved;
  final PushService push;
  final NotificationPrefs notificationPrefs;
}

class AppNotConfiguredException implements Exception {
  @override
  String toString() =>
      'Firebase is not configured. Build with --dart-define-from-file=config/<env>.json (see apps/android/README.md).';
}

/// Start-up work done behind the splash screen.
Future<AppDependencies> bootstrap() async {
  if (!AppConfig.isFirebaseConfigured) throw AppNotConfiguredException();
  if (Firebase.apps.isEmpty) await Firebase.initializeApp(options: AppConfig.firebaseOptions);
  final db = FirebaseFirestore.instance;
  if (AppConfig.firestoreEmulatorHost.isNotEmpty) db.useFirestoreEmulator(AppConfig.firestoreEmulatorHost, 8080);
  final saved = await SavedNews.load();
  final push = FirebasePushService();
  return AppDependencies(FirestoreNewsRepository(db), saved, push, await NotificationPrefs.load(push));
}
