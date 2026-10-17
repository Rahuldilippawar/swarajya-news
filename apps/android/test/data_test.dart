import 'package:flutter_test/flutter_test.dart';
import 'package:swarajya_news/data/models.dart';
import 'package:swarajya_news/data/youtube.dart';
import 'package:swarajya_news/screens/article_screen.dart';

import 'fakes.dart';

void main() {
  group('parseYouTubeUrl (mirrors shared/test/youtube.test.ts)', () {
    const id = 'dQw4w9WgXcQ';
    for (final url in [
      'https://www.youtube.com/watch?v=$id',
      'https://youtube.com/watch?v=$id&t=42s',
      'https://m.youtube.com/watch?feature=share&v=$id',
      'https://youtu.be/$id',
      'https://youtu.be/$id?si=abc',
      'youtu.be/$id',
      'https://www.youtube.com/embed/$id',
      'https://www.youtube-nocookie.com/embed/$id',
      'https://www.youtube.com/live/$id',
      '  https://www.youtube.com/watch?v=$id  ',
    ]) {
      test('accepts $url', () {
        final link = parseYouTubeUrl(url);
        expect(link?.videoId, id);
        expect(link?.isShort, isFalse);
      });
    }

    test('flags Shorts', () => expect(parseYouTubeUrl('https://youtube.com/shorts/$id')?.isShort, isTrue));

    for (final url in [
      '',
      'not a url',
      'https://youtube.com.evil.example/watch?v=$id',
      'https://evil.example/watch?v=$id',
      'javascript:alert(1)//youtube.com/watch?v=$id',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/@swarajyanews2025',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/watch?v=${id}xx',
    ]) {
      test('rejects "$url"', () => expect(parseYouTubeUrl(url), isNull));
    }
  });

  test('saved-article JSON round-trips', () {
    final a = article(7, youtubeUrl: 'https://youtube.com/shorts/aaaaaaaaaaa', tags: ['पाऊस']);
    final copy = Article.fromMap(a.id, a.toJson());
    expect(copy.toJson(), a.toJson());
    expect(copy.isShort, isTrue);
    expect(copy.imageUrl, 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg');
  });

  test('splits paragraphs like the website', () {
    expect(article(1).paragraphs, ['पहिला परिच्छेद 1.', 'दुसरा परिच्छेद.']);
  });

  test('share text has headline and summary (link only when the site URL is configured)', () {
    final text = shareText(article(1));
    expect(text, startsWith('जिल्ह्यातील बातमी क्रमांक 1\n\nबातमी 1 चा सारांश'));
  });
}
