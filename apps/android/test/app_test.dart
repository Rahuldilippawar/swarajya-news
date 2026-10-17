import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarajya_news/app.dart';
import 'package:swarajya_news/data/saved_news.dart';

import 'fakes.dart';

Future<void> startApp(WidgetTester tester, FakeNewsRepository repo, {Size size = const Size(420, 900)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  ignoreImageLoadErrors();
  await tester.pumpWidget(SwarajyaNewsApp(bootstrap: fakeBootstrap(repo)));
  await tester.pumpAndSettle();
}


void main() {
  setUpAll(() => initializeDateFormatting('mr'));

  final standard = [
    article(1, headline: 'पुणे-नगर महामार्गावर अपघात', breaking: true, tags: ['अपघात'], talukaId: 'haveli'),
    article(2, headline: 'सातारा जिल्ह्यात सोयाबीन खरेदी', featured: true, categoryId: 'crime'),
    article(3, headline: 'द्राक्ष उत्पादकांची बैठक', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ'),
    article(4, headline: 'पाणीपुरवठा खंडित — शॉर्ट', youtubeUrl: 'https://youtube.com/shorts/aaaaaaaaaaa'),
    for (var i = 5; i <= 12; i++) article(i),
  ];

  testWidgets('home shows breaking news, the featured story and category sections', (tester) async {
    await startApp(tester, FakeNewsRepository(standard));

    expect(find.text('ब्रेकिंग'), findsWidgets);
    expect(find.text('पुणे-नगर महामार्गावर अपघात'), findsWidgets);
    expect(find.text('सातारा जिल्ह्यात सोयाबीन खरेदी'), findsWidgets, reason: 'featured story leads the page');
    expect(find.text('ताज्या बातम्या'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('गुन्हे'), 300, scrollable: find.byType(Scrollable).first);
    expect(find.text('गुन्हे'), findsOneWidget);
  });

  testWidgets('opening an article shows its text, video, and lets the reader save it', (tester) async {
    final repo = FakeNewsRepository(standard);
    await startApp(tester, repo);

    await tester.tap(find.text('द्राक्ष उत्पादकांची बैठक').first);
    await tester.pumpAndSettle();
    expect(find.text('पहिला परिच्छेद 3.'), findsOneWidget);
    expect(find.bySemanticsLabel('व्हिडिओ पाहा'), findsOneWidget);
    expect(find.text('WhatsApp वर शेअर करा'), findsOneWidget);

    await tester.tap(find.byTooltip('जतन करा'));
    await tester.pumpAndSettle();
    expect(find.text('बातमी जतन केली'), findsOneWidget);
    expect(find.byTooltip('जतन काढा'), findsOneWidget);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    await tester.tap(find.text('जतन केलेले'));
    await tester.pumpAndSettle();
    expect(find.text('द्राक्ष उत्पादकांची बैठक'), findsOneWidget);

    // Saved news survives an app restart.
    final reloaded = await SavedNews.load();
    expect(reloaded.items.map((a) => a.id), ['n3']);
    expect(reloaded.items.single.youtubeVideoId, 'dQw4w9WgXcQ');
    expect((await SharedPreferences.getInstance()).getString('saved_articles_v1'), contains('द्राक्ष'));
  });

  testWidgets('a network failure shows a retry button that recovers', (tester) async {
    await startApp(tester, FakeNewsRepository(standard, failuresLeft: 1));
    expect(find.textContaining('इंटरनेट कनेक्शन तपासा'), findsOneWidget);

    await tester.tap(find.text('पुन्हा प्रयत्न करा'));
    await tester.pumpAndSettle();
    expect(find.text('ताज्या बातम्या'), findsOneWidget);
  });

  testWidgets('an empty site shows an empty state, not an error', (tester) async {
    await startApp(tester, FakeNewsRepository(const []));
    expect(find.text('अद्याप बातम्या प्रकाशित झालेल्या नाहीत.'), findsOneWidget);
    await tester.tap(find.text('जतन केलेले'));
    await tester.pumpAndSettle();
    expect(find.textContaining('आपण जतन केलेल्या बातम्या'), findsOneWidget);
  });

  testWidgets('long feeds load more as the reader scrolls', (tester) async {
    final repo = FakeNewsRepository([for (var i = 1; i <= 45; i++) article(i)]);
    await startApp(tester, repo);
    await tester.tap(find.text('सर्व पाहा').first);
    await tester.pumpAndSettle();
    expect(find.text('जिल्ह्यातील बातमी क्रमांक 1'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('जिल्ह्यातील बातमी क्रमांक 45'), 500, scrollable: find.byType(Scrollable).last);
    expect(find.text('जिल्ह्यातील बातमी क्रमांक 45'), findsOneWidget);
  });

  testWidgets('search finds articles by headline and tag', (tester) async {
    await startApp(tester, FakeNewsRepository(standard));
    await tester.tap(find.byTooltip('शोधा'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'अपघात');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(find.text('पुणे-नगर महामार्गावर अपघात'), findsOneWidget);
    expect(find.text('द्राक्ष उत्पादकांची बैठक'), findsNothing);
  });

  testWidgets('district news can be narrowed to a taluka', (tester) async {
    await startApp(tester, FakeNewsRepository(standard));
    await tester.tap(find.text('विभाग'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('पुणे'));
    await tester.pumpAndSettle();
    expect(find.text('पुणे जिल्हा'), findsOneWidget);

    await tester.tap(find.widgetWithText(ChoiceChip, 'हवेली'));
    await tester.pumpAndSettle();
    expect(find.text('हवेली, पुणे'), findsOneWidget);
    expect(find.text('पुणे-नगर महामार्गावर अपघात'), findsOneWidget);
    expect(find.text('सातारा जिल्ह्यात सोयाबीन खरेदी'), findsNothing);
  });

  testWidgets('the video tab separates regular videos from Shorts', (tester) async {
    await startApp(tester, FakeNewsRepository(standard));
    await tester.tap(find.text('व्हिडिओ'));
    await tester.pumpAndSettle();
    expect(find.text('द्राक्ष उत्पादकांची बैठक'), findsOneWidget);
    expect(find.text('पाणीपुरवठा खंडित — शॉर्ट'), findsNothing);

    await tester.tap(find.text('शॉर्ट व्हिडिओ'));
    await tester.pumpAndSettle();
    expect(find.text('पाणीपुरवठा खंडित — शॉर्ट'), findsOneWidget);
  });

  testWidgets('tablets get a multi-column layout without overflow', (tester) async {
    await startApp(tester, FakeNewsRepository(standard), size: const Size(1280, 800));
    expect(tester.takeException(), isNull);
    // Two consecutive stories sit side by side rather than stacked.
    final a = tester.getTopLeft(find.text('द्राक्ष उत्पादकांची बैठक'));
    final b = tester.getTopLeft(find.text('पाणीपुरवठा खंडित — शॉर्ट'));
    expect(a.dy, b.dy);
    expect(b.dx, greaterThan(a.dx));
  });

  testWidgets('small phones (320 px) lay out home and article screens without overflow', (tester) async {
    await startApp(tester, FakeNewsRepository(standard), size: const Size(320, 640));
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('सातारा जिल्ह्यात सोयाबीन खरेदी').first);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('WhatsApp वर शेअर करा'), findsOneWidget);
  });

  testWidgets('start-up failure offers a retry', (tester) async {
    var attempts = 0;
    final repo = FakeNewsRepository(standard);
    final ok = fakeBootstrap(repo);
    await tester.pumpWidget(SwarajyaNewsApp(bootstrap: () async {
      if (attempts++ == 0) throw Exception('offline');
      return ok();
    }));
    await tester.pumpAndSettle();
    expect(find.text('ॲप सुरू करताना अडचण आली.'), findsOneWidget);
    await tester.tap(find.text('पुन्हा प्रयत्न करा'));
    await tester.pumpAndSettle();
    expect(find.text('सातारा जिल्ह्यात सोयाबीन खरेदी'), findsOneWidget, reason: 'home loaded after retry');
  });
}
