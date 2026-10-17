import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/news_repository.dart';
import '../../services.dart';
import '../../widgets/news_card.dart';
import '../../widgets/states.dart';
import '../feed_screen.dart';

class _HomeData {
  _HomeData(this.breaking, this.featured, this.latest, this.categories, this.districts, this.byCategory);

  final List<Article> breaking;
  final List<Article> featured;
  final List<Article> latest;
  final List<Category> categories;
  final Map<String, Place> districts;
  final List<(Category, List<Article>)> byCategory;
}

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  Future<_HomeData>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_HomeData> _load() async {
    final repo = AppServices.of(context).repository;
    final results = await Future.wait([
      repo.feed(const BreakingNews(), limit: 5),
      repo.feed(const LatestNews(), limit: 15),
      repo.categories(),
      repo.districts(),
      repo.feed(const FeaturedNews(), limit: 1),
    ]);
    final categories = results[2] as List<Category>;
    final featured = results[4] as List<Article>;
    final top = categories.take(4).toList();
    final perCategory = await Future.wait(top.map((c) => repo.feed(CategoryNews(c), limit: 3)));
    return _HomeData(
      results[0] as List<Article>,
      featured,
      results[1] as List<Article>,
      categories,
      {for (final d in results[3] as List<Place>) d.id: d},
      [for (var i = 0; i < top.length; i++) (top[i], perCategory[i])],
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() { _future = future; });
    await future.catchError((Object _) => _HomeData(const [], const [], const [], const [], const {}, const []));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_HomeData>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) return const LoadingView();
        if (snap.hasError) {
          final e = snap.error;
          return ErrorView(message: e is NewsLoadException ? e.message : const NewsLoadException().message, onRetry: _refresh);
        }
        final data = snap.data!;
        final hero = data.featured.isNotEmpty ? data.featured.first : (data.latest.isNotEmpty ? data.latest.first : null);
        if (hero == null) {
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(children: const [EmptyView(icon: Icons.newspaper, message: 'अद्याप बातम्या प्रकाशित झालेल्या नाहीत.')]),
          );
        }
        String? meta(Article a) => data.districts[a.districtId]?.name;
        final latest = data.latest.where((a) => a.id != hero.id).take(8).toList();

        return RefreshIndicator(
          onRefresh: _refresh,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final columns = columnsFor(constraints.maxWidth);
              Widget grid(List<Article> items) => _Grid(columns: columns, children: [for (final a in items) NewsCard(article: a, meta: meta(a))]);
              return ListView(
                padding: const EdgeInsets.all(8),
                children: [
                  if (data.breaking.isNotEmpty) _BreakingStrip(items: data.breaking),
                  HeroNewsCard(article: hero, meta: meta(hero)),
                  _SectionHeader(
                    title: 'ताज्या बातम्या',
                    onMore: () => _push(context, const FeedScreen(title: 'ताज्या बातम्या', filter: LatestNews())),
                  ),
                  grid(latest),
                  for (final (category, items) in data.byCategory)
                    if (items.isNotEmpty) ...[
                      _SectionHeader(
                        title: category.name,
                        onMore: () => _push(context, FeedScreen(title: category.name, filter: CategoryNews(category))),
                      ),
                      grid(items),
                    ],
                ],
              );
            },
          ),
        );
      },
    );
  }
}

void _push(BuildContext context, Widget screen) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

class _Grid extends StatelessWidget {
  const _Grid({required this.columns, required this.children});
  final int columns;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (columns == 1) return Column(children: children);
    return Column(
      children: [
        for (var i = 0; i < children.length; i += columns)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var c = 0; c < columns; c++) Expanded(child: i + c < children.length ? children[i + c] : const SizedBox.shrink()),
            ],
          ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.onMore});
  final String title;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 16, 0, 4),
      child: Row(
        children: [
          Container(width: 4, height: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold))),
          TextButton(onPressed: onMore, child: const Text('सर्व पाहा')),
        ],
      ),
    );
  }
}

class _BreakingStrip extends StatelessWidget {
  const _BreakingStrip({required this.items});
  final List<Article> items;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: SizedBox(
        height: 48,
        child: Row(
          children: [
            Container(
              margin: const EdgeInsets.all(8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: scheme.primary, borderRadius: BorderRadius.circular(4)),
              child: Text('ब्रेकिंग', style: TextStyle(color: scheme.onPrimary, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, __) => const VerticalDivider(indent: 12, endIndent: 12),
                itemBuilder: (context, i) => TextButton(
                  onPressed: () => openArticle(context, items[i]),
                  child: Text(items[i].headline, style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
