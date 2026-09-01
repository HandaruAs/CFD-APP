import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';

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

  PedagangState({
    this.isLoadingPengajuan = false,
    this.isSubmittingPengajuan = false,
    this.isLoadingCheckout = false,
    this.pengajuan,
    this.checkout,
    this.error,
  });

  factory PedagangState.initial() => PedagangState();

  PedagangState copyWith({
    bool? isLoadingPengajuan,
    bool? isSubmittingPengajuan,
    bool? isLoadingCheckout,
    Object? pengajuan = _unset,
    Object? checkout = _unset,
    Object? error = _unset,
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
    );
  }
}