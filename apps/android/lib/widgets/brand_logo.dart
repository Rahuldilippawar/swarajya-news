import 'package:flutter/material.dart';

/// The official Swarajya News logo (assets/logo.png, about 1.59:1, transparent corners).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 40});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/logo.png', height: height, semanticLabel: 'Swarajya News', filterQuality: FilterQuality.medium);
  }
}
