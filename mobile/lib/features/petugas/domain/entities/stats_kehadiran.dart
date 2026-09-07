/// Model buat response GET /api/petugas/laporan/stats. Tanpa query
/// startDate/endDate, backend otomatis pakai hari ini (lihat
/// laporan_usecase.go di backend -- default startDate = time.Now()).
class StatsKehadiran {
  final int totalTerdaftar;
  final int totalCheckin;
  final int totalCheckout;
  final int totalOmset;
  final int rataOmset;
  final double persenHadir;

  StatsKehadiran({
    required this.totalTerdaftar,
    required this.totalCheckin,
    required this.totalCheckout,
    required this.totalOmset,
    required this.rataOmset,
    required this.persenHadir,
  });

  factory StatsKehadiran.fromJson(Map<String, dynamic> json) {
    return StatsKehadiran(
      totalTerdaftar: json['totalTerdaftar'] as int,
      totalCheckin: json['totalCheckin'] as int,
      totalCheckout: json['totalCheckout'] as int,
      totalOmset: (json['totalOmset'] as num).toInt(),
      rataOmset: (json['rataOmset'] as num).toInt(),
      persenHadir: (json['persenHadir'] as num).toDouble(),
    );
  }
}