import 'package:flutter/widgets.dart';

import 'ads/ad_tracker.dart';
import 'data/news_repository.dart';
import 'data/saved_news.dart';
import 'notifications/notification_prefs.dart';

/// Makes the news repository, saved news and notification settings available to every screen.
class AppServices extends InheritedWidget {
  const AppServices({
    super.key,
    required this.repository,
    required this.saved,
    required this.notificationPrefs,
    required this.adTracker,
    required super.child,
  });

  final NewsRepository repository;
  final SavedNews saved;
  final NotificationPrefs notificationPrefs;
  final AdTracker adTracker;

  static AppServices of(BuildContext context) {
    final services = context.dependOnInheritedWidgetOfExactType<AppServices>();
    assert(services != null, 'AppServices missing above this widget');
    return services!;
  }

  @override
  bool updateShouldNotify(AppServices oldWidget) =>
      repository != oldWidget.repository || saved != oldWidget.saved || notificationPrefs != oldWidget.notificationPrefs;
}
