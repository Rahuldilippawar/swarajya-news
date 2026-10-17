import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../config/app_config.dart';

/// Reports ad impressions and clicks to the recordAdEvent Cloud Function.
abstract class AdTracker {
  Future<void> record(String adId, String type);
}

class HttpAdTracker implements AdTracker {
  HttpAdTracker(this.endpoint);

  /// Null when Firebase is not configured: events are dropped.
  final Uri? endpoint;

  static HttpAdTracker fromConfig() {
    final project = AppConfig.firebaseProjectId;
    if (project.isEmpty) return HttpAdTracker(null);
    final emulator = AppConfig.firestoreEmulatorHost;
    return HttpAdTracker(Uri.parse(emulator.isNotEmpty
        ? 'http://$emulator:5001/$project/asia-south1/recordAdEvent'
        : 'https://asia-south1-$project.cloudfunctions.net/recordAdEvent'));
  }

  @override
  Future<void> record(String adId, String type) async {
    final url = endpoint;
    if (url == null) return;
    try {
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
      final req = await client.postUrl(url);
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode({'adId': adId, 'type': type}));
      await (await req.close()).drain<void>();
      client.close();
    } catch (e) {
      // Counting is best-effort; never disturb the reader.
      debugPrint('Ad event not recorded: $e');
    }
  }
}
