import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

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

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  // Contact details will come from the appSettings document managed in the Admin Panel (Milestone 10).
  @override
  Widget build(BuildContext context) =>
      const _InfoScreen(title: 'संपर्क', children: [Text('संपर्काचे तपशील लवकरच येथे उपलब्ध होतील.')]);
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
