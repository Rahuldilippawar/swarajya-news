import 'package:cloud_firestore/cloud_firestore.dart';

import 'models.dart';
import 'news_repository.dart';

/// Reads published news from Firestore with the same queries (and indexes) as the website.
class FirestoreNewsRepository implements NewsRepository {
  FirestoreNewsRepository(this._db);

  final FirebaseFirestore _db;
  static const _published = 'PUBLISHED';
  static const _searchScan = 300;

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on FirebaseException catch (e) {
      throw NewsLoadException(e.code == 'unavailable' ? const NewsLoadException().message : 'बातम्या लोड करता आल्या नाहीत (${e.code}).');
    }
  }

  static Article _toArticle(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = Map<String, dynamic>.of(doc.data() ?? const {});
    for (final key in const ['publishedAt', 'updatedAt', 'eventAt']) {
      final v = data[key];
      if (v is Timestamp) data[key] = v.toDate();
    }
    return Article.fromMap(doc.id, data);
  }

  Query<Map<String, dynamic>> _publishedQuery(NewsFilter filter) {
    Query<Map<String, dynamic>> q = _db.collection('news').where('status', isEqualTo: _published);
    q = switch (filter) {
      LatestNews() => q,
      BreakingNews() => q.where('isBreaking', isEqualTo: true),
      FeaturedNews() => q.where('isFeatured', isEqualTo: true),
      VideoNews() => q.where('videoProvider', isEqualTo: 'YOUTUBE'),
      CategoryNews(:final category) => q.where('categoryId', isEqualTo: category.id),
      PlaceNews(:final place) => q.where(place.articleField, isEqualTo: place.id),
    };
    return q.orderBy('publishedAt', descending: true);
  }

  @override
  Future<List<Article>> feed(NewsFilter filter, {DateTime? before, int limit = 20}) => _guard(() async {
        var q = _publishedQuery(filter);
        if (before != null) q = q.startAfter([Timestamp.fromDate(before)]);
        final snap = await q.limit(limit).get();
        return snap.docs.map(_toArticle).toList();
      });

  @override
  Future<Article?> article(String id) => _guard(() async {
        // A direct read of an unpublished article is refused by the Security
        // Rules, so treat "permission denied" as "not available".
        try {
          final doc = await _db.collection('news').doc(id).get();
          if (!doc.exists || doc.data()?['status'] != _published) return null;
          return _toArticle(doc);
        } on FirebaseException catch (e) {
          if (e.code == 'permission-denied') return null;
          rethrow;
        }
      });

  @override
  Future<List<Article>> search(String term, {String? categoryId, Place? place}) async {
    final NewsFilter filter = place != null
        ? PlaceNews(place)
        : categoryId != null
            ? CategoryNews(Category(id: categoryId, slug: categoryId, name: ''))
            : const LatestNews();
    final items = await feed(filter, limit: _searchScan);
    return items.where((a) => (categoryId == null || a.categoryId == categoryId) && matchesSearch(a, term)).toList();
  }

  @override
  Future<List<Category>> categories() => _guard(() async {
        final snap = await _db.collection('categories').where('isActive', isEqualTo: true).orderBy('displayOrder').get();
        return snap.docs.map((d) {
          final c = d.data();
          return Category(id: d.id, slug: c['slug'] as String? ?? d.id, name: c['name'] as String? ?? d.id, nameEn: c['nameEn'] as String?);
        }).toList();
      });

  static Place _toPlace(QueryDocumentSnapshot<Map<String, dynamic>> d) {
    final l = d.data();
    return Place(
      id: d.id,
      slug: l['slug'] as String? ?? d.id,
      name: l['name'] as String? ?? d.id,
      type: switch (l['type']) {
        'STATE' => PlaceType.state,
        'DISTRICT' => PlaceType.district,
        'TALUKA' => PlaceType.taluka,
        _ => PlaceType.village,
      },
      parentId: l['parentLocationId'] as String?,
    );
  }

  @override
  Future<List<Place>> districts() => _guard(() async {
        final snap = await _db
            .collection('locations')
            .where('type', isEqualTo: 'DISTRICT')
            .where('isActive', isEqualTo: true)
            .orderBy('name')
            .get();
        return snap.docs.map(_toPlace).toList();
      });

  @override
  Future<List<Place>> children(String parentId) => _guard(() async {
        final snap = await _db
            .collection('locations')
            .where('parentLocationId', isEqualTo: parentId)
            .where('isActive', isEqualTo: true)
            .orderBy('name')
            .get();
        return snap.docs.map(_toPlace).toList();
      });
}
