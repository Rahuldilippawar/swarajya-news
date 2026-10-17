import 'package:flutter/material.dart';

import '../data/models.dart';
import '../services.dart';
import '../widgets/states.dart';

/// Lets readers choose which news alerts they receive.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  Future<List<Place>>? _districts;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _districts ??= AppServices.of(context).repository.districts();
  }

  @override
  Widget build(BuildContext context) {
    final prefs = AppServices.of(context).notificationPrefs;
    return Scaffold(
      appBar: AppBar(title: const Text('सूचना')),
      body: ListenableBuilder(
        listenable: prefs,
        builder: (context, _) => ListView(
          children: [
            SwitchListTile(
              title: const Text('महत्त्वाच्या बातम्यांच्या सूचना'),
              subtitle: const Text('संपादक पाठवत असलेल्या ब्रेकिंग आणि महत्त्वाच्या बातम्या'),
              value: prefs.allNews,
              onChanged: prefs.setAllNews,
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Text('माझे जिल्हे', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('निवडलेल्या जिल्ह्यांतील बातम्यांच्या सूचनाही मिळतील.'),
            ),
            FutureBuilder<List<Place>>(
              future: _districts,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) return const LoadingView();
                if (snap.hasError) {
                  return ErrorView(
                    message: 'जिल्ह्यांची यादी लोड करता आली नाही.',
                    onRetry: () => setState(() {
                      _districts = AppServices.of(context).repository.districts();
                    }),
                  );
                }
                return Column(
                  children: [
                    for (final d in snap.data!)
                      CheckboxListTile(
                        title: Text(d.name),
                        value: prefs.districts.contains(d.id),
                        onChanged: (on) => prefs.setDistrict(d.id, on ?? false),
                      ),
                  ],
                );
              },
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'सूचना दिसत नसल्यास फोनच्या Settings → Apps → Swarajya News → Notifications मध्ये परवानगी तपासा.',
                style: TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
