import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'petugas_dashboard_notifier.dart';
import 'petugas_dashboard_state.dart';

final petugasDashboardProvider =
    StateNotifierProvider<PetugasDashboardNotifier, PetugasDashboardState>(
  (ref) => PetugasDashboardNotifier(),
);