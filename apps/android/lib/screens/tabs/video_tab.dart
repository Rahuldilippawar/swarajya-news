import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/news_repository.dart';
import '../../services.dart';
import '../../widgets/news_card.dart';
import '../../widgets/paged_news_list.dart';
import '../../widgets/states.dart';

/// Video news and YouTube Shorts.
class VideoTab extends StatelessWidget {
  const VideoTab({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(tabs: [Tab(text: 'व्हिडिओ बातम्या'), Tab(text: 'शॉर्ट व्हिडिओ')]),
          Expanded(
            child: TabBarView(
              children: [
                PagedNewsList(filter: const VideoNews(), where: (a) => !a.isShort, emptyMessage: 'अद्याप व्हिडिओ बातम्या नाहीत.'),
                const ShortsGrid(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Grid of vertical Short tiles from the most recent video news.
class ShortsGrid extends StatefulWidget {
  const ShortsGrid({super.key});

  @override
  State<ShortsGrid> createState() => _ShortsGridState();
}

class _ShortsGridState extends State<ShortsGrid> {
  Future<List<Article>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<List<Article>> _load() async =>
      (await AppServices.of(context).repository.feed(const VideoNews(), limit: 60)).where((a) => a.isShort).toList();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Article>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) return const LoadingView();
        if (snap.hasError) {
          final e = snap.error;
          return ErrorView(
            message: e is NewsLoadException ? e.message : const NewsLoadException().message,
            onRetry: () => setState(() { _future = _load(); }),
          );
        }
        final items = snap.data!;
        if (items.isEmpty) return const EmptyView(icon: Icons.smart_display_outlined, message: 'अद्याप शॉर्ट व्हिडिओ नाहीत.');
        return RefreshIndicator(
          onRefresh: () async {
            final f = _load();
            setState(() { _future = f; });
            await f.catchError((Object _) => <Article>[]);
          },
          child: GridView.builder(
            padding: const EdgeInsets.all(8),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 200, childAspectRatio: 9 / 16, crossAxisSpacing: 4, mainAxisSpacing: 4),
            itemCount: items.length,
            itemBuilder: (_, i) => ShortCard(article: items[i]),
          ),
        );
      },
    );
  }
}
