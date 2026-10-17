import 'package:flutter/widgets.dart';

import 'data/news_repository.dart';
import 'data/saved_news.dart';

/// Makes the news repository and saved-news store available to every screen.
class AppServices extends InheritedWidget {
  const AppServices({super.key, required this.repository, required this.saved, required super.child});

  final NewsRepository repository;
  final SavedNews saved;

  static AppServices of(BuildContext context) {
    final services = context.dependOnInheritedWidgetOfExactType<AppServices>();
    assert(services != null, 'AppServices missing above this widget');
    return services!;
  }

  @override
  bool updateShouldNotify(AppServices oldWidget) => repository != oldWidget.repository || saved != oldWidget.saved;
}
