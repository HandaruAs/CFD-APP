import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';

/// Sentinel internal supaya `copyWith(error: null)` benar-benar
/// mengosongkan nilai, bukan mempertahankan nilai lama.
class _Unset {
  const _Unset();
}

const _unset = _Unset();

class PedagangState {
  // --- data usaha ---
  final bool isLoadingPengajuan;
  final bool isSubmittingPengajuan;
  final PengajuanStatus? pengajuan;
  final String? error;

  // --- event ---
  final bool isLoadingEvent;
  final String? errorEvent;

  /// "lama" | "baru" (dari /api/pedagang/events)
  final String? kategori;
  final List<EventTersedia> events;
  final List<Keikutsertaan> eventSaya;

  // --- checkout ---
  final bool isLoadingCheckout;

  /// Null = belum dimuat ATAU tidak ada event yang perlu di-checkout.
  final CheckoutData? checkout;

  PedagangState({
    this.isLoadingPengajuan = false,
    this.isSubmittingPengajuan = false,
    this.pengajuan,
    this.error,
    this.isLoadingEvent = false,
    this.errorEvent,
    this.kategori,
    this.events = const [],
    this.eventSaya = const [],
    this.isLoadingCheckout = false,
    this.checkout,
  });

  factory PedagangState.initial() => PedagangState();

  PedagangState copyWith({
    bool? isLoadingPengajuan,
    bool? isSubmittingPengajuan,
    Object? pengajuan = _unset,
    Object? error = _unset,
    bool? isLoadingEvent,
    Object? errorEvent = _unset,
    Object? kategori = _unset,
    List<EventTersedia>? events,
    List<Keikutsertaan>? eventSaya,
    bool? isLoadingCheckout,
    Object? checkout = _unset,
  }) {
    return PedagangState(
      isLoadingPengajuan: isLoadingPengajuan ?? this.isLoadingPengajuan,
      isSubmittingPengajuan: isSubmittingPengajuan ?? this.isSubmittingPengajuan,
      pengajuan: identical(pengajuan, _unset) ? this.pengajuan : pengajuan as PengajuanStatus?,
      error: identical(error, _unset) ? this.error : error as String?,
      isLoadingEvent: isLoadingEvent ?? this.isLoadingEvent,
      errorEvent: identical(errorEvent, _unset) ? this.errorEvent : errorEvent as String?,
      kategori: identical(kategori, _unset) ? this.kategori : kategori as String?,
      events: events ?? this.events,
      eventSaya: eventSaya ?? this.eventSaya,
      isLoadingCheckout: isLoadingCheckout ?? this.isLoadingCheckout,
      checkout: identical(checkout, _unset) ? this.checkout : checkout as CheckoutData?,
    );
  }
}