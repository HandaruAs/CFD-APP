import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/petugas_dashboard_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/event_hari_ini.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'petugas_dashboard_state.dart';

class PetugasDashboardNotifier extends StateNotifier<PetugasDashboardState> {
  PetugasDashboardNotifier() : super(PetugasDashboardState.initial());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // Dua request jalan barengan, sama kayak Promise.all di web.
      final hasil = await Future.wait<Object>([
        PetugasDashboardDatasource.getEventHariIni(),
        PetugasDashboardDatasource.getLaporanHariIni(),
      ]);
      state = state.copyWith(
        isLoading: false,
        events: hasil[0] as List<EventHariIni>,
        laporan: hasil[1] as LaporanResponse,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}