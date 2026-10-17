import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

/// Articles the reader saved, stored on the device (works offline, no login).
class SavedNews extends ChangeNotifier {
  SavedNews._(this._prefs, this._items);

  static const _key = 'saved_articles_v1';
  static const maxItems = 200;

  final SharedPreferences _prefs;
  final List<Article> _items;

  static Future<SavedNews> load() async {
    final prefs = await SharedPreferences.getInstance();
    final items = <Article>[];
    try {
      final raw = prefs.getString(_key);
      if (raw != null) {
        for (final entry in jsonDecode(raw) as List) {
          final map = Map<String, dynamic>.from(entry as Map);
          items.add(Article.fromMap(map['id'] as String, map));
        }
      }
    } catch (_) {
      // Corrupt data must never stop the app from starting; start with an empty list.
    }
    return SavedNews._(prefs, items);
  }

  List<Article> get items => List.unmodifiable(_items);

  bool contains(String id) => _items.any((a) => a.id == id);

  Future<void> toggle(Article article) async {
    if (contains(article.id)) {
      _items.removeWhere((a) => a.id == article.id);
    } else {
      _items.insert(0, article);
      if (_items.length > maxItems) _items.removeRange(maxItems, _items.length);
    }
    notifyListeners();
    await _prefs.setString(_key, jsonEncode([for (final a in _items) {'id': a.id, ...a.toJson()}]));
  }
}
