import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/scan_remote_datasource.dart';
import 'scan_state.dart';

class ScanNotifier extends StateNotifier<ScanState> {
  ScanNotifier() : super(ScanState.initial());

  /// Dipanggil begitu kamera berhasil detect 1 kode QR. [qrCode] adalah
  /// ID pedagang mentah dari hasil scan.
  Future<void> verify(String qrCode) async {
    if (state.isVerifying) return; // cegah double-fire dari kamera
    state = state.copyWith(isVerifying: true, error: null, result: null, lastCheckIn: null);
    try {
      final result = await ScanRemoteDatasource.verifyQr(qrCode);
      state = state.copyWith(isVerifying: false, result: result);
    } catch (e) {
      state = state.copyWith(isVerifying: false, error: e.toString());
    }
  }

  Future<bool> checkIn({required String pedagangId, String? catatan}) async {
    state = state.copyWith(isCheckingIn: true, error: null);
    try {
      final result = await ScanRemoteDatasource.checkIn(
        pedagangId: pedagangId,
        catatan: catatan,
      );
      state = state.copyWith(isCheckingIn: false, lastCheckIn: result, result: null);
      return true;
    } catch (e) {
      state = state.copyWith(isCheckingIn: false, error: e.toString());
      return false;
    }
  }

  /// Reset hasil verifikasi -- dipanggil pas bottom sheet ditutup biar
  /// kamera siap scan lagi dari nol.
  void resetResult() {
    state = state.copyWith(result: null, error: null, lastCheckIn: null);
  }
}