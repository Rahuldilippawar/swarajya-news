import 'package:flutter/material.dart';

class BrandColors {
  static const red = Color(0xFFC8102E);
  static const blue = Color(0xFF1C1FA8);
}

ThemeData buildTheme(Brightness brightness) {
  final scheme = ColorScheme.fromSeed(
    seedColor: BrandColors.red,
    primary: BrandColors.red,
    secondary: BrandColors.blue,
    brightness: brightness,
  );
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    appBarTheme: const AppBarTheme(
      backgroundColor: BrandColors.red,
      foregroundColor: Colors.white,
      centerTitle: false,
    ),
  );
}
