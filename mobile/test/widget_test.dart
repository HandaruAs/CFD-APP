// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/features/auth/presentation/pages/register_screen.dart';

void main() {
  test('NIK validation accepts exactly 16 ASCII digits', () {
    expect(nikValid16Digit('1234567890123456'), isTrue);
    expect(nikValid16Digit('123456789012345'), isFalse);
    expect(nikValid16Digit('12345678901234567'), isFalse);
    expect(nikValid16Digit('123456789012345a'), isFalse);
  });

  testWidgets(
    'register screen explains account continues to business and stall signup',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: RegisterScreen())),
      );

      expect(find.text('Langkah 1 dari 3'), findsOneWidget);
      expect(find.text('Nama Lengkap'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Lanjut ke Data Usaha'), findsOneWidget);
    },
  );
}
