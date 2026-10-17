import 'package:flutter_test/flutter_test.dart';
import 'package:swarajya_news/app.dart';

void main() {
  testWidgets('splash leads to the home shell with all tabs', (tester) async {
    await tester.pumpWidget(SwarajyaNewsApp(initialise: () async {}));
    await tester.pumpAndSettle();

    expect(find.text('स्वराज्य न्यूज'), findsOneWidget);
    for (final label in ['मुख्यपृष्ठ', 'व्हिडिओ', 'विभाग', 'जतन केलेले']) {
      expect(find.text(label), findsOneWidget);
    }

    await tester.tap(find.text('जतन केलेले'));
    await tester.pumpAndSettle();
    expect(find.text('आपण जतन केलेल्या बातम्या येथे दिसतील.'), findsOneWidget);
  });

  testWidgets('splash offers a retry when start-up fails', (tester) async {
    await tester.pumpWidget(SwarajyaNewsApp(initialise: () async => throw Exception('offline')));
    await tester.pumpAndSettle();

    expect(find.text('पुन्हा प्रयत्न करा'), findsOneWidget);
  });
}
