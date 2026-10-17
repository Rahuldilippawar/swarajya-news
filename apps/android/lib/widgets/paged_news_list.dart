import 'package:flutter/material.dart';

import '../data/models.dart';
import '../data/news_repository.dart';
import '../services.dart';
import 'news_card.dart';
import 'states.dart';

/// Infinite-scroll list of one news feed with pull-to-refresh, loading,
/// empty and error states. Lays out in 2–3 columns on tablets.
class PagedNewsList extends StatefulWidget {
  const PagedNewsList({super.key, required this.filter, this.header, this.emptyMessage = 'अद्याप बातम्या प्रकाशित झालेल्या नाहीत.', this.where});

  final NewsFilter filter;
  final Widget? header;
  final String emptyMessage;

  /// Optional in-memory filter (e.g. Shorts only) applied to each loaded page.
  final bool Function(Article)? where;

  @override
  State<PagedNewsList> createState() => _PagedNewsListState();
}

class _PagedNewsListState extends State<PagedNewsList> {
  static const pageSize = 20;

  final _items = <Article>[];
  DateTime? _cursor;
  bool _loading = false;
  bool _hasMore = true;
  String? _error;

  /// Pages fetched without finding anything that passes [PagedNewsList.where].
  int _emptyPages = 0;
  static const _maxEmptyPages = 5;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_items.isEmpty && !_loading && _error == null) _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await AppServices.of(context).repository.feed(widget.filter, before: _cursor, limit: pageSize);
      if (!mounted) return;
      final kept = widget.where == null ? page : page.where(widget.where!).toList();
      setState(() {
        if (page.isNotEmpty) _cursor = page.last.publishedAt;
        _items.addAll(kept);
        _emptyPages = kept.isEmpty ? _emptyPages + 1 : 0;
        // Stop paging when the feed ends, or when a filtered feed keeps coming back empty.
        _hasMore = page.length == pageSize && _emptyPages < _maxEmptyPages;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e is NewsLoadException ? e.message : const NewsLoadException().message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    // A filtered page can be empty while more pages exist; keep going so the list does not stall.
    if (mounted && _error == null && _hasMore && _emptyPages > 0) await _loadMore();
  }

  Future<void> _refresh() async {
    setState(() {
      _items.clear();
      _cursor = null;
      _hasMore = true;
      _error = null;
      _emptyPages = 0;
    });
    await _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) {
      if (_error != null) return ErrorView(message: _error!, onRetry: _refresh);
      if (_loading || _hasMore) return const LoadingView();
      return RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(children: [?widget.header, EmptyView(icon: Icons.article_outlined, message: widget.emptyMessage)]),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = columnsFor(constraints.maxWidth);
        final rows = (_items.length / columns).ceil();
        return NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 600) _loadMore();
            return false;
          },
          child: RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: rows + 2,
              itemBuilder: (context, i) {
                if (i == 0) return widget.header ?? const SizedBox.shrink();
                if (i == rows + 1) {
                  if (_error != null) return ErrorView(message: _error!, onRetry: _loadMore);
                  if (_loading) return const LoadingView();
                  if (_hasMore) return const SizedBox(height: 48);
                  return const SizedBox(height: 24);
                }
                final start = (i - 1) * columns;
                final rowItems = _items.sublist(start, (start + columns).clamp(0, _items.length));
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var c = 0; c < columns; c++)
                      Expanded(child: c < rowItems.length ? NewsCard(article: rowItems[c]) : const SizedBox.shrink()),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
}
