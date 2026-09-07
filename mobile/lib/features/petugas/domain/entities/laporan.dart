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