import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../data/models.dart';
import '../data/youtube.dart';
import '../format.dart';
import '../services.dart';
import '../widgets/news_card.dart';
import '../widgets/news_image.dart';
import 'search_screen.dart';
import 'video_player_screen.dart';

/// Text shared on WhatsApp and elsewhere: headline, summary and link (same format as the website).
String shareText(Article a) {
  final url = AppConfig.articleUrl(a.slug) ?? (a.youtubeVideoId != null ? YouTubeLink(a.youtubeVideoId!, isShort: false).watchUrl : null);
  return [a.headline, if (a.summary.isNotEmpty) a.summary, if (url != null) 'सविस्तर बातमी वाचा: $url'].join('\n\n');
}

class ArticleScreen extends StatelessWidget {
  const ArticleScreen({super.key, required this.article});

  final Article article;

  Future<void> _shareOnWhatsApp(BuildContext context) async {
    final text = Uri.encodeComponent(shareText(article));
    final app = Uri.parse('whatsapp://send?text=$text');
    if (await canLaunchUrl(app)) {
      await launchUrl(app);
    } else {
      await launchUrl(Uri.parse('https://wa.me/?text=$text'), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final saved = AppServices.of(context).saved;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        actions: [
          ListenableBuilder(
            listenable: saved,
            builder: (context, _) {
              final isSaved = saved.contains(article.id);
              return IconButton(
                tooltip: isSaved ? 'जतन काढा' : 'जतन करा',
                icon: Icon(isSaved ? Icons.bookmark : Icons.bookmark_border),
                onPressed: () async {
                  await saved.toggle(article);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(SnackBar(content: Text(isSaved ? 'जतन केलेल्यांमधून काढले' : 'बातमी जतन केली')));
                  }
                },
              );
            },
          ),
          IconButton(
            tooltip: 'शेअर करा',
            icon: const Icon(Icons.share),
            onPressed: () => SharePlus.instance.share(ShareParams(text: shareText(article), subject: article.headline)),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (article.isBreaking)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Chip(label: const Text('ब्रेकिंग'), backgroundColor: theme.colorScheme.primaryContainer),
                ),
              Text(article.headline, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              _Meta(article: article),
              const SizedBox(height: 12),
              if (article.youtubeVideoId != null)
                _VideoSection(article: article)
              else if (article.imageUrl != null)
                ClipRRect(borderRadius: BorderRadius.circular(8), child: NewsImage(url: article.imageUrl)),
              const SizedBox(height: 12),
              if (article.summary.isNotEmpty)
                Text(article.summary, style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              const SizedBox(height: 8),
              for (final p in article.paragraphs)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(p, style: theme.textTheme.bodyLarge?.copyWith(height: 1.7)),
                ),
              if (article.eventAt != null)
                Text('घटनेची वेळ: ${formatDateTime(article.eventAt!)}', style: theme.textTheme.bodySmall),
              if (article.tags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final t in article.tags)
                      ActionChip(
                        label: Text('#$t'),
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => SearchScreen(initialQuery: t))),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1FA855)),
                onPressed: () => _shareOnWhatsApp(context),
                icon: const Icon(Icons.chat),
                label: const Text('WhatsApp वर शेअर करा'),
              ),
              const SizedBox(height: 24),
              _Related(article: article),
            ],
          ),
        ),
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant);
    return Wrap(
      spacing: 12,
      runSpacing: 4,
      children: [
        Text(article.reporterName, style: style),
        Text(formatDateTime(article.publishedAt), style: style),
        if (article.viewCount > 0) Text('${formatCount(article.viewCount)} वाचने', style: style),
      ],
    );
  }
}

/// Thumbnail with a play button; the player loads only when tapped (saves mobile data).
class _VideoSection extends StatelessWidget {
  const _VideoSection({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    final id = article.youtubeVideoId!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          button: true,
          label: 'व्हिडिओ पाहा',
          child: InkWell(
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => VideoPlayerScreen(videoId: id, title: article.videoTitle ?? article.headline, isShort: article.isShort),
            )),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  NewsImage(url: youTubeThumbnailUrl(id)),
                  Container(
                    width: 72,
                    height: 50,
                    decoration: BoxDecoration(color: const Color(0xFFE00000), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.play_arrow, color: Colors.white, size: 36),
                  ),
                ],
              ),
            ),
          ),
        ),
        TextButton.icon(
          onPressed: () => openInYouTube(id),
          icon: const Icon(Icons.open_in_new, size: 18),
          label: const Text('व्हिडिओ चालत नसल्यास YouTube वर पाहा'),
        ),
      ],
    );
  }
}

class _Related extends StatefulWidget {
  const _Related({required this.article});
  final Article article;

  @override
  State<_Related> createState() => _RelatedState();
}

class _RelatedState extends State<_Related> {
  Future<List<Article>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppServices.of(context)
        .repository
        .feed(CategoryNews(Category(id: widget.article.categoryId, slug: '', name: '')), limit: 5)
        .then((items) => items.where((a) => a.id != widget.article.id).take(4).toList())
        .catchError((Object _) => <Article>[]);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Article>>(
      future: _future,
      builder: (context, snap) {
        final items = snap.data ?? const [];
        if (items.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('संबंधित बातम्या', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final a in items) NewsCard(article: a),
          ],
        );
      },
    );
  }
}
