import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'scan_notifier.dart';
import 'scan_state.dart';

final scanProvider = StateNotifierProvider<ScanNotifier, ScanState>(
  (ref) => ScanNotifier(),
);