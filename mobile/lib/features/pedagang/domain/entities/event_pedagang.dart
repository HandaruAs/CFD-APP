/// Entities alur pedagang di sistem MULTI-EVENT (sama dengan web
/// /pedagang/nomer-stand):
///   GET    /api/pedagang/events          -> [DaftarEventPedagang]
///   GET    /api/pedagang/events/saya     -> [Keikutsertaan]
///   POST   /api/pedagang/events/:id/ikut -> [Keikutsertaan]
///   DELETE /api/pedagang/events/:id/ikut
/// Lokasi & nomor stan diacak server saat pedagang ikut event.

String _str(dynamic v) => v?.toString() ?? '';

String? _strN(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

DateTime? _waktu(dynamic v) => v is String ? DateTime.tryParse(v) : null;

class LokasiRingkas {
  final String? namaKecamatan;
  final String namaJalan;
  final String namaRuas;

  const LokasiRingkas({this.namaKecamatan, required this.namaJalan, required this.namaRuas});

  factory LokasiRingkas.fromJson(Map<String, dynamic> json) => LokasiRingkas(
        namaKecamatan: _strN(json['namaKecamatan']),
        namaJalan: _str(json['namaJalan']),
        namaRuas: _str(json['namaRuas']),
      );

  String get teks => '$namaJalan · $namaRuas${namaKecamatan != null ? ' (Kec. $namaKecamatan)' : ''}';
}

/// Satu event yang bisa dilihat pedagang.
class EventTersedia {
  final String id;
  final String nama;
  final String tanggal;
  final String jamMulai;
  final String jamSelesai;

  /// belum_dibuka | dibuka | ditutup
  final String statusPendaftaran;

  /// Sisa tempat untuk kategori pedagang ini (lama/baru).
  final int sisaUntukSaya;
  final List<LokasiRingkas> lokasi;

  /// null = belum ikut; terdaftar | check_in | check_out | batal | tidak_hadir
  final String? statusSaya;
  final bool bisaIkut;

  const EventTersedia({
    required this.id,
    required this.nama,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.statusPendaftaran,
    required this.sisaUntukSaya,
    required this.lokasi,
    this.statusSaya,
    required this.bisaIkut,
  });

  factory EventTersedia.fromJson(Map<String, dynamic> json) {
    final raw = json['lokasi'];
    return EventTersedia(
      id: _str(json['id']),
      nama: _str(json['nama']),
      tanggal: _str(json['tanggal']),
      jamMulai: _str(json['jamMulai']),
      jamSelesai: _str(json['jamSelesai']),
      statusPendaftaran: _str(json['statusPendaftaran']),
      sisaUntukSaya: _int(json['sisaUntukSaya']),
      lokasi: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(LokasiRingkas.fromJson).toList()
          : const [],
      statusSaya: _strN(json['statusSaya']),
      bisaIkut: json['bisaIkut'] == true,
    );
  }
}

class DaftarEventPedagang {
  /// "lama" | "baru"
  final String kategori;
  final List<EventTersedia> events;

  const DaftarEventPedagang({required this.kategori, required this.events});

  factory DaftarEventPedagang.fromJson(Map<String, dynamic> json) {
    final raw = json['events'];
    return DaftarEventPedagang(
      kategori: _str(json['kategori']),
      events: raw is List
          ? raw.whereType<Map<String, dynamic>>().map(EventTersedia.fromJson).toList()
          : const [],
    );
  }
}

/// Keikutsertaan pedagang di satu event (kartu event + QR).
class Keikutsertaan {
  final String id;
  final String eventId;
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
  final bool bisaBatal;

  /// Isi QR kartu event (dipindai petugas saat check-in).
  final String qrCode;

  const Keikutsertaan({
    required this.id,
    required this.eventId,
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
    required this.bisaBatal,
    required this.qrCode,
  });

  bool get aktif => status == 'terdaftar' || status == 'check_in';

  factory Keikutsertaan.fromJson(Map<String, dynamic> json) => Keikutsertaan(
        id: _str(json['id']),
        eventId: _str(json['eventId']),
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
        bisaBatal: json['bisaBatal'] == true,
        qrCode: _str(json['qrCode']),
      );
}

// ───────────────────────── format ─────────────────────────

const _hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const _bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/// "2026-10-03" -> "Sabtu, 3 Oktober 2026"
String tanggalEvent(String iso) {
  final d = iso.length >= 10 ? DateTime.tryParse(iso.substring(0, 10)) : null;
  if (d == null) return iso;
  return '${_hari[d.weekday - 1]}, ${d.day} ${_bulan[d.month - 1]} ${d.year}';
}

/// "06:00" -> "06.00"
String jamEvent(String jam) => jam.length >= 5 ? jam.substring(0, 5).replaceAll(':', '.') : jam;

/// Label status keikutsertaan untuk pedagang.
String labelStatusPeserta(String status) {
  switch (status) {
    case 'terdaftar':
      return 'Menunggu check-in';
    case 'check_in':
      return 'Sudah check-in';
    case 'check_out':
      return 'Selesai';
    case 'batal':
      return 'Dibatalkan';
    case 'tidak_hadir':
      return 'Tidak hadir';
    default:
      return status;
  }
}