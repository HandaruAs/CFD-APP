import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/petugas/data/datasources/operasional_datasource.dart';
import 'jam_operasional_state.dart';

class JamOperasionalNotifier extends StateNotifier<JamOperasionalState> {
  JamOperasionalNotifier() : super(JamOperasionalState.initial());

  /// [silent] = refresh di belakang layar (auto-refresh tiap menit, sama
  /// kayak web) -- gak nyalain spinner & gak nimpa layar dengan error
  /// kalau data lama masih ada.
  Future<void> load({bool silent = false}) async {
    if (!silent) state = state.copyWith(isLoading: true, error: null);
    try {
      final status = await OperasionalDatasource.getStatusOperasional();
      state = state.copyWith(isLoading: false, isSaving: false, status: status, error: null);
    } catch (e) {
      if (silent && state.status != null) return;
      state = state.copyWith(isLoading: false, isSaving: false, error: _pesan(e));
    }
  }

  /// Dipakai tiap aksi (buka sesi, akhiri sesi, simpan jam, simpan kode
  /// event). Balikin null kalau sukses, atau pesan error kalau gagal --
  /// UI tinggal nampilin lewat SnackBar.
  Future<String?> _runAction(Future<void> Function() action) async {
    state = state.copyWith(isSaving: true);
    try {
      await action();
      await load(silent: true);
      state = state.copyWith(isSaving: false);
      return null;
    } catch (e) {
      state = state.copyWith(isSaving: false);
      return _pesan(e);
    }
  }

  Future<String?> simpanSesi(String jamMulai, String jamSelesaiRencana) {
    return _runAction(() => OperasionalDatasource.simpanSesi(
          jamMulai: jamMulai,
          jamSelesaiRencana: jamSelesaiRencana,
        ));
  }

  Future<String?> bukaSesiSekarang() {
    return _runAction(OperasionalDatasource.bukaSesiManual);
  }

  Future<String?> akhiriSesiLebihAwal() {
    return _runAction(OperasionalDatasource.akhiriSesiLebihAwal);
  }

  Future<String?> simpanKodeEvent(String kodeEvent) {
    final sekarang = state.status?.pendaftaran;
    if (sekarang == null) return Future.value('Data belum dimuat');
    return _runAction(() => OperasionalDatasource.simpanKodeEvent(
          sekarang: sekarang,
          kodeEvent: kodeEvent,
        ));
  }

  String _pesan(Object e) => e is ApiException ? e.message : e.toString();
}