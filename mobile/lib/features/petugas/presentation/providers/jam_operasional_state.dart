import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/jadwal_mingguan.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class JamOperasionalState {
  final bool isLoading;
  final bool isSaving; // dipisah dari isLoading -- biar aksi tombol
                        // (buka sesi, simpan jadwal, dst) gak nge-trigger
                        // full-page spinner, cukup disable tombolnya aja.
  final String? error;
  final StatusOperasional? status;
  final List<JadwalMingguan> jadwalMingguan;

  JamOperasionalState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.status,
    this.jadwalMingguan = const [],
  });

  factory JamOperasionalState.initial() => JamOperasionalState();

  JamOperasionalState copyWith({
    bool? isLoading,
    bool? isSaving,
    Object? error = _unset,
    Object? status = _unset,
    List<JadwalMingguan>? jadwalMingguan,
  }) {
    return JamOperasionalState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: identical(error, _unset) ? this.error : error as String?,
      status: identical(status, _unset) ? this.status : status as StatusOperasional?,
      jadwalMingguan: jadwalMingguan ?? this.jadwalMingguan,
    );
  }
}