import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/news_repository.dart';
import '../../services.dart';
import '../../widgets/states.dart';
import '../feed_screen.dart';
import '../place_screen.dart';

/// Categories and districts.
class BrowseTab extends StatefulWidget {
  const BrowseTab({super.key});

  @override
  State<BrowseTab> createState() => _BrowseTabState();
}

class _BrowseTabState extends State<BrowseTab> {
  Future<(List<Category>, List<Place>)>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<(List<Category>, List<Place>)> _load() async {
    final repo = AppServices.of(context).repository;
    final results = await Future.wait([repo.categories(), repo.districts()]);
    return (results[0] as List<Category>, results[1] as List<Place>);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(List<Category>, List<Place>)>(
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
        final (categories, districts) = snap.data!;
        final titleStyle = Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold);
        void push(Widget screen) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            Text('विभाग', style: titleStyle),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in categories)
                  ActionChip(label: Text(c.name), onPressed: () => push(FeedScreen(title: c.name, filter: CategoryNews(c)))),
              ],
            ),
            const SizedBox(height: 24),
            Text('जिल्हानिहाय बातम्या', style: titleStyle),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final d in districts) ActionChip(label: Text(d.name), onPressed: () => push(PlaceScreen(district: d))),
              ],
            ),
          ],
        );
      },
    );
  }
}
