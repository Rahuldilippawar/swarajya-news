import 'package:flutter/material.dart';

import '../../services.dart';
import '../../widgets/news_card.dart';
import '../../widgets/states.dart';

/// Articles saved on this device. Works offline: the full text is stored locally.
class SavedTab extends StatelessWidget {
  const SavedTab({super.key});

  @override
  Widget build(BuildContext context) {
    final saved = AppServices.of(context).saved;
    return ListenableBuilder(
      listenable: saved,
      builder: (context, _) {
        final items = saved.items;
        if (items.isEmpty) {
          return const EmptyView(icon: Icons.bookmark_outline, message: 'आपण जतन केलेल्या बातम्या येथे दिसतील. बातमीवरील 🔖 चिन्ह दाबा.');
        }
        return ListView.builder(
          padding: const EdgeInsets.all(8),
          itemCount: items.length,
          itemBuilder: (context, i) {
            final a = items[i];
            return Dismissible(
              key: ValueKey(a.id),
              direction: DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 24),
                color: Theme.of(context).colorScheme.errorContainer,
                child: const Icon(Icons.delete_outline),
              ),
              onDismissed: (_) => saved.toggle(a),
              child: NewsCard(article: a),
            );
          },
        );
      },
    );
  }
}
