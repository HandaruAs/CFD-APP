import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class ManajemenLapakState {
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final List<KecamatanLengkap> wilayah;

  /// Kecamatan & jalan yang lagi dipilih user, buat drill-down 2 langkah
  /// sebelum nampilin daftar ruas -- daripada nge-list semua sekaligus
  /// kayak tabel desktop yang kepanjangan buat layar HP.
  final String? kecamatanKey;
  final String? jalanId;

  ManajemenLapakState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.wilayah = const [],
    this.kecamatanKey,
    this.jalanId,
  });

  factory ManajemenLapakState.initial() => ManajemenLapakState();

  /// Key unik per kecamatan buat dropdown -- kecamatan.id bisa null
  /// (jalan yang belum dikelompokkan), jadi pakai index sebagai fallback.
  static String keyOf(KecamatanLengkap k, int index) => k.id ?? '#$index';

  List<MapEntry<String, KecamatanLengkap>> get kecamatanOpsi => [
        for (var i = 0; i < wilayah.length; i++) MapEntry(keyOf(wilayah[i], i), wilayah[i]),
      ];

  KecamatanLengkap? get kecamatanDipilih {
    for (final e in kecamatanOpsi) {
      if (e.key == kecamatanKey) return e.value;
    }
    return null;
  }

  List<JalanLengkap> get jalanOpsi => kecamatanDipilih?.jalan ?? const [];

  JalanLengkap? get jalanDipilih {
    for (final j in jalanOpsi) {
      if (j.id == jalanId) return j;
    }
    return null;
  }

  List<RuasLengkap> get ruasList => jalanDipilih?.ruas ?? const [];

  /// Bucket "jalan tanpa kecamatan" (kecamatanId null) gak bisa dipakai
  /// buat tambah jalan baru (backend wajib kecamatanId) atau dihapus
  /// (bukan baris asli di master_instansi, cuma pengelompokan kosong).
  bool get kecamatanBisaDihapus => kecamatanDipilih?.id != null;
  bool get bisaTambahJalan => kecamatanDipilih?.id != null;

  ManajemenLapakState copyWith({
    bool? isLoading,
    bool? isSaving,
    Object? error = _unset,
    List<KecamatanLengkap>? wilayah,
    Object? kecamatanKey = _unset,
    Object? jalanId = _unset,
  }) {
    return ManajemenLapakState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: identical(error, _unset) ? this.error : error as String?,
      wilayah: wilayah ?? this.wilayah,
      kecamatanKey: identical(kecamatanKey, _unset) ? this.kecamatanKey : kecamatanKey as String?,
      jalanId: identical(jalanId, _unset) ? this.jalanId : jalanId as String?,
    );
  }
}