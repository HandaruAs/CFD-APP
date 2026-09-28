import 'package:mobile/features/superadmin/domain/entities/acak_lapak.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class AcakLapakState {
  final bool isLoading;
  final String? error; 
  final WilayahSaya? saya;
  final List<AcakKecamatan> wilayah;

  final AcakScope? scope;
  final String? kecamatanId;
  final String? jalanId;
  final String? ruasId;

  final bool isSubmitting;
  final String? submitError;
  final GenerateSlotResult? result;

  const AcakLapakState({
    this.isLoading = false,
    this.error,
    this.saya,
    this.wilayah = const [],
    this.scope,
    this.kecamatanId,
    this.jalanId,
    this.ruasId,
    this.isSubmitting = false,
    this.submitError,
    this.result,
  });

  // ------------------------------------------------------ turunan

  List<AcakScope> get scopeBoleh => saya?.scopeBoleh ?? const [];

  /// Kecamatan sudah ditentuin penugasan (petugas kecamatan/jalan).
  bool get kecamatanTerkunci =>
      saya != null && !saya!.bebas && (saya!.kecamatanId != null || saya!.jalanId != null);

  /// Jalan sudah ditentuin penugasan (petugas jalan tanpa kecamatan).
  bool get jalanTerkunci =>
      saya != null && !saya!.bebas && saya!.jalanId != null && saya!.kecamatanId == null;

  List<AcakKecamatan> get kecamatanOpsi {
    final semua = wilayah.where((k) => k.id != null);
    if (!kecamatanTerkunci) return semua.toList();
    return semua.where((k) => k.id == kecamatanId).toList();
  }

  AcakKecamatan? get kecamatanDipilih {
    for (final k in wilayah) {
      if (k.id != null && k.id == kecamatanId) return k;
    }
    return null;
  }

  List<AcakJalan> get jalanOpsi {
    final jalan = kecamatanDipilih?.jalan ?? const <AcakJalan>[];
    if (jalanTerkunci) return jalan.where((j) => j.id == saya!.jalanId).toList();
    return jalan;
  }

  AcakJalan? get jalanDipilih {
    for (final j in jalanOpsi) {
      if (j.id == jalanId) return j;
    }
    return null;
  }

  List<AcakRuas> get ruasOpsi => jalanDipilih?.ruas ?? const [];

  bool get canSubmit {
    if (isSubmitting || scope == null) return false;
    switch (scope!) {
      case AcakScope.kota:
        return true;
      case AcakScope.kecamatan:
        return kecamatanId != null;
      case AcakScope.jalan:
        return kecamatanId != null && jalanId != null;
      case AcakScope.ruas:
        return kecamatanId != null && jalanId != null && ruasId != null;
    }
  }

  /// Teks pratinjau cakupan yang lagi dipilih, buat dialog konfirmasi.
  String get labelCakupan {
    switch (scope) {
      case AcakScope.kota:
        return 'Se-Surabaya';
      case AcakScope.kecamatan:
        return 'Kec. ${kecamatanDipilih?.nama ?? '-'}';
      case AcakScope.jalan:
        return jalanDipilih?.nama ?? '-';
      case AcakScope.ruas:
        final ruas = ruasOpsi.where((r) => r.id == ruasId);
        return 'Ruas ${ruas.isEmpty ? '-' : ruas.first.nama}, ${jalanDipilih?.nama ?? '-'}';
      case null:
        return '-';
    }
  }

  AcakLapakState copyWith({
    bool? isLoading,
    Object? error = _unset,
    Object? saya = _unset,
    List<AcakKecamatan>? wilayah,
    Object? scope = _unset,
    Object? kecamatanId = _unset,
    Object? jalanId = _unset,
    Object? ruasId = _unset,
    bool? isSubmitting,
    Object? submitError = _unset,
    Object? result = _unset,
  }) {
    return AcakLapakState(
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      saya: identical(saya, _unset) ? this.saya : saya as WilayahSaya?,
      wilayah: wilayah ?? this.wilayah,
      scope: identical(scope, _unset) ? this.scope : scope as AcakScope?,
      kecamatanId: identical(kecamatanId, _unset) ? this.kecamatanId : kecamatanId as String?,
      jalanId: identical(jalanId, _unset) ? this.jalanId : jalanId as String?,
      ruasId: identical(ruasId, _unset) ? this.ruasId : ruasId as String?,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      submitError: identical(submitError, _unset) ? this.submitError : submitError as String?,
      result: identical(result, _unset) ? this.result : result as GenerateSlotResult?,
    );
  }
}