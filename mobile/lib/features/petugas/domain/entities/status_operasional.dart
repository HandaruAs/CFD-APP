/// Model buat response GET /api/petugas/jam-operasional.
/// Disamakan dengan tipe `StatusOperasional` di web
/// (web/app/admin/jam-operasional/page.tsx).

int _asInt(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

/// Sesi CFD hari ini -- SATU-SATUNYA sesi yang dipakai backend buat
/// validasi check-in (scan QR) & checkout.
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

  /// Sesi hari ini sudah ditutup (selesai normal / diakhiri lebih awal),
  /// bukan sekadar belum mulai. Logika sama dengan `sesiSudahLewat` di web.
  bool get sudahBerakhir => !aktif && status != 'aktif';

  factory SesiAktif.fromJson(Map<String, dynamic> json) {
    return SesiAktif(
      id: json['id'] as String? ?? '',
      tanggal: json['tanggal'] as String? ?? '',
      jamMulai: json['jamMulai'] as String? ?? '',
      jamSelesaiRencana: json['jamSelesaiRencana'] as String? ?? '',
      status: json['status'] as String? ?? '',
      aktif: json['aktif'] as bool? ?? false,
      sisaMenit: _asInt(json['sisaMenit']),
      totalMenit: _asInt(json['totalMenit']),
    );
  }
}

/// NOTE: nama "pendaftaran" ini kontrak API backend
/// (StatusOperasionalResponse.Pendaftaran) -- sengaja gak diganti. Yang
/// masih beneran dipakai di layar Jam Operasional cuma [kodeEvent]
/// (prefix nomor lapak acak). isOpen/jamBuka/jamTutup/link tetap disimpan
/// supaya bisa dikirim balik APA ADANYA waktu kode event diubah.
class PendaftaranStatus {
  final bool isOpen;
  final String? linkPendaftaran;
  final String? jamBuka;
  final String? jamTutup;
  final String kodeEvent;

  PendaftaranStatus({
    required this.isOpen,
    this.linkPendaftaran,
    this.jamBuka,
    this.jamTutup,
    this.kodeEvent = 'CFD',
  });

  factory PendaftaranStatus.fromJson(Map<String, dynamic> json) {
    final kode = json['kodeEvent'] as String?;
    return PendaftaranStatus(
      isOpen: json['isOpen'] as bool? ?? false,
      linkPendaftaran: json['linkPendaftaran'] as String?,
      jamBuka: json['jamBuka'] as String?,
      jamTutup: json['jamTutup'] as String?,
      kodeEvent: (kode == null || kode.isEmpty) ? 'CFD' : kode,
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
        json['pendaftaran'] as Map<String, dynamic>? ?? const {},
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
  final String id;
  final String tanggal;
  final String jamMulai;
  final String jamSelesai;
  final String durasi;

  /// "normal" | "diperpanjang" | "diakhiri-awal"
  final String status;

  RiwayatSesi({
    required this.id,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.durasi,
    required this.status,
  });

  factory RiwayatSesi.fromJson(Map<String, dynamic> json) {
    return RiwayatSesi(
      id: json['id'] as String? ?? '',
      tanggal: json['tanggal'] as String? ?? '',
      jamMulai: json['jamMulai'] as String? ?? '',
      jamSelesai: json['jamSelesai'] as String? ?? '',
      durasi: json['durasi'] as String? ?? '',
      status: json['status'] as String? ?? 'normal',
    );
  }
}