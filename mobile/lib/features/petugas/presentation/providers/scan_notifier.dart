import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/petugas/data/datasources/scan_remote_datasource.dart';
import 'scan_state.dart';

class ScanNotifier extends StateNotifier<ScanState> {
  ScanNotifier() : super(ScanState.initial());

  /// Dipanggil begitu kamera berhasil detect 1 kode QR, ATAU petugas
  /// ngetik kode manual. [qrCode] adalah ID pedagang mentah.
  Future<void> verify(String qrCode) async {
    if (state.isVerifying) return; // cegah double-fire dari kamera
    state = state.copyWith(
      isVerifying: true,
      error: null,
      errorCode: null,
      result: null,
      lastCheckIn: null,
    );
    try {
      final result = await ScanRemoteDatasource.verifyQr(qrCode);
      state = state.copyWith(isVerifying: false, result: result);
    } catch (e) {
      state = state.copyWith(
        isVerifying: false,
        error: e.toString(),
        errorCode: e is ApiException ? e.code : null,
      );
    }
  }

  Future<bool> checkIn({required String pedagangId, String? catatan}) async {
    state = state.copyWith(isCheckingIn: true, error: null, errorCode: null);
    try {
      final result = await ScanRemoteDatasource.checkIn(
        pedagangId: pedagangId,
        catatan: catatan,
      );
      state = state.copyWith(isCheckingIn: false, lastCheckIn: result, result: null);
      // Riwayat langsung di-update biar pedagang yang barusan masuk kelihatan.
      loadRiwayat();
      return true;
    } catch (e) {
      state = state.copyWith(
        isCheckingIn: false,
        error: e.toString(),
        // "BELUM_CHECKOUT" -> UI nampilin penjelasan khusus, bukan error biasa.
        errorCode: e is ApiException ? e.code : null,
      );
      return false;
    }
  }

  /// GET /api/petugas/riwayat-scan -- check-in yang dicatat petugas ini
  /// hari ini. Gagal diam-diam (cukup gak ke-update), sama kayak web.
  Future<void> loadRiwayat() async {
    state = state.copyWith(isLoadingRiwayat: true);
    try {
      final list = await ScanRemoteDatasource.getRiwayatScan();
      state = state.copyWith(isLoadingRiwayat: false, riwayat: list);
    } catch (_) {
      state = state.copyWith(isLoadingRiwayat: false);
    }
  }

  /// Reset hasil verifikasi -- dipanggil pas bottom sheet ditutup biar
  /// kamera siap scan lagi dari nol. Riwayat sengaja gak ikut di-reset.
  void resetResult() {
    state = state.copyWith(result: null, error: null, errorCode: null, lastCheckIn: null);
  }
}