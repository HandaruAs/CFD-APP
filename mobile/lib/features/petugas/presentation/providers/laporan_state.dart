import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class LaporanState {
  /// Jumlah baris per halaman (sama kayak web).
  static const int limit = 20;

  final bool isLoading;
  final String? error;
  final LaporanResponse? laporan;
  final StatsLaporan? stats;
  final List<EventPilihan> pilihanEvent;
  final DateTime startDate;
  final DateTime endDate;
  final String? eventId; // null = semua event
  final String search;
  final int page;
  final DateTime? lastUpdated;

  LaporanState({
    this.isLoading = false,
    this.error,
    this.laporan,
    this.stats,
    this.pilihanEvent = const [],
    required this.startDate,
    required this.endDate,
    this.eventId,
    this.search = '',
    this.page = 1,
    this.lastUpdated,
  });

  factory LaporanState.initial() {
    final now = DateTime.now();
    final hariIni = DateTime(now.year, now.month, now.day);
    return LaporanState(startDate: hariIni, endDate: hariIni);
  }

  int get totalPages {
    final total = laporan?.total ?? 0;
    final p = (total / limit).ceil();
    return p < 1 ? 1 : p;
  }

  bool get sedangHariIni {
    final now = DateTime.now();
    final hariIni = DateTime(now.year, now.month, now.day);
    return startDate == hariIni && endDate == hariIni;
  }

  LaporanState copyWith({
    bool? isLoading,
    Object? error = _unset,
    Object? laporan = _unset,
    Object? stats = _unset,
    List<EventPilihan>? pilihanEvent,
    DateTime? startDate,
    DateTime? endDate,
    Object? eventId = _unset,
    String? search,
    int? page,
    Object? lastUpdated = _unset,
  }) {
    return LaporanState(
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      laporan: identical(laporan, _unset) ? this.laporan : laporan as LaporanResponse?,
      stats: identical(stats, _unset) ? this.stats : stats as StatsLaporan?,
      pilihanEvent: pilihanEvent ?? this.pilihanEvent,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      eventId: identical(eventId, _unset) ? this.eventId : eventId as String?,
      search: search ?? this.search,
      page: page ?? this.page,
      lastUpdated: identical(lastUpdated, _unset) ? this.lastUpdated : lastUpdated as DateTime?,
    );
  }
}