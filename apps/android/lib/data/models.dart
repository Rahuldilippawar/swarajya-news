import 'youtube.dart';

/// A published article. Built from Firestore data or from the saved-news JSON.
class Article {
  const Article({
    required this.id,
    required this.slug,
    required this.headline,
    required this.summary,
    required this.content,
    required this.categoryId,
    required this.districtId,
    this.talukaId,
    this.villageId,
    required this.reporterName,
    this.thumbnailUrl,
    this.youtubeUrl,
    this.youtubeVideoId,
    this.videoTitle,
    this.isBreaking = false,
    this.isFeatured = false,
    this.tags = const [],
    this.viewCount = 0,
    required this.publishedAt,
    this.eventAt,
  });

  final String id;
  final String slug;
  final String headline;
  final String summary;
  final String content;
  final String categoryId;
  final String districtId;
  final String? talukaId;
  final String? villageId;
  final String reporterName;
  final String? thumbnailUrl;
  final String? youtubeUrl;
  final String? youtubeVideoId;
  final String? videoTitle;
  final bool isBreaking;
  final bool isFeatured;
  final List<String> tags;
  final int viewCount;
  final DateTime publishedAt;
  final DateTime? eventAt;

  bool get hasVideo => youtubeVideoId != null;

  /// YouTube Short (vertical video).
  bool get isShort => youtubeUrl != null && (parseYouTubeUrl(youtubeUrl!)?.isShort ?? false);

  /// The article's photo, or the YouTube thumbnail when it only has a video.
  String? get imageUrl => thumbnailUrl ?? (youtubeVideoId != null ? youTubeThumbnailUrl(youtubeVideoId!) : null);

  List<String> get paragraphs =>
      content.split(RegExp(r'\n\s*\n|\n')).map((p) => p.trim()).where((p) => p.isNotEmpty).toList();

  /// Builds an article from a map whose dates are already [DateTime]s or ISO strings.
  factory Article.fromMap(String id, Map<String, dynamic> d) {
    String? str(String key) {
      final v = d[key];
      return v is String && v.trim().isNotEmpty ? v : null;
    }

    DateTime? date(String key) {
      final v = d[key];
      if (v is DateTime) return v;
      if (v is String) return DateTime.tryParse(v);
      return null;
    }

    return Article(
      id: id,
      slug: str('slug') ?? id,
      headline: str('headline') ?? '',
      summary: str('summary') ?? '',
      content: str('content') ?? '',
      categoryId: str('categoryId') ?? '',
      districtId: str('districtId') ?? '',
      talukaId: str('talukaId'),
      villageId: str('villageId'),
      reporterName: str('reporterName') ?? '',
      thumbnailUrl: str('thumbnailUrl'),
      youtubeUrl: str('youtubeUrl'),
      youtubeVideoId: str('youtubeVideoId'),
      videoTitle: str('videoTitle'),
      isBreaking: d['isBreaking'] == true,
      isFeatured: d['isFeatured'] == true,
      tags: (d['tags'] as List?)?.whereType<String>().toList() ?? const [],
      viewCount: (d['viewCount'] as num?)?.toInt() ?? 0,
      publishedAt: date('publishedAt') ?? date('updatedAt') ?? DateTime.fromMillisecondsSinceEpoch(0),
      eventAt: date('eventAt'),
    );
  }

  Map<String, dynamic> toJson() => {
        'slug': slug,
        'headline': headline,
        'summary': summary,
        'content': content,
        'categoryId': categoryId,
        'districtId': districtId,
        'talukaId': talukaId,
        'villageId': villageId,
        'reporterName': reporterName,
        'thumbnailUrl': thumbnailUrl,
        'youtubeUrl': youtubeUrl,
        'youtubeVideoId': youtubeVideoId,
        'videoTitle': videoTitle,
        'isBreaking': isBreaking,
        'isFeatured': isFeatured,
        'tags': tags,
        'viewCount': viewCount,
        'publishedAt': publishedAt.toIso8601String(),
        'eventAt': eventAt?.toIso8601String(),
      };
}

class Category {
  const Category({required this.id, required this.slug, required this.name, this.nameEn});

  final String id;
  final String slug;
  final String name;
  final String? nameEn;
}

enum PlaceType { state, district, taluka, village }

class Place {
  const Place({required this.id, required this.slug, required this.name, required this.type, this.parentId});

  final String id;
  final String slug;
  final String name;
  final PlaceType type;
  final String? parentId;

  /// The article field that holds a location of this type.
  String get articleField => switch (type) {
        PlaceType.district => 'districtId',
        PlaceType.taluka => 'talukaId',
        PlaceType.village => 'villageId',
        PlaceType.state => throw StateError('Articles are not filtered by state'),
      };
}

/// Which published articles a feed shows.
sealed class NewsFilter {
  const NewsFilter();
}

class LatestNews extends NewsFilter {
  const LatestNews();
}

class BreakingNews extends NewsFilter {
  const BreakingNews();
}

class FeaturedNews extends NewsFilter {
  const FeaturedNews();
}

class VideoNews extends NewsFilter {
  const VideoNews();
}

class CategoryNews extends NewsFilter {
  const CategoryNews(this.category);
  final Category category;
}

class PlaceNews extends NewsFilter {
  const PlaceNews(this.place);
  final Place place;
}

/// A banner from Admin → Advertisements with placement APP_BANNER.
class AppAd {
  const AppAd({required this.id, required this.title, required this.imageUrl, required this.targetUrl, required this.startAt, required this.endAt});

  final String id;
  final String title;
  final String imageUrl;
  final String targetUrl;
  final DateTime startAt;
  final DateTime endAt;

  bool isRunning(DateTime now) => !now.isBefore(startAt) && now.isBefore(endAt);
}

/// Channel details from Admin → Settings.
class AppSettings {
  const AppSettings({required this.channelName, this.tagline, this.contact = const {}, this.social = const {}});

  final String channelName;
  final String? tagline;

  /// phone, whatsapp, email, address
  final Map<String, String> contact;

  /// youtube, facebook, instagram, whatsapp, x → https URL
  final Map<String, String> social;

  static const defaults = AppSettings(
    channelName: 'स्वराज्य न्यूज',
    social: {'youtube': 'https://www.youtube.com/@swarajyanews2025'},
  );
}
