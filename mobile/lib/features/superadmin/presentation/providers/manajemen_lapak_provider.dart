import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'manajemen_lapak_notifier.dart';
import 'manajemen_lapak_state.dart';

final manajemenLapakProvider =
    StateNotifierProvider<ManajemenLapakNotifier, ManajemenLapakState>(
  (ref) => ManajemenLapakNotifier(),
);