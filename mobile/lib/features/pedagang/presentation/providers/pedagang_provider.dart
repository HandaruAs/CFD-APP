import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'pedagang_notifier.dart';
import 'pedagang_state.dart';

final pedagangProvider = StateNotifierProvider<PedagangNotifier, PedagangState>((ref) {
  return PedagangNotifier();
});