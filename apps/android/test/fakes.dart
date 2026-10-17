import 'package:flutter/foundation.dart' show FlutterError;
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarajya_news/bootstrap.dart';
import 'package:swarajya_news/data/models.dart';
import 'package:swarajya_news/data/news_repository.dart';
import 'package:swarajya_news/data/saved_news.dart';

final now = DateTime.now();

Article article(
  int i, {
  String? headline,
  String categoryId = 'local',
  String districtId = 'pune',
  String? talukaId,
  bool breaking = false,
  bool featured = false,
  String? youtubeUrl,
  List<String> tags = const [],
}) {
  final id = youtubeUrl == null ? null : RegExp(r'([A-Za-z0-9_-]{11})').firstMatch(youtubeUrl)!.group(1);
  return Article(
    id: 'n$i',
    slug: 'story-$i',
    headline: headline ?? 'जिल्ह्यातील बातमी क्रमांक $i',
    summary: 'बातमी $i चा सारांश',
    content: 'पहिला परिच्छेद $i.\n\nदुसरा परिच्छेद.',
    categoryId: categoryId,
    districtId: districtId,
    talukaId: talukaId,
    reporterName: 'Ramesh Patil',
    youtubeUrl: youtubeUrl,
    youtubeVideoId: id,
    isBreaking: breaking,
    isFeatured: featured,
    tags: tags,
    viewCount: i,
    publishedAt: now.subtract(Duration(minutes: 30 * i)),
  );
}

const pune = Place(id: 'pune', slug: 'pune', name: 'पुणे', type: PlaceType.district);
const haveli = Place(id: 'haveli', slug: 'haveli', name: 'हवेली', type: PlaceType.taluka, parentId: 'pune');
const local = Category(id: 'local', slug: 'local', name: 'स्थानिक');
const crime = Category(id: 'crime', slug: 'crime', name: 'गुन्हे');

/// In-memory repository with the same paging and filtering behaviour as Firestore.
class FakeNewsRepository implements NewsRepository {
  FakeNewsRepository(this.articles, {this.failuresLeft = 0});

  final List<Article> articles;

  /// Number of upcoming calls that should fail, to exercise error and retry states.
  int failuresLeft;
  int feedCalls = 0;

  Future<void> _maybeFail() async {
    await Future<void>.delayed(const Duration(milliseconds: 10));
    if (failuresLeft > 0) {
      failuresLeft--;
      throw const NewsLoadException();
    }
  }

  bool _matches(Article a, NewsFilter f) => switch (f) {
        LatestNews() => true,
        BreakingNews() => a.isBreaking,
        FeaturedNews() => a.isFeatured,
        VideoNews() => a.hasVideo,
        CategoryNews(:final category) => a.categoryId == category.id,
        PlaceNews(:final place) => switch (place.type) {
            PlaceType.district => a.districtId == place.id,
            PlaceType.taluka => a.talukaId == place.id,
            _ => a.villageId == place.id,
          },
      };

  @override
  Future<List<Article>> feed(NewsFilter filter, {DateTime? before, int limit = 20}) async {
    feedCalls++;
    await _maybeFail();
    final sorted = articles.where((a) => _matches(a, filter)).toList()..sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
    return sorted.where((a) => before == null || a.publishedAt.isBefore(before)).take(limit).toList();
  }

  @override
  Future<Article?> article(String id) async => articles.where((a) => a.id == id).firstOrNull;

  @override
  Future<List<Article>> search(String term, {String? categoryId, Place? place}) async {
    final items = await feed(place != null ? PlaceNews(place) : const LatestNews(), limit: 300);
    return items.where((a) => (categoryId == null || a.categoryId == categoryId) && matchesSearch(a, term)).toList();
  }

  @override
  Future<List<Category>> categories() async => const [local, crime];

  @override
  Future<List<Place>> districts() async => const [pune];

  @override
  Future<List<Place>> children(String parentId) async => parentId == 'pune' ? const [haveli] : const [];
}

Future<AppDependencies> Function() fakeBootstrap(FakeNewsRepository repo, {Map<String, Object> prefs = const {}}) {
  SharedPreferences.setMockInitialValues(prefs);
  return () async => AppDependencies(repo, await SavedNews.load());
}

/// Widget tests have no network, so every thumbnail fails to load. The app
/// shows a placeholder for that; this hides the expected log noise (and the
/// late reports from images on screens the test already left).
void ignoreImageLoadErrors() {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception is NetworkImageLoadException) return;
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
}
