import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/stats_kehadiran.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class PetugasDashboardState {
  final bool isLoading;
  final String? error;
  final StatusOperasional? statusOperasional;
  final StatsKehadiran? stats;

  PetugasDashboardState({
    this.isLoading = false,
    this.error,
    this.statusOperasional,
    this.stats,
  });

  factory PetugasDashboardState.initial() => PetugasDashboardState();

  PetugasDashboardState copyWith({
    bool? isLoading,
    Object? error = _unset,
    Object? statusOperasional = _unset,
    Object? stats = _unset,
  }) {
    return PetugasDashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      statusOperasional: identical(statusOperasional, _unset)
          ? this.statusOperasional
          : statusOperasional as StatusOperasional?,
      stats: identical(stats, _unset) ? this.stats : stats as StatsKehadiran?,
    );
  }
}