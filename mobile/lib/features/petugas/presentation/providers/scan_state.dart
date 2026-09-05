import 'package:mobile/features/petugas/domain/entities/scan_result.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class ScanState {
  final bool isVerifying; // lagi manggil endpoint /scan abis kamera detect
  final bool isCheckingIn; // lagi manggil endpoint /check-in
  final String? error;
  final VerifyQRResult? result; // hasil verifikasi terakhir, ditampilin di bottom sheet
  final CheckInResult? lastCheckIn; // buat kartu sukses setelah check-in

  ScanState({
    this.isVerifying = false,
    this.isCheckingIn = false,
    this.error,
    this.result,
    this.lastCheckIn,
  });

  factory ScanState.initial() => ScanState();

  ScanState copyWith({
    bool? isVerifying,
    bool? isCheckingIn,
    Object? error = _unset,
    Object? result = _unset,
    Object? lastCheckIn = _unset,
  }) {
    return ScanState(
      isVerifying: isVerifying ?? this.isVerifying,
      isCheckingIn: isCheckingIn ?? this.isCheckingIn,
      error: identical(error, _unset) ? this.error : error as String?,
      result: identical(result, _unset) ? this.result : result as VerifyQRResult?,
      lastCheckIn: identical(lastCheckIn, _unset)
          ? this.lastCheckIn
          : lastCheckIn as CheckInResult?,
    );
  }
}