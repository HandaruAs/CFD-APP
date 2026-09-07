import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'jam_operasional_notifier.dart';
import 'jam_operasional_state.dart';

final jamOperasionalProvider =
    StateNotifierProvider<JamOperasionalNotifier, JamOperasionalState>(
  (ref) => JamOperasionalNotifier(),
);