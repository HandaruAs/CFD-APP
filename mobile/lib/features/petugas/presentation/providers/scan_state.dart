import 'package:mobile/features/petugas/domain/entities/scan_result.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class ScanState {
  final bool isVerifying; // lagi manggil endpoint /scan abis kamera detect
  final bool isCheckingIn; // lagi manggil endpoint /check-in
  final String? error;

  /// Kode error khusus dari backend (field `code`), mis. "BELUM_CHECKOUT".
  /// Null kalau error-nya biasa.
  final String? errorCode;
  final VerifyQRResult? result; // hasil verifikasi terakhir, ditampilin di bottom sheet
  final CheckInResult? lastCheckIn; // buat kartu sukses setelah check-in

  // --- Riwayat Scan Hari Ini (GET /api/petugas/riwayat-scan) ---
  final bool isLoadingRiwayat;
  final List<RiwayatScanItem> riwayat;

  ScanState({
    this.isVerifying = false,
    this.isCheckingIn = false,
    this.error,
    this.errorCode,
    this.result,
    this.lastCheckIn,
    this.isLoadingRiwayat = false,
    this.riwayat = const [],
  });

  factory ScanState.initial() => ScanState();

  ScanState copyWith({
    bool? isVerifying,
    bool? isCheckingIn,
    Object? error = _unset,
    Object? errorCode = _unset,
    Object? result = _unset,
    Object? lastCheckIn = _unset,
    bool? isLoadingRiwayat,
    List<RiwayatScanItem>? riwayat,
  }) {
    return ScanState(
      isVerifying: isVerifying ?? this.isVerifying,
      isCheckingIn: isCheckingIn ?? this.isCheckingIn,
      error: identical(error, _unset) ? this.error : error as String?,
      errorCode: identical(errorCode, _unset) ? this.errorCode : errorCode as String?,
      result: identical(result, _unset) ? this.result : result as VerifyQRResult?,
      lastCheckIn: identical(lastCheckIn, _unset)
          ? this.lastCheckIn
          : lastCheckIn as CheckInResult?,
      isLoadingRiwayat: isLoadingRiwayat ?? this.isLoadingRiwayat,
      riwayat: riwayat ?? this.riwayat,
    );
  }
}