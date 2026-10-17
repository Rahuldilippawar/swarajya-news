import 'package:flutter/material.dart';

import '../data/models.dart';
import '../format.dart';
import '../screens/article_screen.dart';
import 'news_image.dart';

void openArticle(BuildContext context, Article article) {
  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ArticleScreen(article: article)));
}

class _Badges extends StatelessWidget {
  const _Badges(this.article);
  final Article article;

  @override
  Widget build(BuildContext context) {
    if (!article.isBreaking) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(4)),
      child: Text('ब्रेकिंग', style: TextStyle(color: Theme.of(context).colorScheme.onPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

class _VideoMark extends StatelessWidget {
  const _VideoMark();

  @override
  Widget build(BuildContext context) => const Positioned(
        left: 6,
        bottom: 6,
        child: CircleAvatar(radius: 13, backgroundColor: Colors.black54, child: Icon(Icons.play_arrow, size: 18, color: Colors.white)),
      );
}

/// Row card: thumbnail on the left, headline and time on the right.
class NewsCard extends StatelessWidget {
  const NewsCard({super.key, required this.article, this.meta});

  final Article article;
  final String? meta;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => openArticle(context, article),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 128,
              child: Stack(children: [NewsImage(url: article.imageUrl), if (article.hasVideo) const _VideoMark()]),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Badges(article),
                    Text(article.headline, maxLines: 3, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text(
                      [?meta, timeAgo(article.publishedAt)].join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Large card for the lead story: image on top on phones, image beside the text on tablets.
class HeroNewsCard extends StatelessWidget {
  const HeroNewsCard({super.key, required this.article, this.meta});

  final Article article;
  final String? meta;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final image = Stack(children: [NewsImage(url: article.imageUrl), if (article.hasVideo) const _VideoMark()]);
    final text = Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Badges(article),
          Text(article.headline, style: theme.textTheme.titleLarge),
          if (article.summary.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(article.summary, maxLines: 3, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 6),
          Text(
            [?meta, timeAgo(article.publishedAt)].join(' · '),
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => openArticle(context, article),
        child: LayoutBuilder(
          builder: (context, constraints) => constraints.maxWidth >= 700
              ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 3, child: image), Expanded(flex: 2, child: text)])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [image, text]),
        ),
      ),
    );
  }
}

/// Vertical tile for YouTube Shorts.
class ShortCard extends StatelessWidget {
  const ShortCard({super.key, required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => openArticle(context, article),
        child: Stack(
          fit: StackFit.expand,
          children: [
            NewsImage(url: article.imageUrl, aspectRatio: 9 / 16),
            const DecoratedBox(
              decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.center, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black87])),
            ),
            Positioned(
              left: 8,
              right: 8,
              bottom: 8,
              child: Text(article.headline, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Number of columns for article lists: 1 on phones, 2–3 on tablets.
int columnsFor(double width) => width >= 1100 ? 3 : width >= 700 ? 2 : 1;
