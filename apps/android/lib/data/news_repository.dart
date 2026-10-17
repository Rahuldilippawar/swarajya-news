import 'models.dart';

/// User-facing failure (network down, Firestore unavailable…). The message is shown as-is.
class NewsLoadException implements Exception {
  const NewsLoadException([this.message = 'बातम्या लोड करता आल्या नाहीत. इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.']);
  final String message;

  @override
  String toString() => message;
}

/// Read-only access to published news. The app never sees drafts: the
/// Firestore implementation only queries published articles, and the
/// Security Rules would refuse anything else.
abstract class NewsRepository {
  /// Newest first; pass the last item's [Article.publishedAt] as [before] for the next page.
  Future<List<Article>> feed(NewsFilter filter, {DateTime? before, int limit = 20});

  Future<Article?> article(String id);

  /// Matches headline, summary and tags among recent articles (Firestore has no full-text search).
  Future<List<Article>> search(String term, {String? categoryId, Place? place});

  Future<List<Category>> categories();

  Future<List<Place>> districts();

  /// Active talukas of a district, or villages of a taluka.
  Future<List<Place>> children(String parentId);
}

/// Shared search matching, used by every repository implementation.
bool matchesSearch(Article a, String term) {
  final words = term.toLowerCase().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final haystack = [a.headline, a.summary, ...a.tags].join(' ').toLowerCase();
  return words.every(haystack.contains);
}
