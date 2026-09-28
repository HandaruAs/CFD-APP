import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class PetugasDashboardState {
  final bool isLoading;
  final String? error;
  final StatusOperasional? statusOperasional;

  /// Laporan kehadiran hari ini -- sumber kartu Kehadiran, Omset Hari Ini,
  /// dan Pedagang Hari Ini (dulu cuma StatsKehadiran dari /laporan/stats).
  final LaporanResponse? laporan;

  PetugasDashboardState({
    this.isLoading = false,
    this.error,
    this.statusOperasional,
    this.laporan,
  });

  factory PetugasDashboardState.initial() => PetugasDashboardState();

  PetugasDashboardState copyWith({
    bool? isLoading,
    Object? error = _unset,
    Object? statusOperasional = _unset,
    Object? laporan = _unset,
  }) {
    return PetugasDashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      statusOperasional: identical(statusOperasional, _unset)
          ? this.statusOperasional
          : statusOperasional as StatusOperasional?,
      laporan: identical(laporan, _unset) ? this.laporan : laporan as LaporanResponse?,
    );
  }
}