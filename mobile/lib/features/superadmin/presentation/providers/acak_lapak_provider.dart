import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'acak_lapak_notifier.dart';
import 'acak_lapak_state.dart';

final acakLapakProvider = StateNotifierProvider<AcakLapakNotifier, AcakLapakState>(
  (ref) => AcakLapakNotifier(),
);