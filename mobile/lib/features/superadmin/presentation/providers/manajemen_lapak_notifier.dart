import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/superadmin/data/datasources/manajemen_lapak_datasource.dart';
import 'manajemen_lapak_state.dart';

class ManajemenLapakNotifier extends StateNotifier<ManajemenLapakState> {
  ManajemenLapakNotifier() : super(ManajemenLapakState.initial());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final wilayah = await ManajemenLapakDatasource.getWilayah();

      // Pertahankan kecamatan/jalan yang lagi dipilih kalau masih ada di
      // data baru (mis. sesudah tambah/edit/hapus ruas) -- jangan reset
      // ke awal tiap reload, biar user gak keluar dari konteks yang lagi
      // dikerjain. Kalau baru pertama kali load, auto-pilih yang pertama
      // biar user langsung liat isinya, gak perlu 2x tap.
      final draft = state.copyWith(wilayah: wilayah);
      String? kecKey = draft.kecamatanDipilih != null
          ? draft.kecamatanKey
          : (wilayah.isEmpty ? null : ManajemenLapakState.keyOf(wilayah.first, 0));
      final kecOpsi = draft.kecamatanOpsi;
      final kecTerpilih = kecOpsi.where((e) => e.key == kecKey);
      final jalanList = kecTerpilih.isEmpty ? const [] : kecTerpilih.first.value.jalan;
      final jalanMasihAda = jalanList.any((j) => j.id == state.jalanId);
      final jalanId = jalanMasihAda
          ? state.jalanId
          : (jalanList.isEmpty ? null : jalanList.first.id);

      state = state.copyWith(
        isLoading: false,
        wilayah: wilayah,
        kecamatanKey: kecKey,
        jalanId: jalanId,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setKecamatan(String? key) {
    if (key == state.kecamatanKey) return;
    state = state.copyWith(kecamatanKey: key, jalanId: null);
    // Auto-pilih jalan pertama di kecamatan baru biar gak nampilin
    // layar kosong nunggu user milih lagi.
    final jalan = state.jalanOpsi;
    if (jalan.isNotEmpty) {
      state = state.copyWith(jalanId: jalan.first.id);
    }
  }

  void setJalan(String? id) {
    state = state.copyWith(jalanId: id);
  }

  /// Dipakai internal sesudah create/update/delete -- reload biar
  /// nomorMulai/nomorSelesai/terisi ke-refresh ngikutin hitungan terbaru
  /// dari backend (dua-duanya dihitung server, bukan disimpan lokal).
  Future<bool> _runAction(Future<void> Function() action) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      await action();
      await load();
      state = state.copyWith(isSaving: false);
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<bool> createRuas({
    required String jalanId,
    required String namaRuas,
    required int kuota,
  }) {
    return _runAction(() => ManajemenLapakDatasource.createRuas(
          jalanId: jalanId,
          namaRuas: namaRuas,
          kuota: kuota,
        ));
  }

  Future<bool> updateRuas({
    required String id,
    required String namaRuas,
    required int kuota,
  }) {
    return _runAction(() => ManajemenLapakDatasource.updateRuas(
          id: id,
          namaRuas: namaRuas,
          kuota: kuota,
        ));
  }

  Future<bool> deleteRuas(String id) {
    return _runAction(() => ManajemenLapakDatasource.deleteRuas(id));
  }

  // -------------------------------------------------------- Kecamatan

  Future<bool> createKecamatan(String namaKecamatan) {
    return _runAction(() => ManajemenLapakDatasource.createKecamatan(namaKecamatan));
  }

  Future<bool> deleteKecamatan(String id) {
    // Kecamatan yang lagi dipilih dihapus -> load() otomatis jatuh ke
    // kecamatan pertama yang tersisa (lihat logika di load()).
    return _runAction(() => ManajemenLapakDatasource.deleteKecamatan(id));
  }

  // ------------------------------------------------------------ Jalan

  Future<bool> createJalan({
    required String kecamatanId,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) {
    return _runAction(() => ManajemenLapakDatasource.createJalan(
          kecamatanId: kecamatanId,
          kodeJalan: kodeJalan,
          namaJalan: namaJalan,
          kapasitas: kapasitas,
        ));
  }

  Future<bool> updateJalan({
    required String id,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) {
    return _runAction(() => ManajemenLapakDatasource.updateJalan(
          id: id,
          kodeJalan: kodeJalan,
          namaJalan: namaJalan,
          kapasitas: kapasitas,
        ));
  }

  Future<bool> deleteJalan(String id) {
    return _runAction(() => ManajemenLapakDatasource.deleteJalan(id));
  }
}