import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 40});

  final double height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset('assets/logo.svg', height: height, semanticsLabel: 'Swarajya News');
  }
}
