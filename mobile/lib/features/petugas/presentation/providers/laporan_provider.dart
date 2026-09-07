import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'laporan_notifier.dart';
import 'laporan_state.dart';

final laporanProvider = StateNotifierProvider<LaporanNotifier, LaporanState>(
  (ref) => LaporanNotifier(),
);