import 'package:flutter/material.dart';

import '../data/models.dart';
import '../widgets/brand_logo.dart';
import 'feed_screen.dart';
import 'info_screens.dart';
import 'search_screen.dart';
import 'tabs/browse_tab.dart';
import 'tabs/home_tab.dart';
import 'tabs/saved_tab.dart';
import 'tabs/video_tab.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  // Tabs stay alive (IndexedStack) so switching back keeps their scroll position.
  static const _tabs = [HomeTab(), VideoTab(), BrowseTab(), SavedTab()];

  void _push(Widget screen) {
    Navigator.of(context)
      ..pop()
      ..push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            BrandLogo(height: 32),
            SizedBox(width: 10),
            // Shrinks with an ellipsis on narrow phones instead of overflowing.
            Flexible(child: Text('स्वराज्य न्यूज', overflow: TextOverflow.ellipsis)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'शोधा',
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SearchScreen())),
          ),
        ],
      ),
      drawer: NavigationDrawer(
        children: [
          const Padding(padding: EdgeInsets.all(16), child: BrandLogo(height: 56)),
          ListTile(
            leading: const Icon(Icons.newspaper),
            title: const Text('ताज्या बातम्या'),
            onTap: () => _push(const FeedScreen(title: 'ताज्या बातम्या', filter: LatestNews())),
          ),
          ListTile(
            leading: const Icon(Icons.bolt),
            title: const Text('ब्रेकिंग न्यूज'),
            onTap: () => _push(const FeedScreen(title: 'ब्रेकिंग न्यूज', filter: BreakingNews(), emptyMessage: 'सध्या कोणतीही ब्रेकिंग न्यूज नाही.')),
          ),
          const Divider(),
          ListTile(leading: const Icon(Icons.info_outline), title: const Text('आमच्याबद्दल'), onTap: () => _push(const AboutScreen())),
          ListTile(leading: const Icon(Icons.call_outlined), title: const Text('संपर्क'), onTap: () => _push(const ContactScreen())),
          ListTile(leading: const Icon(Icons.privacy_tip_outlined), title: const Text('गोपनीयता धोरण'), onTap: () => _push(const PrivacyPolicyScreen())),
        ],
      ),
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'मुख्यपृष्ठ'),
          NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'व्हिडिओ'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'विभाग'),
          NavigationDestination(icon: Icon(Icons.bookmark_outline), selectedIcon: Icon(Icons.bookmark), label: 'जतन केलेले'),
        ],
      ),
    );
  }
}
