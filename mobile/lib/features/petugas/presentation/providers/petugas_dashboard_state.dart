import 'package:mobile/features/petugas/domain/entities/event_hari_ini.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class PetugasDashboardState {
  final bool isLoading;
  final String? error;

  /// Semua event hari ini. Null = belum pernah berhasil dimuat.
  final List<EventHariIni>? events;

  /// Laporan kehadiran hari ini -- sumber kartu Kehadiran, Omset Hari Ini,
  /// dan Pedagang Hari Ini.
  final LaporanResponse? laporan;

  PetugasDashboardState({
    this.isLoading = false,
    this.error,
    this.events,
    this.laporan,
  });

  factory PetugasDashboardState.initial() => PetugasDashboardState();

  PetugasDashboardState copyWith({
    bool? isLoading,
    Object? error = _unset,
    Object? events = _unset,
    Object? laporan = _unset,
  }) {
    return PetugasDashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      events: identical(events, _unset) ? this.events : events as List<EventHariIni>?,
      laporan: identical(laporan, _unset) ? this.laporan : laporan as LaporanResponse?,
    );
  }
}