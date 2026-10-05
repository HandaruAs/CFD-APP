/// Data dari GET /api/public/sisa-lapak (tanpa login): event hari ini
/// sampai 14 hari ke depan, tanpa data pribadi. Sama dengan yang tampil di
/// beranda web (bagian "Event CFD & sisa lapak").
class LokasiEventPublik {
  final String? kecamatan;
  final String namaJalan;
  final int jumlahRuas;

  const LokasiEventPublik({
    required this.kecamatan,
    required this.namaJalan,
    required this.jumlahRuas,
  });

  factory LokasiEventPublik.fromJson(Map<String, dynamic> j) => LokasiEventPublik(
        kecamatan: j['kecamatan'] as String?,
        namaJalan: (j['namaJalan'] as String?) ?? '-',
        jumlahRuas: (j['jumlahRuas'] as num?)?.toInt() ?? 0,
      );
}

class EventPublik {
  final String id;
  final String nama;
  final String tanggal; // YYYY-MM-DD
  final String jamMulai; // HH:MM
  final String jamSelesai; // HH:MM
  /// terjadwal | berjalan | selesai | dibatalkan
  final String status;
  /// belum_dibuka | dibuka | ditutup
  final String statusPendaftaran;
  final int kuotaTotal;
  final int terisi;
  final int sisa;
  final List<LokasiEventPublik> lokasi;

  const EventPublik({
    required this.id,
    required this.nama,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.status,
    required this.statusPendaftaran,
    required this.kuotaTotal,
    required this.terisi,
    required this.sisa,
    required this.lokasi,
  });

  bool get berjalan => status == 'berjalan';
  bool get penuh => sisa <= 0;
  bool get pendaftaranDibuka => statusPendaftaran == 'dibuka';

  factory EventPublik.fromJson(Map<String, dynamic> j) => EventPublik(
        id: j['id'] as String,
        nama: (j['nama'] as String?) ?? '-',
        tanggal: (j['tanggal'] as String?) ?? '',
        jamMulai: (j['jamMulai'] as String?) ?? '',
        jamSelesai: (j['jamSelesai'] as String?) ?? '',
        status: (j['status'] as String?) ?? '',
        statusPendaftaran: (j['statusPendaftaran'] as String?) ?? '',
        kuotaTotal: (j['kuotaTotal'] as num?)?.toInt() ?? 0,
        terisi: (j['terisi'] as num?)?.toInt() ?? 0,
        sisa: (j['sisa'] as num?)?.toInt() ?? 0,
        lokasi: ((j['lokasi'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(LokasiEventPublik.fromJson)
            .toList(),
      );
}