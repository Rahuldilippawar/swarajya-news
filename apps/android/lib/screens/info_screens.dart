import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../services.dart';
import '../widgets/states.dart';

const youtubeChannelUrl = 'https://www.youtube.com/@swarajyanews2025';

class _InfoScreen extends StatelessWidget {
  const _InfoScreen({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title)),
        body: ListView(padding: const EdgeInsets.all(16), children: children),
      );
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) => _InfoScreen(
        title: 'आमच्याबद्दल',
        children: [
          const Text('स्वराज्य न्यूज (Swarajya News) ही जिल्हा, तालुका आणि गावपातळीवरील बातम्या आपल्यापर्यंत पोहोचवणारी स्वतंत्र मराठी वृत्तवाहिनी आहे.'),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => launchUrl(Uri.parse(youtubeChannelUrl), mode: LaunchMode.externalApplication),
            icon: const Icon(Icons.smart_display),
            label: const Text('आमचे YouTube चॅनेल'),
          ),
        ],
      );
}

/// Contact details and social links from Admin → Settings.
class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

const _socialNames = {'youtube': 'YouTube', 'facebook': 'Facebook', 'instagram': 'Instagram', 'whatsapp': 'WhatsApp', 'x': 'X'};

class _ContactScreenState extends State<ContactScreen> {
  Future<AppSettings>? _settings;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _settings ??= AppServices.of(context).repository.settings().catchError((Object _) => AppSettings.defaults);
  }

  void _open(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication).catchError((Object _) => false);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AppSettings>(
      future: _settings,
      builder: (context, snap) {
        if (!snap.hasData) return const Scaffold(body: LoadingView());
        final s = snap.data!;
        final c = s.contact;
        String digits(String v) => v.replaceAll(RegExp(r'[^\d+]'), '');
        final tiles = <Widget>[
          if (c['phone'] != null)
            ListTile(leading: const Icon(Icons.call), title: Text(c['phone']!), onTap: () => _open('tel:${digits(c['phone']!)}')),
          if (c['whatsapp'] != null)
            ListTile(
              leading: const Icon(Icons.chat),
              title: Text('WhatsApp: ${c['whatsapp']}'),
              onTap: () => _open('https://wa.me/${digits(c['whatsapp']!).replaceFirst('+', '')}'),
            ),
          if (c['email'] != null) ListTile(leading: const Icon(Icons.email), title: Text(c['email']!), onTap: () => _open('mailto:${c['email']}')),
          if (c['address'] != null) ListTile(leading: const Icon(Icons.place), title: Text(c['address']!)),
          for (final e in s.social.entries)
            if (_socialNames.containsKey(e.key))
              ListTile(leading: const Icon(Icons.link), title: Text(_socialNames[e.key]!), onTap: () => _open(e.value)),
        ];
        return _InfoScreen(
          title: 'संपर्क',
          children: [
            Text(s.channelName, style: Theme.of(context).textTheme.titleLarge),
            if (s.tagline != null) Text(s.tagline!),
            const SizedBox(height: 8),
            if (tiles.isEmpty) const Text('संपर्काचे तपशील लवकरच येथे उपलब्ध होतील.') else ...tiles,
          ],
        );
      },
    );
  }
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  // Placeholder: the final text must be approved by Swarajya News management before release.
  @override
  Widget build(BuildContext context) => const _InfoScreen(
        title: 'गोपनीयता धोरण',
        children: [
          Text('हे धोरण सध्या तयार केले जात आहे आणि लवकरच प्रकाशित केले जाईल.'),
          SizedBox(height: 12),
          Text('हे ॲप वापरण्यासाठी लॉगिनची आवश्यकता नाही. जतन केलेल्या बातम्या फक्त तुमच्या फोनवर साठवल्या जातात.'),
        ],
      );
}
