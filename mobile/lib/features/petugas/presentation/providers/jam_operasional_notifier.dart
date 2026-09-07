import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/operasional_datasource.dart';
import 'jam_operasional_state.dart';

class JamOperasionalNotifier extends StateNotifier<JamOperasionalState> {
  JamOperasionalNotifier() : super(JamOperasionalState.initial());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final status = await OperasionalDatasource.getStatusOperasional();
      final jadwal = await OperasionalDatasource.getJadwalMingguan();
      state = state.copyWith(isLoading: false, status: status, jadwalMingguan: jadwal);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Dipakai tiap aksi cepat (buka sesi, akhiri sesi, simpan sesi,
  /// update pendaftaran) -- return true kalau sukses, false kalau
  /// gagal (pesan errornya udah kesimpen di state.error, tinggal
  /// ditampilin lewat SnackBar di UI).
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

  Future<bool> simpanSesi(String jamMulai, String jamSelesaiRencana) {
    return _runAction(() => OperasionalDatasource.simpanSesi(
          jamMulai: jamMulai,
          jamSelesaiRencana: jamSelesaiRencana,
        ));
  }

  Future<bool> bukaSesiSekarang() {
    return _runAction(() => OperasionalDatasource.bukaSesiManual());
  }

  Future<bool> akhiriSesiLebihAwal() {
    return _runAction(() => OperasionalDatasource.akhiriSesiLebihAwal());
  }

  Future<bool> updatePendaftaran({
    required bool isOpen,
    String? jamBuka,
    String? jamTutup,
    String? linkPendaftaran,
  }) {
    return _runAction(() => OperasionalDatasource.updatePendaftaran(
          isOpen: isOpen,
          jamBuka: jamBuka,
          jamTutup: jamTutup,
          linkPendaftaran: linkPendaftaran,
        ));
  }

  Future<bool> updateJadwalHari({
    required String hari,
    required String jamMulai,
    required String jamSelesaiRencana,
    required bool isActive,
  }) {
    return _runAction(() => OperasionalDatasource.updateJadwalMingguan(
          hari: hari,
          jamMulai: jamMulai,
          jamSelesaiRencana: jamSelesaiRencana,
          isActive: isActive,
        ));
  }
}