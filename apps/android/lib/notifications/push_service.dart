import 'package:firebase_messaging/firebase_messaging.dart';

/// A notification that arrived while the app was open.
class PushAlert {
  const PushAlert({required this.title, required this.body, required this.newsId});
  final String title;
  final String body;
  final String? newsId;
}

/// Push notifications, behind an interface so the app can be tested without Firebase.
abstract class PushService {
  /// [onOpen] runs when the reader taps a notification (including the one that launched the app);
  /// [onForeground] when one arrives while the app is open (Android does not show those itself).
  Future<void> start({required void Function(String newsId) onOpen, required void Function(PushAlert alert) onForeground});

  /// Asks for permission to show notifications (Android 13+). Returns whether they are allowed.
  Future<bool> requestPermission();

  Future<void> subscribe(String topic);

  Future<void> unsubscribe(String topic);
}

class FirebasePushService implements PushService {
  FirebasePushService([FirebaseMessaging? messaging]) : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  static String? _newsId(RemoteMessage m) => m.data['newsId'] as String?;

  @override
  Future<void> start({required void Function(String newsId) onOpen, required void Function(PushAlert alert) onForeground}) async {
    FirebaseMessaging.onMessageOpenedApp.listen((m) {
      final id = _newsId(m);
      if (id != null) onOpen(id);
    });
    FirebaseMessaging.onMessage.listen((m) {
      final n = m.notification;
      if (n == null) return;
      onForeground(PushAlert(title: n.title ?? '', body: n.body ?? '', newsId: _newsId(m)));
    });
    // The app was launched by tapping a notification.
    final initial = await _messaging.getInitialMessage();
    final id = initial == null ? null : _newsId(initial);
    if (id != null) onOpen(id);
  }

  @override
  Future<bool> requestPermission() async {
    final settings = await _messaging.requestPermission();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<void> subscribe(String topic) => _messaging.subscribeToTopic(topic);

  @override
  Future<void> unsubscribe(String topic) => _messaging.unsubscribeFromTopic(topic);
}
