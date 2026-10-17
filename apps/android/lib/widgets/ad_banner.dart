import 'dart:math';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../ads/ad_tracker.dart';
import '../data/models.dart';

/// One app banner, labelled as an advertisement. Picks a random running ad,
/// counts one impression per app session and each tap.
class AdBanner extends StatefulWidget {
  const AdBanner({super.key, required this.ads, required this.tracker});

  final List<AppAd> ads;
  final AdTracker tracker;

  /// Ads already counted in this app session.
  static final _seen = <String>{};

  @visibleForTesting
  static void resetSession() => _seen.clear();

  @override
  State<AdBanner> createState() => _AdBannerState();
}

class _AdBannerState extends State<AdBanner> {
  late final AppAd _ad = widget.ads[Random().nextInt(widget.ads.length)];

  @override
  void initState() {
    super.initState();
    if (AdBanner._seen.add(_ad.id)) widget.tracker.record(_ad.id, 'impression');
  }

  Future<void> _open() async {
    widget.tracker.record(_ad.id, 'click');
    try {
      await launchUrl(Uri.parse(_ad.targetUrl), mode: LaunchMode.externalApplication);
    } catch (_) {
      // No browser available; nothing else to do.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Semantics(
        button: true,
        label: 'जाहिरात: ${_ad.title}',
        child: InkWell(
          onTap: _open,
          child: Stack(
            children: [
              AspectRatio(
                aspectRatio: 1080 / 300,
                child: Image.network(_ad.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
              ),
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                  child: const Text('जाहिरात', style: TextStyle(color: Colors.white, fontSize: 11)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
