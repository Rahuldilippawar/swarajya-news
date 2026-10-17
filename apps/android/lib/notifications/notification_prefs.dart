import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'push_service.dart';
import 'topics.dart';

/// The reader's notification choices: all news (on by default) and districts to follow.
/// Stored on the device; topic subscriptions are kept in sync with FCM.
class NotificationPrefs extends ChangeNotifier {
  NotificationPrefs._(this._prefs, this._push, this._allNews, this._districts, this._permissionAsked);

  static const _allKey = 'notify_all_news';
  static const _districtsKey = 'notify_districts';
  static const _askedKey = 'notify_permission_asked';

  final SharedPreferences _prefs;
  final PushService _push;
  bool _allNews;
  final Set<String> _districts;
  bool _permissionAsked;

  static Future<NotificationPrefs> load(PushService push) async {
    final prefs = await SharedPreferences.getInstance();
    return NotificationPrefs._(
      prefs,
      push,
      prefs.getBool(_allKey) ?? true,
      (prefs.getStringList(_districtsKey) ?? const []).toSet(),
      prefs.getBool(_askedKey) ?? false,
    );
  }

  bool get allNews => _allNews;
  Set<String> get districts => Set.unmodifiable(_districts);

  /// Asks for notification permission once, then (re)applies the reader's subscriptions.
  /// Subscribing is idempotent, so doing it on every launch also repairs lost subscriptions.
  Future<void> onAppStarted() async {
    if (!_permissionAsked) {
      _permissionAsked = true;
      await _prefs.setBool(_askedKey, true);
      await _push.requestPermission();
    }
    await _safely(() async {
      if (_allNews) await _push.subscribe(allNewsTopic);
      for (final d in _districts) {
        await _push.subscribe(districtTopic(d));
      }
    });
  }

  Future<void> setAllNews(bool on) async {
    _allNews = on;
    notifyListeners();
    await _prefs.setBool(_allKey, on);
    await _safely(() => on ? _push.subscribe(allNewsTopic) : _push.unsubscribe(allNewsTopic));
  }

  Future<void> setDistrict(String districtId, bool on) async {
    if (on) {
      _districts.add(districtId);
    } else {
      _districts.remove(districtId);
    }
    notifyListeners();
    await _prefs.setStringList(_districtsKey, _districts.toList()..sort());
    await _safely(() => on ? _push.subscribe(districtTopic(districtId)) : _push.unsubscribe(districtTopic(districtId)));
  }

  /// Offline or Play Services missing: keep the choice and retry on the next launch.
  Future<void> _safely(Future<void> Function() run) async {
    try {
      await run();
    } catch (e) {
      debugPrint('Notification subscription failed: $e');
    }
  }
}
