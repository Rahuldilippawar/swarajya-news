import 'package:flutter/material.dart';

import 'screens/home_shell.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

class SwarajyaNewsApp extends StatelessWidget {
  const SwarajyaNewsApp({super.key, this.initialise});

  /// Start-up work shown behind the splash screen. Firebase initialisation is
  /// added here in Milestone 7; tests pass a completed future.
  final Future<void> Function()? initialise;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swarajya News',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      home: SplashScreen(
        initialise: initialise ?? () => Future<void>.delayed(const Duration(milliseconds: 800)),
        next: const HomeShell(),
      ),
    );
  }
}
