import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sisa_lapak_notifier.dart';
import 'sisa_lapak_state.dart';

final sisaLapakProvider = StateNotifierProvider<SisaLapakNotifier, SisaLapakState>(
  (ref) => SisaLapakNotifier(),
);