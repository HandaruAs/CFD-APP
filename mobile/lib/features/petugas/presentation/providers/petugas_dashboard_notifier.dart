import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/operasional_datasource.dart';
import 'package:mobile/features/petugas/data/datasources/petugas_dashboard_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'petugas_dashboard_state.dart';

class PetugasDashboardNotifier extends StateNotifier<PetugasDashboardState> {
  PetugasDashboardNotifier() : super(PetugasDashboardState.initial());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // Dua request jalan barengan, sama kayak Promise.all di web.
      final hasil = await Future.wait<Object>([
        OperasionalDatasource.getStatusOperasional(),
        PetugasDashboardDatasource.getLaporanHariIni(),
      ]);
      final statusOperasional = hasil[0] as StatusOperasional;
      final laporan = hasil[1] as LaporanResponse;

      state = state.copyWith(
        isLoading: false,
        statusOperasional: statusOperasional,
        laporan: laporan,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}