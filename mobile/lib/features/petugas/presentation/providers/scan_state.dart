import 'package:mobile/features/petugas/domain/entities/scan_result.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class ScanState {
  final bool isVerifying; // lagi memeriksa QR abis kamera detect
  final bool isCheckingIn; // lagi mencatat check-in
  final String? error;

  /// Kode error khusus dari backend (field `code`), mis. "BELUM_CHECKOUT",
  /// "PILIH_KARTU_EVENT". Null kalau error-nya biasa.
  final String? errorCode;

  /// Hasil pemeriksaan QR terakhir, ditampilkan di bottom sheet.
  final PesertaScan? result;

  /// Diisi setelah check-in berhasil (kartu sukses).
  final PesertaScan? lastCheckIn;

  // --- Riwayat check-in hari ini ---
  final bool isLoadingRiwayat;
  final List<RiwayatCheckIn> riwayat;

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
    List<RiwayatCheckIn>? riwayat,
  }) {
    return ScanState(
      isVerifying: isVerifying ?? this.isVerifying,
      isCheckingIn: isCheckingIn ?? this.isCheckingIn,
      error: identical(error, _unset) ? this.error : error as String?,
      errorCode: identical(errorCode, _unset) ? this.errorCode : errorCode as String?,
      result: identical(result, _unset) ? this.result : result as PesertaScan?,
      lastCheckIn: identical(lastCheckIn, _unset) ? this.lastCheckIn : lastCheckIn as PesertaScan?,
      isLoadingRiwayat: isLoadingRiwayat ?? this.isLoadingRiwayat,
      riwayat: riwayat ?? this.riwayat,
    );
  }
}