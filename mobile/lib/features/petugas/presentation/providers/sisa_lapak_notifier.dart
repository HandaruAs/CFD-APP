import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/sisa_lapak_datasource.dart';
import 'sisa_lapak_state.dart';

class SisaLapakNotifier extends StateNotifier<SisaLapakState> {
  SisaLapakNotifier() : super(SisaLapakState.initial());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final kecamatanList = await SisaLapakDatasource.getSisaLapak();
      final instansiList = await SisaLapakDatasource.getInstansi();
      state = state.copyWith(
        isLoading: false,
        kecamatanList: kecamatanList,
        instansiList: instansiList,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> _runAction(Future<void> Function() action) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      await action();
      await loadAll();
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<bool> createJalan({
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
    required String instansiId,
  }) {
    return _runAction(() => SisaLapakDatasource.createJalan(
          kodeJalan: kodeJalan,
          namaJalan: namaJalan,
          kapasitas: kapasitas,
          instansiId: instansiId,
        ));
  }

  Future<bool> updateJalan({
    required String id,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) {
    return _runAction(() => SisaLapakDatasource.updateJalan(
          id: id,
          kodeJalan: kodeJalan,
          namaJalan: namaJalan,
          kapasitas: kapasitas,
        ));
  }

  Future<bool> deleteJalan(String id) {
    return _runAction(() => SisaLapakDatasource.deleteJalan(id));
  }
}