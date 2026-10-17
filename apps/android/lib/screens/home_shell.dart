import 'package:flutter/material.dart';

import '../widgets/brand_logo.dart';
import '../widgets/empty_state.dart';

class _Tab {
  const _Tab(this.label, this.icon, this.emptyMessage);

  final String label;
  final IconData icon;
  final String emptyMessage;
}

// News feeds are connected to Firestore in Milestone 7.
const _tabs = [
  _Tab('मुख्यपृष्ठ', Icons.home_outlined, 'अद्याप बातम्या प्रकाशित झालेल्या नाहीत.'),
  _Tab('व्हिडिओ', Icons.play_circle_outline, 'अद्याप व्हिडिओ बातम्या नाहीत.'),
  _Tab('विभाग', Icons.grid_view_outlined, 'विभाग लवकरच उपलब्ध होतील.'),
  _Tab('जतन केलेले', Icons.bookmark_outline, 'आपण जतन केलेल्या बातम्या येथे दिसतील.'),
];

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final tab = _tabs[_index];
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            BrandLogo(height: 32),
            SizedBox(width: 10),
            Text('स्वराज्य न्यूज'),
          ],
        ),
      ),
      body: EmptyState(icon: tab.icon, message: tab.emptyMessage),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          for (final t in _tabs) NavigationDestination(icon: Icon(t.icon), label: t.label),
        ],
      ),
    );
  }
}
