/// Model buat GET /api/admin/dashboard. Backend juga ngirim `tren`
/// (grafik per sesi & per minggu) -- sengaja belum dipakai di v1 mobile,
/// jadi belum di-parse di sini.

int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

class SesiHariIni {
  /// "belum_ada" | "terjadwal" | "berjalan" | "selesai" | "dibatalkan"
  final String status;
  final String? namaSesi;
  final String? jamMulai;
  final String? jamSelesai;
  final int sisaMenit;

  const SesiHariIni({
    required this.status,
    this.namaSesi,
    this.jamMulai,
    this.jamSelesai,
    this.sisaMenit = 0,
  });

  factory SesiHariIni.fromJson(Map<String, dynamic> json) => SesiHariIni(
        status: json['status'] as String? ?? 'belum_ada',
        namaSesi: json['namaSesi'] as String?,
        jamMulai: json['jamMulai'] as String?,
        jamSelesai: json['jamSelesai'] as String?,
        sisaMenit: _int(json['sisaMenit']),
      );
}

class LapakHariIni {
  final int terisi;
  final int kapasitas;
  final double persen;

  const LapakHariIni({
    required this.terisi,
    required this.kapasitas,
    required this.persen,
  });

  factory LapakHariIni.fromJson(Map<String, dynamic> json) => LapakHariIni(
        terisi: _int(json['terisi']),
        kapasitas: _int(json['kapasitas']),
        persen: (json['persen'] as num?)?.toDouble() ?? 0,
      );
}

class HadirHariIni {
  final int klaim;
  final int checkIn;
  final int checkOut;

  const HadirHariIni({
    required this.klaim,
    required this.checkIn,
    required this.checkOut,
  });

  factory HadirHariIni.fromJson(Map<String, dynamic> json) => HadirHariIni(
        klaim: _int(json['klaim']),
        checkIn: _int(json['checkIn']),
        checkOut: _int(json['checkOut']),
      );
}

class AdminDashboard {
  final String tanggal; // YYYY-MM-DD
  final SesiHariIni sesi;
  final LapakHariIni lapak;
  final HadirHariIni hadir;

  const AdminDashboard({
    required this.tanggal,
    required this.sesi,
    required this.lapak,
    required this.hadir,
  });

  factory AdminDashboard.fromJson(Map<String, dynamic> json) {
    final h = json['hariIni'] as Map<String, dynamic>;
    return AdminDashboard(
      tanggal: h['tanggal'] as String? ?? '',
      sesi: SesiHariIni.fromJson(h['sesi'] as Map<String, dynamic>),
      lapak: LapakHariIni.fromJson(h['lapak'] as Map<String, dynamic>),
      hadir: HadirHariIni.fromJson(h['hadir'] as Map<String, dynamic>),
    );
  }
}