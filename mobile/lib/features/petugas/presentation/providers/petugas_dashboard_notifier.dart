import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/petugas_dashboard_datasource.dart';
import 'package:mobile/features/petugas/data/datasources/operasional_datasource.dart';
import 'petugas_dashboard_state.dart';

class PetugasDashboardNotifier extends StateNotifier<PetugasDashboardState> {
  PetugasDashboardNotifier() : super(PetugasDashboardState.initial());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final statusOperasional = await OperasionalDatasource.getStatusOperasional();
      final stats = await PetugasDashboardDatasource.getStatsHariIni();

      state = state.copyWith(
        isLoading: false,
        statusOperasional: statusOperasional,
        stats: stats,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}