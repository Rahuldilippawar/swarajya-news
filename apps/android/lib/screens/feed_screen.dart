import 'package:flutter/material.dart';

import '../data/models.dart';
import '../widgets/paged_news_list.dart';

/// A full-screen paged list: latest, breaking, a category, etc.
class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key, required this.title, required this.filter, this.emptyMessage});

  final String title;
  final NewsFilter filter;
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: PagedNewsList(filter: filter, emptyMessage: emptyMessage ?? 'अद्याप बातम्या प्रकाशित झालेल्या नाहीत.'),
    );
  }
}
