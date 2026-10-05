import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/petugas/data/datasources/scan_remote_datasource.dart';
import 'scan_state.dart';

class ScanNotifier extends StateNotifier<ScanState> {
  ScanNotifier() : super(ScanState.initial()) {
    loadRiwayat();
  }

  /// Dipanggil begitu kamera berhasil membaca 1 QR. Hanya memeriksa --
  /// check-in baru dicatat lewat [checkIn] setelah petugas konfirmasi.
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
      final result = await ScanRemoteDatasource.periksa(qrCode);
      state = state.copyWith(isVerifying: false, result: result);
    } catch (e) {
      state = state.copyWith(
        isVerifying: false,
        error: e.toString(),
        errorCode: e is ApiException ? e.code : null,
      );
    }
  }

  Future<bool> checkIn(String pesertaId) async {
    state = state.copyWith(isCheckingIn: true, error: null, errorCode: null);
    try {
      final hasil = await ScanRemoteDatasource.checkIn(pesertaId);
      state = state.copyWith(isCheckingIn: false, lastCheckIn: hasil, result: null);
      loadRiwayat();
      return true;
    } catch (e) {
      state = state.copyWith(
        isCheckingIn: false,
        error: e.toString(),
        errorCode: e is ApiException ? e.code : null,
      );
      return false;
    }
  }

  /// Check-in yang dicatat petugas ini hari ini. Gagal diam-diam.
  Future<void> loadRiwayat() async {
    state = state.copyWith(isLoadingRiwayat: true);
    try {
      final list = await ScanRemoteDatasource.riwayat();
      state = state.copyWith(isLoadingRiwayat: false, riwayat: list);
    } catch (_) {
      state = state.copyWith(isLoadingRiwayat: false);
    }
  }

  /// Reset hasil pemeriksaan -- dipanggil saat bottom sheet ditutup supaya
  /// kamera siap scan lagi. Riwayat sengaja tidak ikut di-reset.
  void resetResult() {
    state = state.copyWith(result: null, error: null, errorCode: null, lastCheckIn: null);
  }
}