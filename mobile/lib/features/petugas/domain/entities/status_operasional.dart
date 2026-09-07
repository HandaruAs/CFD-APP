/// Model buat response GET /api/petugas/jam-operasional.

class SesiAktif {
  final String id;
  final String tanggal;
  final String jamMulai;
  final String jamSelesaiRencana;
  final String status;
  final bool aktif;
  final int sisaMenit;
  final int totalMenit;

  SesiAktif({
    required this.id,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesaiRencana,
    required this.status,
    required this.aktif,
    required this.sisaMenit,
    required this.totalMenit,
  });

  factory SesiAktif.fromJson(Map<String, dynamic> json) {
    return SesiAktif(
      id: json['id'] as String,
      tanggal: json['tanggal'] as String,
      jamMulai: json['jamMulai'] as String,
      jamSelesaiRencana: json['jamSelesaiRencana'] as String,
      status: json['status'] as String,
      aktif: json['aktif'] as bool,
      sisaMenit: json['sisaMenit'] as int,
      totalMenit: json['totalMenit'] as int,
    );
  }
}

class PendaftaranStatus {
  final bool isOpen;
  final String? linkPendaftaran;
  final String? jamBuka;
  final String? jamTutup;

  PendaftaranStatus({
    required this.isOpen,
    this.linkPendaftaran,
    this.jamBuka,
    this.jamTutup,
  });

  factory PendaftaranStatus.fromJson(Map<String, dynamic> json) {
    return PendaftaranStatus(
      isOpen: json['isOpen'] as bool,
      linkPendaftaran: json['linkPendaftaran'] as String?,
      jamBuka: json['jamBuka'] as String?,
      jamTutup: json['jamTutup'] as String?,
    );
  }
}

/// `sesi` bisa null kalau hari ini belum ada sesi CFD yang diset sama
/// sekali (bukan error -- backend memang balikin null di field ini).
class StatusOperasional {
  final PendaftaranStatus pendaftaran;
  final SesiAktif? sesi;
  final List<RiwayatSesi> riwayat;

  StatusOperasional({
    required this.pendaftaran,
    this.sesi,
    this.riwayat = const [],
  });

  factory StatusOperasional.fromJson(Map<String, dynamic> json) {
    return StatusOperasional(
      pendaftaran: PendaftaranStatus.fromJson(
        json['pendaftaran'] as Map<String, dynamic>,
      ),
      sesi: json['sesi'] == null
          ? null
          : SesiAktif.fromJson(json['sesi'] as Map<String, dynamic>),
      riwayat: (json['riwayat'] as List<dynamic>? ?? [])
          .map((e) => RiwayatSesi.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class RiwayatSesi {
  final String tanggal;
  final String jamMulai;
  final String jamSelesai;
  final String durasi;
  final String status; // "normal" | "diakhiri-awal"

  RiwayatSesi({
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.durasi,
    required this.status,
  });

  factory RiwayatSesi.fromJson(Map<String, dynamic> json) {
    return RiwayatSesi(
      tanggal: json['tanggal'] as String,
      jamMulai: json['jamMulai'] as String,
      jamSelesai: json['jamSelesai'] as String,
      durasi: json['durasi'] as String,
      status: json['status'] as String,
    );
  }
}