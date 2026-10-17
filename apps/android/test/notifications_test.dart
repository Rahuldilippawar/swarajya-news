import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarajya_news/app.dart';
import 'package:swarajya_news/notifications/push_service.dart';
import 'package:swarajya_news/notifications/topics.dart';

import 'fakes.dart';

final stories = [
  article(1, headline: 'पुण्यात मुसळधार पाऊस', breaking: true),
  for (var i = 2; i <= 6; i++) article(i),
];

Future<FakePushService> startApp(WidgetTester tester, {FakePushService? push, Map<String, Object> prefs = const {}}) async {
  tester.view.physicalSize = const Size(420, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  ignoreImageLoadErrors();
  final service = push ?? FakePushService();
  await tester.pumpWidget(SwarajyaNewsApp(bootstrap: fakeBootstrap(FakeNewsRepository(stories), push: service, prefs: prefs)));
  await tester.pumpAndSettle();
  return service;
}

void main() {
  setUpAll(() => initializeDateFormatting('mr'));

  test('topic names match the Cloud Function (shared/src/notifications.ts)', () {
    expect(allNewsTopic, 'news_all');
    expect(districtTopic('district-pune'), 'district_district-pune');
    expect(districtTopic('a b/c'), 'district_a_b_c');
  });

  testWidgets('first launch asks for permission once and subscribes to all news', (tester) async {
    final push = await startApp(tester);
    expect(push.permissionRequests, 1);
    expect(push.topics, {allNewsTopic});
    expect((await SharedPreferences.getInstance()).getBool('notify_permission_asked'), isTrue);
  });

  testWidgets('later launches do not ask for permission again', (tester) async {
    final push = await startApp(tester, prefs: {'notify_permission_asked': true});
    expect(push.permissionRequests, 0);
    expect(push.topics, {allNewsTopic});
  });

  testWidgets('tapping a notification opens its article', (tester) async {
    final push = await startApp(tester);
    push.tap('n3');
    await tester.pumpAndSettle();
    expect(find.text('पहिला परिच्छेद 3.'), findsOneWidget);
  });

  testWidgets('a notification that launched the app opens its article on top of home', (tester) async {
    await startApp(tester, push: FakePushService()..launchNewsId = 'n1');
    expect(find.text('पहिला परिच्छेद 1.'), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text('मुख्यपृष्ठ'), findsOneWidget, reason: 'back goes to home, not out of the app');
  });

  testWidgets('a notification for an unpublished article explains instead of crashing', (tester) async {
    final push = await startApp(tester);
    push.tap('removed');
    await tester.pumpAndSettle();
    expect(find.text('ही बातमी आता उपलब्ध नाही.'), findsOneWidget);
  });

  testWidgets('a notification received while the app is open shows a banner that opens the article', (tester) async {
    final push = await startApp(tester);
    push.receive(const PushAlert(title: 'ब्रेकिंग: पुण्यात मुसळधार पाऊस', body: 'शाळांना सुट्टी', newsId: 'n1'));
    await tester.pumpAndSettle();
    expect(find.text('ब्रेकिंग: पुण्यात मुसळधार पाऊस'), findsOneWidget);
    await tester.tap(find.text('पाहा'));
    await tester.pumpAndSettle();
    expect(find.text('पहिला परिच्छेद 1.'), findsOneWidget);
  });

  testWidgets('readers can turn off all-news alerts and follow districts', (tester) async {
    final push = await startApp(tester);
    await tester.tap(find.byTooltip('Open navigation menu').evaluate().isNotEmpty ? find.byTooltip('Open navigation menu') : find.byIcon(Icons.menu));
    await tester.pumpAndSettle();
    await tester.tap(find.text('सूचना सेटिंग्ज'));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(SwitchListTile));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(CheckboxListTile, 'पुणे'));
    await tester.pumpAndSettle();

    expect(push.topics, {districtTopic('pune')});
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('notify_all_news'), isFalse);
    expect(prefs.getStringList('notify_districts'), ['pune']);
  });

  testWidgets('saved choices are re-applied on the next launch', (tester) async {
    final push = await startApp(tester, prefs: {
      'notify_permission_asked': true,
      'notify_all_news': false,
      'notify_districts': ['pune'],
    });
    expect(push.topics, {districtTopic('pune')});
  });

  testWidgets('a subscription failure (offline) does not break the app', (tester) async {
    await startApp(tester, push: FakePushService()..failSubscriptions = true);
    expect(tester.takeException(), isNull);
    expect(find.text('मुख्यपृष्ठ'), findsOneWidget);
  });
}
