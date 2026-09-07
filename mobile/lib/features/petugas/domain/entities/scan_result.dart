/// Model buat response POST /api/petugas/scan, POST /api/petugas/check-in,
/// dan GET /api/petugas/riwayat-scan.

class PedagangDetail {
  final String id;
  final String namaUsaha;
  final String pemilik;
  final String inisial;
  final String kategori;
  final String lokasiLapak;
  final String? nik;
  final String? alamat;
  final String? perkiraanHarga;

  PedagangDetail({
    required this.id,
    required this.namaUsaha,
    required this.pemilik,
    required this.inisial,
    required this.kategori,
    required this.lokasiLapak,
    this.nik,
    this.alamat,
    this.perkiraanHarga,
  });

  factory PedagangDetail.fromJson(Map<String, dynamic> json) {
    return PedagangDetail(
      id: json['id'] as String,
      namaUsaha: json['nama_usaha'] as String? ?? '-',
      pemilik: json['pemilik'] as String? ?? '-',
      inisial: json['inisial'] as String? ?? '??',
      kategori: json['kategori'] as String? ?? '-',
      lokasiLapak: json['lokasi_lapak'] as String? ?? '-',
      nik: json['nik'] as String?,
      alamat: json['alamat'] as String?,
      perkiraanHarga: json['perkiraan_harga'] as String?,
    );
  }
}

/// Hasil verifikasi QR (belum nyimpen kehadiran -- itu baru kejadian
/// pas [CheckInResult] dipanggil lewat endpoint check-in terpisah).
class VerifyQRResult {
  final bool valid;
  final String message;
  final PedagangDetail? pedagang;
  final bool sudahCheckIn;
  final DateTime? checkInAt;

  VerifyQRResult({
    required this.valid,
    required this.message,
    this.pedagang,
    this.sudahCheckIn = false,
    this.checkInAt,
  });

  factory VerifyQRResult.fromJson(Map<String, dynamic> json) {
    return VerifyQRResult(
      valid: json['valid'] as bool,
      message: json['message'] as String? ?? '',
      pedagang: json['pedagang'] == null
          ? null
          : PedagangDetail.fromJson(json['pedagang'] as Map<String, dynamic>),
      sudahCheckIn: json['sudah_check_in'] as bool? ?? false,
      checkInAt: json['check_in_at'] == null
          ? null
          : DateTime.parse(json['check_in_at'] as String),
    );
  }
}

class CheckInResult {
  final bool success;
  final String message;
  final DateTime checkInAt;
  final String pedagangId;
  final String namaUsaha;

  CheckInResult({
    required this.success,
    required this.message,
    required this.checkInAt,
    required this.pedagangId,
    required this.namaUsaha,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> json) {
    return CheckInResult(
      success: json['success'] as bool,
      message: json['message'] as String? ?? '',
      checkInAt: DateTime.parse(json['check_in_at'] as String),
      pedagangId: json['pedagang_id'] as String,
      namaUsaha: json['nama_usaha'] as String? ?? '-',
    );
  }
}

class RiwayatScanItem {
  final String waktu;
  final String namaUsaha;
  final String status; // "berhasil" | "gagal"
  final String? pedagangId;

  RiwayatScanItem({
    required this.waktu,
    required this.namaUsaha,
    required this.status,
    this.pedagangId,
  });

  factory RiwayatScanItem.fromJson(Map<String, dynamic> json) {
    return RiwayatScanItem(
      waktu: json['waktu'] as String,
      namaUsaha: json['nama_usaha'] as String? ?? '-',
      status: json['status'] as String? ?? 'berhasil',
      pedagangId: json['pedagang_id'] as String?,
    );
  }
}