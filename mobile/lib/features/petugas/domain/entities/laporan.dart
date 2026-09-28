class KehadiranItem {
  final String id;
  final String pedagangId;
  final String namaUsaha;
  final String pemilik;
  final String inisial;
  final String kategori;
  final String lokasiLapak;
  final String waktuCheckin; 
  final String? waktuCheckout;
  final int? omset;
  final String metode;
  final String status;
  
  KehadiranItem({
    required this.id,
    required this.pedagangId,
    required this.namaUsaha,
    required this.pemilik,
    required this.inisial,
    required this.kategori,
    required this.lokasiLapak,
    required this.waktuCheckin,
    this.waktuCheckout,
    this.omset,
    required this.metode,
    required this.status,
  });

  factory KehadiranItem.fromJson(Map<String, dynamic> json) {
    return KehadiranItem(
      id: json['id'] as String,
      pedagangId: json['pedagangId'] as String,
      namaUsaha: json['namaUsaha'] as String? ?? '-',
      pemilik: json['pemilik'] as String? ?? '-',
      inisial: json['inisial'] as String? ?? '??',
      kategori: json['kategori'] as String? ?? '-',
      lokasiLapak: json['lokasiLapak'] as String? ?? '-',
      waktuCheckin: json['waktuCheckin'] as String? ?? '-',
      waktuCheckout: json['waktuCheckout'] as String?,
      omset: json['omset'] == null ? null : (json['omset'] as num).toInt(),
      metode: json['metode'] as String? ?? '-',
      status: json['status'] as String? ?? 'belum-hadir',
    );
  }
}

class LaporanResponse {
  final int totalTerdaftar;
  final int totalCheckin;
  final int totalCheckout;
  final int totalOmset;
  final int rataOmset;
  final double persenHadir;
  final List<KehadiranItem> data;
  final int page;
  final int limit;
  final int total;

  LaporanResponse({
    required this.totalTerdaftar,
    required this.totalCheckin,
    required this.totalCheckout,
    required this.totalOmset,
    required this.rataOmset,
    required this.persenHadir,
    required this.data,
    required this.page,
    required this.limit,
    required this.total,
  });

  bool get hasNextPage => page * limit < total;

  factory LaporanResponse.fromJson(Map<String, dynamic> json) {
    return LaporanResponse(
      totalTerdaftar: json['totalTerdaftar'] as int,
      totalCheckin: json['totalCheckin'] as int,
      totalCheckout: json['totalCheckout'] as int,
      totalOmset: (json['totalOmset'] as num).toInt(),
      rataOmset: (json['rataOmset'] as num).toInt(),
      persenHadir: (json['persenHadir'] as num).toDouble(),
      data: (json['data'] as List<dynamic>? ?? [])
          .map((e) => KehadiranItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: json['page'] as int,
      limit: json['limit'] as int,
      total: json['total'] as int,
    );
  }
}

/// Response GET /api/petugas/laporan/:id -- detail 1 baris kehadiran.
/// NIK & email udah disensor dari backend.
class DetailKehadiran {
  // kehadiran
  final String id;
  final String tanggal;
  final String namaSesi;
  final String waktuCheckin;
  final String? waktuCheckout;
  final int? omset;
  final String status;
  final String dicatatOleh;
  // lokasi
  final String namaJalan;
  final String kecamatan;
  final String nomorLapak;
  final String lokasiLapak;
  // usaha
  final String namaUsaha;
  final String jenisDagangan;
  final String jenisLapak;
  // pribadi
  final String namaLengkap;
  final String nik;
  final String email;
  final String tanggalLahir;
  final String statusPedagang; // "lama" | "baru"

  DetailKehadiran({
    required this.id,
    required this.tanggal,
    required this.namaSesi,
    required this.waktuCheckin,
    this.waktuCheckout,
    this.omset,
    required this.status,
    required this.dicatatOleh,
    required this.namaJalan,
    required this.kecamatan,
    required this.nomorLapak,
    required this.lokasiLapak,
    required this.namaUsaha,
    required this.jenisDagangan,
    required this.jenisLapak,
    required this.namaLengkap,
    required this.nik,
    required this.email,
    required this.tanggalLahir,
    required this.statusPedagang,
  });

  factory DetailKehadiran.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> bagian(String key) =>
        (json[key] as Map<String, dynamic>?) ?? const <String, dynamic>{};
    final k = bagian('kehadiran');
    final l = bagian('lokasi');
    final u = bagian('usaha');
    final p = bagian('pribadi');
    String s(Map<String, dynamic> m, String key) => m[key] as String? ?? '';

    return DetailKehadiran(
      id: s(k, 'id'),
      tanggal: s(k, 'tanggal'),
      namaSesi: s(k, 'namaSesi'),
      waktuCheckin: s(k, 'waktuCheckin'),
      waktuCheckout: k['waktuCheckout'] as String?,
      omset: k['omset'] == null ? null : (k['omset'] as num).toInt(),
      status: k['status'] as String? ?? 'belum-hadir',
      dicatatOleh: s(k, 'dicatatOleh'),
      namaJalan: s(l, 'namaJalan'),
      kecamatan: s(l, 'kecamatan'),
      nomorLapak: s(l, 'nomorLapak'),
      lokasiLapak: s(l, 'lokasiLapak'),
      namaUsaha: s(u, 'namaUsaha'),
      jenisDagangan: s(u, 'jenisDagangan'),
      jenisLapak: s(u, 'jenisLapak'),
      namaLengkap: s(p, 'namaLengkap'),
      nik: s(p, 'nik'),
      email: s(p, 'email'),
      tanggalLahir: s(p, 'tanggalLahir'),
      statusPedagang: s(p, 'statusPedagang'),
    );
  }
}