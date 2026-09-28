/// Cakupan acak lapak. [slug] = nilai `scope` yang dikirim ke backend.
enum AcakScope {
  kota('kota', 'Se-Surabaya'),
  kecamatan('kecamatan', 'Kecamatan'),
  jalan('jalan', 'Jalan'),
  ruas('ruas', 'Ruas');

  const AcakScope(this.slug, this.label);

  final String slug;
  final String label;
}

String? _str(dynamic v) {
  if (v is! String) return null;
  final s = v.trim();
  return s.isEmpty ? null : s;
}

/// Wilayah tanggung jawab user yang lagi login
/// (GET /api/petugas/wilayah-saya). [bebas] = kecamatan & jalan
/// dua-duanya kosong -> boleh acak di wilayah manapun (superadmin dan
/// petugas tanpa penugasan wilayah).
class WilayahSaya {
  final String? kecamatanId;
  final String? kecamatanNama;
  final String? jalanId;
  final String? jalanNama;
  final bool bebas;

  const WilayahSaya({
    this.kecamatanId,
    this.kecamatanNama,
    this.jalanId,
    this.jalanNama,
    required this.bebas,
  });

  factory WilayahSaya.fromJson(Map<String, dynamic> json) {
    final kecId = _str(json['kecamatanId']);
    final jlnId = _str(json['jalanId']);
    return WilayahSaya(
      kecamatanId: kecId,
      kecamatanNama: _str(json['kecamatanNama']),
      jalanId: jlnId,
      jalanNama: _str(json['jalanNama']),
      bebas: json['bebas'] is bool ? json['bebas'] as bool : (kecId == null && jlnId == null),
    );
  }

  /// Cakupan yang boleh dipilih -- mirror cekBerhakGenerateSlot di backend:
  /// kota cuma buat yang bebas, kecamatan cuma kalau punya kecamatan,
  /// jalan/ruas kalau punya kecamatan atau jalan.
  List<AcakScope> get scopeBoleh {
    if (bebas) return AcakScope.values;
    return [
      if (kecamatanId != null) AcakScope.kecamatan,
      if (kecamatanId != null || jalanId != null) ...[AcakScope.jalan, AcakScope.ruas],
    ];
  }
}

class AcakRuas {
  final String id;
  final String nama;
  final int kuota;

  const AcakRuas({required this.id, required this.nama, required this.kuota});

  factory AcakRuas.fromJson(Map<String, dynamic> json) => AcakRuas(
        id: json['id']?.toString() ?? '',
        nama: (json['namaRuas'] as String?) ?? '-',
        kuota: (json['kuota'] as num?)?.toInt() ?? 0,
      );
}

class AcakJalan {
  final String id;
  final String nama;
  final List<AcakRuas> ruas;

  const AcakJalan({required this.id, required this.nama, required this.ruas});

  factory AcakJalan.fromJson(Map<String, dynamic> json) {
    final raw = json['ruas'];
    return AcakJalan(
      id: json['id']?.toString() ?? '',
      nama: (json['namaJalan'] as String?) ?? '-',
      ruas: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(AcakRuas.fromJson).toList()
          : const [],
    );
  }
}

class AcakKecamatan {
  /// null = jalan yang belum dikelompokkan ke kecamatan manapun (gak bisa
  /// dipilih sebagai cakupan kecamatan).
  final String? id;
  final String nama;
  final List<AcakJalan> jalan;

  const AcakKecamatan({this.id, required this.nama, required this.jalan});

  factory AcakKecamatan.fromJson(Map<String, dynamic> json) {
    final raw = json['jalan'];
    return AcakKecamatan(
      id: _str(json['kecamatanId']),
      nama: (json['kecamatan'] as String?) ?? '-',
      jalan: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(AcakJalan.fromJson).toList()
          : const [],
    );
  }
}

/// Ringkasan hasil acak (data di response POST generate-slot).
class GenerateSlotResult {
  final String scopeLabel;
  final int jumlahJalan;
  final int jumlahRuas;
  final int slotDibuat;
  final int slotDihapus;
  final int slotAda;

  const GenerateSlotResult({
    required this.scopeLabel,
    required this.jumlahJalan,
    required this.jumlahRuas,
    required this.slotDibuat,
    required this.slotDihapus,
    required this.slotAda,
  });

  factory GenerateSlotResult.fromJson(Map<String, dynamic> json) => GenerateSlotResult(
        scopeLabel: (json['scopeLabel'] as String?) ?? '-',
        jumlahJalan: (json['jumlahJalan'] as num?)?.toInt() ?? 0,
        jumlahRuas: (json['jumlahRuas'] as num?)?.toInt() ?? 0,
        slotDibuat: (json['jumlahSlotDibuat'] as num?)?.toInt() ?? 0,
        slotDihapus: (json['jumlahSlotDihapus'] as num?)?.toInt() ?? 0,
        slotAda: (json['jumlahSlotAda'] as num?)?.toInt() ?? 0,
      );
}