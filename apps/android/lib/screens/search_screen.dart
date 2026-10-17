import 'package:flutter/material.dart';

import '../data/models.dart';
import '../data/news_repository.dart';
import '../services.dart';
import '../widgets/news_card.dart';
import '../widgets/states.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});
  final String initialQuery;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final _controller = TextEditingController(text: widget.initialQuery);
  List<Category> _categories = const [];
  List<Place> _districts = const [];
  String? _categoryId;
  Place? _district;
  Future<List<Article>>? _results;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_results == null && widget.initialQuery.isNotEmpty) _search();
    if (_categories.isEmpty) _loadFilters();
  }

  Future<void> _loadFilters() async {
    final repo = AppServices.of(context).repository;
    try {
      final results = await Future.wait([repo.categories(), repo.districts()]);
      if (!mounted) return;
      setState(() {
        _categories = results[0] as List<Category>;
        _districts = results[1] as List<Place>;
      });
    } catch (_) {
      // Filters are optional; searching still works without them.
    }
  }

  void _search() {
    final term = _controller.text.trim();
    if (term.isEmpty && _categoryId == null && _district == null) return;
    setState(() {
      _results = AppServices.of(context).repository.search(term, categoryId: _categoryId, place: _district);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: widget.initialQuery.isEmpty,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
          decoration: const InputDecoration(hintText: 'बातम्या शोधा', border: InputBorder.none),
        ),
        actions: [IconButton(tooltip: 'शोधा', icon: const Icon(Icons.search), onPressed: _search)],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    initialValue: _categoryId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'विभाग', isDense: true),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('सर्व विभाग')),
                      for (final c in _categories) DropdownMenuItem(value: c.id, child: Text(c.name)),
                    ],
                    onChanged: (v) {
                      _categoryId = v;
                      _search();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<Place?>(
                    initialValue: _district,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'जिल्हा', isDense: true),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('सर्व जिल्हे')),
                      for (final d in _districts) DropdownMenuItem(value: d, child: Text(d.name)),
                    ],
                    onChanged: (v) {
                      _district = v;
                      _search();
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _results == null
                ? const EmptyView(icon: Icons.search, message: 'शब्द, मथळा किंवा टॅग लिहून शोधा.')
                : FutureBuilder<List<Article>>(
                    future: _results,
                    builder: (context, snap) {
                      if (snap.connectionState != ConnectionState.done) return const LoadingView();
                      if (snap.hasError) {
                        final error = snap.error;
                        return ErrorView(message: error is NewsLoadException ? error.message : const NewsLoadException().message, onRetry: _search);
                      }
                      final items = snap.data!;
                      if (items.isEmpty) return const EmptyView(icon: Icons.search_off, message: 'काहीही सापडले नाही. वेगळे शब्द वापरून पाहा.');
                      return ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: items.length,
                        itemBuilder: (_, i) => NewsCard(article: items[i]),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
