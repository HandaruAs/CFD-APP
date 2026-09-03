// features/pedagang/domain/entities/lapak_data.dart

/// Satu kecamatan yang bisa dipilih pedagang sebagai lokasi lapak.
class Kecamatan {
  final String id;
  final String nama;

  Kecamatan({required this.id, required this.nama});

  factory Kecamatan.fromJson(Map<String, dynamic> json) {
    return Kecamatan(
      id: json['id'] as String,
      nama: json['nama'] as String? ?? '',
    );
  }
}

/// Satu ruas jalan di kecamatan terpilih, lengkap dengan info kapasitas
/// & sisa slot. Mirror dari interface `Jalan` di
/// web/app/pedagang/nomer-stand/page.tsx.
class Jalan {
  final String id;
  final String namaJalan;
  final int kapasitas;
  final int terisi;
  final int sisa;
  final bool penuh;

  Jalan({
    required this.id,
    required this.namaJalan,
    required this.kapasitas,
    required this.terisi,
    required this.sisa,
    required this.penuh,
  });

  factory Jalan.fromJson(Map<String, dynamic> json) {
    return Jalan(
      id: json['id'] as String,
      namaJalan: json['namaJalan'] as String? ?? '',
      kapasitas: json['kapasitas'] as int? ?? 0,
      terisi: json['terisi'] as int? ?? 0,
      sisa: json['sisa'] as int? ?? 0,
      penuh: json['penuh'] as bool? ?? false,
    );
  }
}

/// Hasil GET /api/pedagang/lapak/status -- dicek begitu halaman dibuka
/// buat tau apakah sesi klaim lagi dibuka petugas, dan apakah pedagang
/// ini udah pernah klaim lapak sebelumnya (biar gak nampilin form lagi,
/// langsung tampilin hasil klaimnya).
class LapakStatus {
  final bool sesiAktif;
  final String? pesanSesi;
  final bool sudahKlaim;
  final String? nomorLapak;
  final String? namaKecamatan;
  final String? namaJalan;

  LapakStatus({
    required this.sesiAktif,
    this.pesanSesi,
    required this.sudahKlaim,
    this.nomorLapak,
    this.namaKecamatan,
    this.namaJalan,
  });

  factory LapakStatus.fromJson(Map<String, dynamic> json) {
    return LapakStatus(
      sesiAktif: json['sesi_aktif'] as bool? ?? false,
      pesanSesi: json['pesan_sesi'] as String?,
      sudahKlaim: json['sudah_klaim'] as bool? ?? false,
      nomorLapak: json['nomor_lapak'] as String?,
      namaKecamatan: json['nama_kecamatan'] as String?,
      namaJalan: json['nama_jalan'] as String?,
    );
  }
}

/// Hasil sukses klaim lapak (dari POST .../klaim ATAU dibangun ulang
/// dari GET .../status kalau pedagang ternyata udah pernah klaim
/// sebelumnya). Ini yang ditampilin di kartu "Alokasi Stan Dikonfirmasi".
class HasilKlaim {
  final String nomorStand;
  final String kecamatan;
  final String namaJalan;

  HasilKlaim({
    required this.nomorStand,
    required this.kecamatan,
    required this.namaJalan,
  });
}