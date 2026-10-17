/// Dart port of `shared/src/youtube.ts`. Keep the two in sync — the test cases
/// in test/youtube_test.dart mirror shared/test/youtube.test.ts.
library;

final _videoId = RegExp(r'^[A-Za-z0-9_-]{11}$');

const _youtubeHosts = {
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
};

const _idPathPrefixes = ['embed', 'shorts', 'live', 'v'];

class YouTubeLink {
  const YouTubeLink(this.videoId, {required this.isShort});

  final String videoId;
  final bool isShort;

  String get watchUrl => 'https://www.youtube.com/watch?v=$videoId';
  String get thumbnailUrl => youTubeThumbnailUrl(videoId);
}

String youTubeThumbnailUrl(String videoId) => 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg';

/// Returns the video in a YouTube URL, or null if it is not a YouTube video link.
YouTubeLink? parseYouTubeUrl(String input) {
  final raw = input.trim();
  if (raw.isEmpty) return null;
  final withScheme = RegExp(r'^[a-z][a-z0-9+.-]*://', caseSensitive: false).hasMatch(raw) ? raw : 'https://$raw';
  final uri = Uri.tryParse(withScheme);
  if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) return null;
  final host = uri.host.toLowerCase();
  if (!_youtubeHosts.contains(host)) return null;

  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  String? id;
  var isShort = false;
  if (host == 'youtu.be') {
    id = segments.isNotEmpty ? segments.first : null;
  } else if (segments.isNotEmpty && segments.first == 'watch') {
    id = uri.queryParameters['v'];
  } else if (segments.length >= 2 && _idPathPrefixes.contains(segments.first)) {
    id = segments[1];
    isShort = segments.first == 'shorts';
  }
  if (id == null || !_videoId.hasMatch(id)) return null;
  return YouTubeLink(id, isShort: isShort);
}
