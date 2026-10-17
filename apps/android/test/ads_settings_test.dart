import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:swarajya_news/app.dart';
import 'package:swarajya_news/data/models.dart';
import 'package:swarajya_news/widgets/ad_banner.dart';

import 'fakes.dart';

final stories = [for (var i = 1; i <= 5; i++) article(i)];
final running = AppAd(
  id: 'ad1',
  title: 'दिवाळी ऑफर',
  imageUrl: 'https://img.example/banner.jpg',
  targetUrl: 'https://shop.example/diwali',
  startAt: DateTime(2020),
  endAt: DateTime(2100),
);

Future<void> startApp(WidgetTester tester, FakeNewsRepository repo, {FakeAdTracker? tracker}) async {
  tester.view.physicalSize = const Size(420, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  ignoreImageLoadErrors();
  AdBanner.resetSession();
  await tester.pumpWidget(SwarajyaNewsApp(bootstrap: fakeBootstrap(repo, tracker: tracker)));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('mr'));

  testWidgets('shows a labelled banner and counts one impression and each tap', (tester) async {
    final tracker = FakeAdTracker();
    await startApp(tester, FakeNewsRepository(stories, ads: [running]), tracker: tracker);
    expect(find.text('जाहिरात'), findsOneWidget);
    expect(tracker.events, ['impression:ad1']);

    await tester.tap(find.byType(AdBanner));
    await tester.pumpAndSettle();
    expect(tracker.events, ['impression:ad1', 'click:ad1']);
  });

  testWidgets('no banner when no ad is running, and a failing ad query never hides the news', (tester) async {
    await startApp(tester, FakeNewsRepository(stories, adsFail: true));
    expect(find.text('जाहिरात'), findsNothing);
    expect(find.text('ताज्या बातम्या'), findsOneWidget);
  });

  test('ads run only between their start and end', () {
    final ad = AppAd(id: 'x', title: '', imageUrl: '', targetUrl: '', startAt: DateTime(2026, 10, 1), endAt: DateTime(2026, 11, 1));
    expect(ad.isRunning(DateTime(2026, 9, 30)), isFalse);
    expect(ad.isRunning(DateTime(2026, 10, 15)), isTrue);
    expect(ad.isRunning(DateTime(2026, 11, 1)), isFalse);
  });

  testWidgets('the contact screen shows details from Admin → Settings', (tester) async {
    const settings = AppSettings(
      channelName: 'स्वराज्य न्यूज',
      tagline: 'सत्य, थेट तुमच्यापर्यंत',
      contact: {'phone': '+91 98765 43210', 'email': 'news@example.com', 'address': 'शिवाजीनगर, पुणे'},
      social: {'youtube': 'https://www.youtube.com/@swarajyanews2025', 'instagram': 'https://instagram.com/swarajya'},
    );
    await startApp(tester, FakeNewsRepository(stories, appSettings: settings));
    await tester.tap(find.byTooltip('Open navigation menu').evaluate().isNotEmpty ? find.byTooltip('Open navigation menu') : find.byIcon(Icons.menu));
    await tester.pumpAndSettle();
    await tester.tap(find.text('संपर्क'));
    await tester.pumpAndSettle();
    for (final text in ['सत्य, थेट तुमच्यापर्यंत', '+91 98765 43210', 'news@example.com', 'शिवाजीनगर, पुणे', 'YouTube', 'Instagram']) {
      expect(find.text(text), findsOneWidget, reason: text);
    }
  });
}
