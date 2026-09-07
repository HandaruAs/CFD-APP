import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class LaporanState {
  final bool isLoading; // load awal / ganti filter
  final bool isLoadingMore; // load halaman berikutnya (infinite scroll)
  final String? error;
  final LaporanResponse? laporan;
  final DateTime? startDate;
  final DateTime? endDate;
  final String search;

  LaporanState({
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.laporan,
    this.startDate,
    this.endDate,
    this.search = '',
  });

  factory LaporanState.initial() {
    final today = DateTime.now();
    final dateOnly = DateTime(today.year, today.month, today.day);
    return LaporanState(startDate: dateOnly, endDate: dateOnly);
  }

  LaporanState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    Object? error = _unset,
    Object? laporan = _unset,
    Object? startDate = _unset,
    Object? endDate = _unset,
    String? search,
  }) {
    return LaporanState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: identical(error, _unset) ? this.error : error as String?,
      laporan: identical(laporan, _unset) ? this.laporan : laporan as LaporanResponse?,
      startDate: identical(startDate, _unset) ? this.startDate : startDate as DateTime?,
      endDate: identical(endDate, _unset) ? this.endDate : endDate as DateTime?,
      search: search ?? this.search,
    );
  }
}