// features/pedagang/domain/entities/lapak_data.dart

/// Hasil GET /api/pedagang/lapak/status -- dicek begitu halaman dibuka
/// buat tau apakah sesi klaim lagi dibuka, dan apakah pedagang ini udah
/// pernah klaim lapak sebelumnya (biar gak nampilin form lagi, langsung
/// tampilin hasil klaimnya).
///
/// CATATAN: class Kecamatan & Jalan (dulu dipakai buat pilihan mode
/// "Se-Surabaya / Kecamatan") udah dihapus -- backend sekarang yang
/// milih lokasi secara acak, pedagang gak milih apa-apa lagi. Sama
/// kayak web (nomer-stand/page.tsx).
class LapakStatus {
  final bool sesiAktif;
  final String? pesanSesi;
  final bool sudahKlaim;
  final String? nomorLapak;
  final String? namaKecamatan;
  final String? namaJalan;

  /// Kosong/null kalau lapaknya dari jalan yang belum dibagi ruas.
  final String? namaRuas;

  LapakStatus({
    required this.sesiAktif,
    this.pesanSesi,
    required this.sudahKlaim,
    this.nomorLapak,
    this.namaKecamatan,
    this.namaJalan,
    this.namaRuas,
  });

  factory LapakStatus.fromJson(Map<String, dynamic> json) {
    return LapakStatus(
      sesiAktif: json['sesi_aktif'] as bool? ?? false,
      pesanSesi: json['pesan_sesi'] as String?,
      sudahKlaim: json['sudah_klaim'] as bool? ?? false,
      nomorLapak: json['nomor_lapak'] as String?,
      namaKecamatan: json['nama_kecamatan'] as String?,
      namaJalan: json['nama_jalan'] as String?,
      namaRuas: json['nama_ruas'] as String?,
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

  /// String kosong kalau jalannya gak punya ruas -- baris "Ruas" di UI
  /// cuma dirender kalau ini gak kosong (sama kayak web).
  final String namaRuas;

  HasilKlaim({
    required this.nomorStand,
    required this.kecamatan,
    required this.namaJalan,
    this.namaRuas = '',
  });
}
