import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'bootstrap.dart';
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
  AppDependencies? _deps;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swarajya News',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      locale: const Locale('mr'),
      supportedLocales: const [Locale('mr'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      // Services sit above the Navigator so every pushed screen (article, search…) can reach them.
      builder: (context, child) {
        final deps = _deps;
        return deps == null ? child! : AppServices(repository: deps.repository, saved: deps.saved, child: child!);
      },
      home: SplashScreen<AppDependencies>(
        initialise: widget.bootstrap,
        onReady: (deps) => setState(() => _deps = deps),
        builder: (_) => const HomeShell(),
      ),
    );
  }
}
