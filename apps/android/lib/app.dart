import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'bootstrap.dart';
import 'notifications/push_service.dart';
import 'screens/article_screen.dart';
import 'screens/home_shell.dart';
import 'screens/splash_screen.dart';
import 'services.dart';
import 'theme.dart';

class SwarajyaNewsApp extends StatefulWidget {
  const SwarajyaNewsApp({super.key, required this.bootstrap});

  /// Connects to Firebase and loads saved news; tests pass in fakes.
  final Future<AppDependencies> Function() bootstrap;

  @override
  State<SwarajyaNewsApp> createState() => _SwarajyaNewsAppState();
}

class _SwarajyaNewsAppState extends State<SwarajyaNewsApp> {
  final _navigator = GlobalKey<NavigatorState>();
  final _messenger = GlobalKey<ScaffoldMessengerState>();
  AppDependencies? _deps;

  void _onReady(AppDependencies deps) {
    setState(() => _deps = deps);
    // Start listening once the home screen is on the navigator, so a notification
    // that launched the app opens its article on top of home.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await deps.push.start(onOpen: _openArticle, onForeground: _showAlert);
      await deps.notificationPrefs.onAppStarted();
    });
  }

  Future<void> _openArticle(String newsId) async {
    final deps = _deps;
    if (deps == null) return;
    try {
      final article = await deps.repository.article(newsId);
      if (article == null) {
        _messenger.currentState?.showSnackBar(const SnackBar(content: Text('ही बातमी आता उपलब्ध नाही.')));
        return;
      }
      await _navigator.currentState?.push(MaterialPageRoute<void>(builder: (_) => ArticleScreen(article: article)));
    } catch (_) {
      _messenger.currentState?.showSnackBar(const SnackBar(content: Text('बातमी उघडता आली नाही. इंटरनेट तपासा.')));
    }
  }

  void _showAlert(PushAlert alert) {
    final id = alert.newsId;
    _messenger.currentState?.showSnackBar(SnackBar(
      duration: const Duration(seconds: 8),
      content: Text(alert.title, maxLines: 2, overflow: TextOverflow.ellipsis),
      action: id == null ? null : SnackBarAction(label: 'पाहा', onPressed: () => _openArticle(id)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swarajya News',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigator,
      scaffoldMessengerKey: _messenger,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      locale: const Locale('mr'),
      supportedLocales: const [Locale('mr'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      // Services sit above the Navigator so every pushed screen (article, search…) can reach them.
      builder: (context, child) {
        final deps = _deps;
        return deps == null
            ? child!
            : AppServices(
                repository: deps.repository,
                saved: deps.saved,
                notificationPrefs: deps.notificationPrefs,
                adTracker: deps.adTracker,
                child: child!,
              );
      },
      home: SplashScreen<AppDependencies>(
        initialise: widget.bootstrap,
        onReady: _onReady,
        builder: (_) => const HomeShell(),
      ),
    );
  }
}
