String _str(dynamic v) => v?.toString() ?? '';

String? _strN(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

class Sesi {
  final String id;
  final String nama;

  /// "YYYY-MM-DD"
  final String tanggal;

  /// "HH:MM"
  final String jamMulai;
  final String jamSelesai;

  /// draft | terjadwal | berlangsung | diperpanjang | selesai_normal |
  /// diakhiri_awal | dibatalkan
  final String status;

  /// belum_dibuka | dibuka | ditutup
  final String statusPendaftaran;

  final int kuotaTotal;
  final int kuotaLama;
  final int kuotaBaru;
  final int terisiLama;
  final int terisiBaru;
  final int jumlahTitik;

  /// Lokasi hasil undian, mis. "Jalan Mulyosari · Ruas A (Kec. Sukolilo)".
  /// null = lokasi belum diacak.
  final String? lokasi;

  // Disimpan apa adanya (string ISO dari server) supaya bisa dikirim balik
  // utuh saat mengubah jumlah pedagang.
  final String? pendaftaranBukaAt;
  final String? pendaftaranTutupAt;
  final String? lepasKuotaAt;
  final String? keterangan;

  const Sesi({
    required this.id,
    required this.nama,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.status,
    required this.statusPendaftaran,
    required this.kuotaTotal,
    required this.kuotaLama,
    required this.kuotaBaru,
    required this.terisiLama,
    required this.terisiBaru,
    required this.jumlahTitik,
    this.lokasi,
    this.pendaftaranBukaAt,
    this.pendaftaranTutupAt,
    this.lepasKuotaAt,
    this.keterangan,
  });

  int get terisi => terisiLama + terisiBaru;

  /// Masih tampil di "Sesi Terjadwal" (belum selesai / batal).
  bool get aktif =>
      status == 'draft' || status == 'terjadwal' || status == 'berlangsung' || status == 'diperpanjang';

  bool get sedangBerlangsung => status == 'berlangsung' || status == 'diperpanjang';

  /// Jumlah pedagang & lokasi masih boleh diatur.
  bool get bisaDiatur => status == 'draft' || status == 'terjadwal';

  bool get punyaLokasi => jumlahTitik > 0;

  /// "YYYY-MM-DD" tanpa embel-embel waktu.
  String get tanggalPendek => tanggal.length >= 10 ? tanggal.substring(0, 10) : tanggal;

  /// Tanggal + jam mulai, untuk mengurutkan.
  String get kunciUrut => '$tanggalPendek $jamMulai';

  factory Sesi.fromJson(Map<String, dynamic> json) => Sesi(
        id: _str(json['id']),
        nama: _str(json['nama']),
        tanggal: _str(json['tanggal']),
        jamMulai: _str(json['jamMulai']),
        jamSelesai: _str(json['jamSelesai']),
        status: _str(json['status']),
        statusPendaftaran: _str(json['statusPendaftaran']),
        kuotaTotal: _int(json['kuotaTotal']),
        kuotaLama: _int(json['kuotaLama']),
        kuotaBaru: _int(json['kuotaBaru']),
        terisiLama: _int(json['terisiLama']),
        terisiBaru: _int(json['terisiBaru']),
        jumlahTitik: _int(json['jumlahTitik']),
        lokasi: _strN(json['lokasi']),
        pendaftaranBukaAt: _strN(json['pendaftaranBukaAt']),
        pendaftaranTutupAt: _strN(json['pendaftaranTutupAt']),
        lepasKuotaAt: _strN(json['lepasKuotaAt']),
        keterangan: _strN(json['keterangan']),
      );
}

/// Lokasi hasil undian (satu ruas).
class LokasiSesi {
  final String namaJalan;
  final String namaRuas;
  final String? namaKecamatan;

  const LokasiSesi({required this.namaJalan, required this.namaRuas, this.namaKecamatan});

  factory LokasiSesi.fromJson(Map<String, dynamic> json) => LokasiSesi(
        namaJalan: _str(json['namaJalan']),
        namaRuas: _str(json['namaRuas']),
        namaKecamatan: _strN(json['namaKecamatan']),
      );
}

/// Satu pedagang yang ikut sesi (GET /api/admin/events/:id/peserta).
class PesertaSesi {
  final String id;
  final String? namaLengkap;
  final String? namaUsaha;

  /// lama | baru
  final String kategori;

  /// terdaftar | check_in | check_out | batal | tidak_hadir
  final String status;

  /// Nomor stan, mis. "CFD-012361".
  final String kodeStan;

  const PesertaSesi({
    required this.id,
    this.namaLengkap,
    this.namaUsaha,
    required this.kategori,
    required this.status,
    required this.kodeStan,
  });

  factory PesertaSesi.fromJson(Map<String, dynamic> json) => PesertaSesi(
        id: _str(json['id']),
        namaLengkap: _strN(json['namaLengkap']),
        namaUsaha: _strN(json['namaUsaha']),
        kategori: _str(json['kategori']),
        status: _str(json['status']),
        kodeStan: _str(json['kodeStan']),
      );
}

/// Dari mana lokasi diundi.
enum CakupanUndian { kota, kecamatan, jalan, ruas }

extension CakupanUndianX on CakupanUndian {
  String get apiValue => name;

  String get label {
    switch (this) {
      case CakupanUndian.kota:
        return 'Se-Surabaya';
      case CakupanUndian.kecamatan:
        return 'Kecamatan';
      case CakupanUndian.jalan:
        return 'Jalan';
      case CakupanUndian.ruas:
        return 'Ruas';
    }
  }
}

// ───────────────────────── format tanggal ─────────────────────────

const _hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const _bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

DateTime? _parseTanggal(String iso) {
  if (iso.length < 10) return null;
  return DateTime.tryParse(iso.substring(0, 10));
}

/// "2026-10-03" -> "Sabtu, 3 Oktober 2026"
String tanggalPanjang(String iso) {
  final d = _parseTanggal(iso);
  if (d == null) return iso;
  return '${_hari[d.weekday - 1]}, ${d.day} ${_bulan[d.month - 1]} ${d.year}';
}

/// "2026-10-03" -> "Sab"
String hariPendek(String iso) {
  final d = _parseTanggal(iso);
  return d == null ? '' : _hari[d.weekday - 1].substring(0, 3);
}

/// "2026-10-03" -> "Okt"
String bulanPendek(String iso) {
  final d = _parseTanggal(iso);
  return d == null ? '' : _bulan[d.month - 1].substring(0, 3);
}

/// "2026-10-03" -> 3
int tanggalAngka(String iso) => _parseTanggal(iso)?.day ?? 0;

/// "06:00" -> "06.00"
String jamTitik(String jam) => jam.replaceAll(':', '.');

/// DateTime -> "YYYY-MM-DD"
String isoTanggal(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';