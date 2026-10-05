/// Event hari ini untuk dashboard petugas (GET /api/petugas/events/hari-ini).
/// Satu hari boleh punya beberapa event; kartu status di dashboard
/// menampilkan event yang paling relevan (lihat [pilihEventUtama]).

int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

class EventHariIni {
  final String id;
  final String nama;

  /// "terjadwal" | "berjalan" | "selesai" | "dibatalkan"
  final String status;
  final String jamMulai;
  final String jamSelesai;
  final int sisaMenit;
  final int totalMenit;
  final int kuotaTotal;
  final int terisi;
  final int checkIn;
  final int checkOut;

  const EventHariIni({
    required this.id,
    required this.nama,
    required this.status,
    required this.jamMulai,
    required this.jamSelesai,
    required this.sisaMenit,
    required this.totalMenit,
    required this.kuotaTotal,
    required this.terisi,
    required this.checkIn,
    required this.checkOut,
  });

  bool get berjalan => status == 'berjalan';

  factory EventHariIni.fromJson(Map<String, dynamic> json) => EventHariIni(
        id: json['id']?.toString() ?? '',
        nama: json['nama'] as String? ?? '-',
        status: json['status'] as String? ?? 'terjadwal',
        jamMulai: json['jamMulai'] as String? ?? '',
        jamSelesai: json['jamSelesai'] as String? ?? '',
        sisaMenit: _int(json['sisaMenit']),
        totalMenit: _int(json['totalMenit']),
        kuotaTotal: _int(json['kuotaTotal']),
        terisi: _int(json['terisi']),
        checkIn: _int(json['checkIn']),
        checkOut: _int(json['checkOut']),
      );
}

/// Event untuk kartu status: berjalan > terjadwal paling awal > selesai
/// paling akhir > dibatalkan. Null kalau hari ini tidak ada event.
EventHariIni? pilihEventUtama(List<EventHariIni> events) {
  for (final status in const ['berjalan', 'terjadwal', 'selesai', 'dibatalkan']) {
    final cocok = events.where((e) => e.status == status).toList();
    if (cocok.isEmpty) continue;
    return (status == 'selesai' || status == 'dibatalkan') ? cocok.last : cocok.first;
  }
  return null;
}