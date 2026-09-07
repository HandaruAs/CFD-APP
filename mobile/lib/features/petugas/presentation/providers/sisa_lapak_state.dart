import 'package:mobile/features/petugas/domain/entities/sisa_lapak.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class SisaLapakState {
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final List<KecamatanData> kecamatanList;
  final List<InstansiData> instansiList;

  SisaLapakState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.kecamatanList = const [],
    this.instansiList = const [],
  });

  factory SisaLapakState.initial() => SisaLapakState();

  SisaLapakState copyWith({
    bool? isLoading,
    bool? isSaving,
    Object? error = _unset,
    List<KecamatanData>? kecamatanList,
    List<InstansiData>? instansiList,
  }) {
    return SisaLapakState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: identical(error, _unset) ? this.error : error as String?,
      kecamatanList: kecamatanList ?? this.kecamatanList,
      instansiList: instansiList ?? this.instansiList,
    );
  }
}