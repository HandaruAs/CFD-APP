/// Merepresentasikan data dari tabel pedagang_profiles di backend.
/// Field nullable ditandai `?` karena pedagang yang belum pernah
/// mengajukan usaha (belum submit AjukanUsaha) bisa saja belum
/// punya data ini sama sekali (GET /api/pedagang/pengajuan bisa
/// mengembalikan null lewat flag `has_pengajuan: false`).
class PengajuanStatus {
  final String id;
  final String nik;
  final String? namaLengkap;
  final String? tanggalLahir;
  final String namaUsaha;
  final String jenisDagangan;
  final String? jenisLapak;
  final String? perkiraanHarga;
  final String? alamat;
  final String? catatan;

  /// Status verifikasi dari petugas/superadmin: "pending" | "approved" |
  /// "rejected". Dipakai buat halaman Status Verifikasi (step 5) nampilin
  /// badge yang sesuai.
  final String status;

  PengajuanStatus({
    required this.id,
    required this.nik,
    this.namaLengkap,
    this.tanggalLahir,
    required this.namaUsaha,
    required this.jenisDagangan,
    this.jenisLapak,
    this.perkiraanHarga,
    this.alamat,
    this.catatan,
    required this.status,
  });

  factory PengajuanStatus.fromJson(Map<String, dynamic> json) {
    return PengajuanStatus(
      id: json['id'] as String,
      nik: json['nik'] as String,
      namaLengkap: json['nama_lengkap'] as String?,
      tanggalLahir: json['tanggal_lahir'] as String?,
      namaUsaha: json['nama_usaha'] as String,
      jenisDagangan: json['jenis_dagangan'] as String,
      jenisLapak: json['jenis_lapak'] as String?,
      perkiraanHarga: json['perkiraan_harga'] as String?,
      alamat: json['alamat'] as String?,
      catatan: json['catatan'] as String?,
      status: json['status'] as String? ?? 'pending',
    );
  }
}