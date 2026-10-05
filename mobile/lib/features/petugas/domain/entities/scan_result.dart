/// Model untuk check-in pedagang PER EVENT oleh petugas:
///   POST /api/petugas/event-checkin/periksa  -> [PesertaScan] (hanya baca)
///   POST /api/petugas/event-checkin          -> [PesertaScan] setelah check-in
///   GET  /api/petugas/event-checkin/riwayat  -> [RiwayatCheckIn]
///
/// QR yang dipindai = QR di kartu event pedagang (id keikutsertaan). QR
/// lama (id pedagang) masih diterima backend: kalau pedagang cuma ikut satu
/// event yang sedang buka, langsung diarahkan ke event itu.

String? _strN(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

String _str(dynamic v) => v?.toString() ?? '';

DateTime? _waktu(dynamic v) => v is String ? DateTime.tryParse(v) : null;

class PesertaScan {
  final String pesertaId;
  final String pedagangId;
  final String? namaLengkap;
  final String? namaUsaha;
  final String? jenisDagangan;

  /// "lama" | "baru"
  final String kategori;

  final String namaEvent;
  final String tanggal;
  final String jamMulai;
  final String jamSelesai;
  final String? namaKecamatan;
  final String namaJalan;
  final String namaRuas;

  /// Nomor stan, mis. "CFD-012361".
  final String kodeStan;

  /// terdaftar | check_in | check_out | batal | tidak_hadir
  final String status;
  final DateTime? checkInAt;

  /// Boleh di-check-in sekarang? Kalau tidak, [alasan] berisi penjelasannya
  /// (mis. "Check-in dibuka mulai 05:00 WIB", "belum checkout di event X").
  final bool bisaCheckIn;
  final String? alasan;

  const PesertaScan({
    required this.pesertaId,
    required this.pedagangId,
    this.namaLengkap,
    this.namaUsaha,
    this.jenisDagangan,
    required this.kategori,
    required this.namaEvent,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    this.namaKecamatan,
    required this.namaJalan,
    required this.namaRuas,
    required this.kodeStan,
    required this.status,
    this.checkInAt,
    required this.bisaCheckIn,
    this.alasan,
  });

  bool get sudahCheckIn => status == 'check_in' || status == 'check_out';

  String get inisial {
    final kata = (namaLengkap ?? namaUsaha ?? '').trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).toList();
    final hasil = kata.take(2).map((k) => k[0].toUpperCase()).join();
    return hasil.isEmpty ? '??' : hasil;
  }

  String get labelDagangan {
    switch (jenisDagangan) {
      case 'makanan_minuman':
        return 'Makanan & Minuman';
      case 'bukan_makanan_minuman':
        return 'Bukan Makanan & Minuman';
      default:
        return jenisDagangan ?? '-';
    }
  }

  factory PesertaScan.fromJson(Map<String, dynamic> json) => PesertaScan(
        pesertaId: _str(json['pesertaId']),
        pedagangId: _str(json['pedagangId']),
        namaLengkap: _strN(json['namaLengkap']),
        namaUsaha: _strN(json['namaUsaha']),
        jenisDagangan: _strN(json['jenisDagangan']),
        kategori: _str(json['kategori']),
        namaEvent: _str(json['namaEvent']),
        tanggal: _str(json['tanggal']),
        jamMulai: _str(json['jamMulai']),
        jamSelesai: _str(json['jamSelesai']),
        namaKecamatan: _strN(json['namaKecamatan']),
        namaJalan: _str(json['namaJalan']),
        namaRuas: _str(json['namaRuas']),
        kodeStan: _str(json['kodeStan']),
        status: _str(json['status']),
        checkInAt: _waktu(json['checkInAt']),
        bisaCheckIn: json['bisaCheckIn'] == true,
        alasan: _strN(json['alasan']),
      );
}

/// Satu check-in yang dicatat petugas ini hari ini.
class RiwayatCheckIn {
  final String pesertaId;
  final String? namaLengkap;
  final String? namaUsaha;
  final String namaEvent;
  final String namaJalan;
  final String namaRuas;
  final String kodeStan;
  final DateTime? checkInAt;

  const RiwayatCheckIn({
    required this.pesertaId,
    this.namaLengkap,
    this.namaUsaha,
    required this.namaEvent,
    required this.namaJalan,
    required this.namaRuas,
    required this.kodeStan,
    this.checkInAt,
  });

  factory RiwayatCheckIn.fromJson(Map<String, dynamic> json) => RiwayatCheckIn(
        pesertaId: _str(json['pesertaId']),
        namaLengkap: _strN(json['namaLengkap']),
        namaUsaha: _strN(json['namaUsaha']),
        namaEvent: _str(json['namaEvent']),
        namaJalan: _str(json['namaJalan']),
        namaRuas: _str(json['namaRuas']),
        kodeStan: _str(json['kodeStan']),
        checkInAt: _waktu(json['checkInAt']),
      );
}

/// "06:00" -> "06.00"
String jamTitikScan(String jam) => jam.length >= 5 ? jam.substring(0, 5).replaceAll(':', '.') : jam;

/// DateTime (UTC dari server) -> "07.15" waktu HP.
String jamLokal(DateTime? t) {
  if (t == null) return '-';
  final l = t.toLocal();
  return '${l.hour.toString().padLeft(2, '0')}.${l.minute.toString().padLeft(2, '0')}';
}