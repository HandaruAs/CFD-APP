import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';
import 'package:mobile/features/pedagang/domain/entities/lapak_data.dart';

/// Sentinel internal, sama persis alasannya kayak di AuthState -- biar
/// `copyWith(error: null)` beneran bisa ngosongin error, bukan malah
/// dipertahankan ke nilai lama.
class _Unset {
  const _Unset();
}

const _unset = _Unset();

class PedagangState {
  final bool isLoadingPengajuan;
  final bool isSubmittingPengajuan;
  final bool isLoadingCheckout;
  final PengajuanStatus? pengajuan;
  final CheckoutData? checkout;
  final String? error;

  // --- Modul Lapak (klaim nomor stand) ---
  final bool isLoadingLapakStatus;
  final LapakStatus? lapakStatus;
  final bool isClaiming;
  final HasilKlaim? hasilKlaim;

  PedagangState({
    this.isLoadingPengajuan = false,
    this.isSubmittingPengajuan = false,
    this.isLoadingCheckout = false,
    this.pengajuan,
    this.checkout,
    this.error,
    this.isLoadingLapakStatus = false,
    this.lapakStatus,
    this.isClaiming = false,
    this.hasilKlaim,
  });

  factory PedagangState.initial() => PedagangState();

  PedagangState copyWith({
    bool? isLoadingPengajuan,
    bool? isSubmittingPengajuan,
    bool? isLoadingCheckout,
    Object? pengajuan = _unset,
    Object? checkout = _unset,
    Object? error = _unset,
    bool? isLoadingLapakStatus,
    Object? lapakStatus = _unset,
    bool? isClaiming,
    Object? hasilKlaim = _unset,
  }) {
    return PedagangState(
      isLoadingPengajuan: isLoadingPengajuan ?? this.isLoadingPengajuan,
      isSubmittingPengajuan: isSubmittingPengajuan ?? this.isSubmittingPengajuan,
      isLoadingCheckout: isLoadingCheckout ?? this.isLoadingCheckout,
      pengajuan:
          identical(pengajuan, _unset) ? this.pengajuan : pengajuan as PengajuanStatus?,
      checkout:
          identical(checkout, _unset) ? this.checkout : checkout as CheckoutData?,
      error: identical(error, _unset) ? this.error : error as String?,
      isLoadingLapakStatus: isLoadingLapakStatus ?? this.isLoadingLapakStatus,
      lapakStatus:
          identical(lapakStatus, _unset) ? this.lapakStatus : lapakStatus as LapakStatus?,
      isClaiming: isClaiming ?? this.isClaiming,
      hasilKlaim:
          identical(hasilKlaim, _unset) ? this.hasilKlaim : hasilKlaim as HasilKlaim?,
    );
  }
}
