/// Entities buat fitur Manajemen Lapak (superadmin) -- checklist #1, #3
/// di backend: wilayah lengkap kecamatan -> jalan -> ruas, dipakai buat
/// halaman "Ruas & Kuota". Sumbernya GET /api/admin/wilayah, response-nya
/// { data: [ RuasLengkap... ] } persis sama struktur JSON kayak yang
/// backend expose di entity.KecamatanLengkapData / JalanLengkapData /
/// RuasData (lihat manajemen-lapak/entity/manajemen_lapak.go).

String _str(dynamic v) => v?.toString() ?? '-';

String? _strN(dynamic v) {
  if (v is! String) return null;
  final s = v.trim();
  return s.isEmpty ? null : s;
}

int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

/// Satu ruas di dalam 1 jalan. NomorMulai/NomorSelesai/TerisiLama/
/// TerisiBaru read-only (dihitung backend) -- gak ada makna diedit
/// manual dari sini.
class RuasLengkap {
  final String id;
  final String namaRuas;
  final int urutan;
  final int nomorMulai;
  final int nomorSelesai;
  final int kuota;
  final int terisiLama;
  final int terisiBaru;

  const RuasLengkap({
    required this.id,
    required this.namaRuas,
    required this.urutan,
    required this.nomorMulai,
    required this.nomorSelesai,
    required this.kuota,
    required this.terisiLama,
    required this.terisiBaru,
  });

  int get terisi => terisiLama + terisiBaru;
  int get sisa => (kuota - terisi).clamp(0, kuota);

  factory RuasLengkap.fromJson(Map<String, dynamic> json) => RuasLengkap(
        id: _str(json['id']),
        namaRuas: _str(json['namaRuas']),
        urutan: _int(json['urutan']),
        nomorMulai: _int(json['nomorMulai']),
        nomorSelesai: _int(json['nomorSelesai']),
        kuota: _int(json['kuota']),
        terisiLama: _int(json['terisiLama']),
        terisiBaru: _int(json['terisiBaru']),
      );
}

/// 1 jalan, berisi daftar ruas-nya. Kapasitas = kuota dasar jalan;
/// KuotaEvent = kuota yang dialokasikan ke event yang lagi aktif (0
/// kalau jalan ini gak ikut event aktif) -- dua-duanya read-only di
/// halaman Ruas & Kuota, cuma ditampilkan buat konteks.
class JalanLengkap {
  final String id;
  final String kodeJalan;
  final String namaJalan;
  final int kapasitas;
  final int kuotaEvent;
  final int terisi;
  final List<RuasLengkap> ruas;

  const JalanLengkap({
    required this.id,
    required this.kodeJalan,
    required this.namaJalan,
    required this.kapasitas,
    required this.kuotaEvent,
    required this.terisi,
    required this.ruas,
  });

  /// Total kuota semua ruas yang sudah dibagi di jalan ini.
  int get totalKuotaRuas => ruas.fold(0, (sum, r) => sum + r.kuota);

  factory JalanLengkap.fromJson(Map<String, dynamic> json) {
    final raw = json['ruas'];
    return JalanLengkap(
      id: _str(json['id']),
      kodeJalan: _str(json['kodeJalan']),
      namaJalan: _str(json['namaJalan']),
      kapasitas: _int(json['kapasitas']),
      kuotaEvent: _int(json['kuotaEvent']),
      terisi: _int(json['terisi']),
      ruas: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(RuasLengkap.fromJson).toList()
          : const [],
    );
  }
}

/// 1 kecamatan, berisi daftar jalan-nya. id null = jalan yang belum
/// dikelompokkan ke kecamatan manapun.
class KecamatanLengkap {
  final String? id;
  final String nama;
  final List<JalanLengkap> jalan;

  const KecamatanLengkap({this.id, required this.nama, required this.jalan});

  factory KecamatanLengkap.fromJson(Map<String, dynamic> json) {
    final raw = json['jalan'];
    return KecamatanLengkap(
      id: _strN(json['kecamatanId']),
      nama: _str(json['kecamatan']),
      jalan: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(JalanLengkap.fromJson).toList()
          : const [],
    );
  }
}