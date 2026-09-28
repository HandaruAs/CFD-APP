import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class JamOperasionalState {
  final bool isLoading;
  final bool isSaving; // dipisah dari isLoading -- biar aksi tombol
                        // (buka sesi, simpan jam, dst) gak nge-trigger
                        // full-page spinner, cukup disable tombolnya aja.
  final String? error;
  final StatusOperasional? status;

  JamOperasionalState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.status,
  });

  factory JamOperasionalState.initial() => JamOperasionalState();

  JamOperasionalState copyWith({
    bool? isLoading,
    bool? isSaving,
    Object? error = _unset,
    Object? status = _unset,
  }) {
    return JamOperasionalState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: identical(error, _unset) ? this.error : error as String?,
      status: identical(status, _unset) ? this.status : status as StatusOperasional?,
    );
  }
}