// Helper format yang dipakai bareng Dashboard, Laporan, dan export
// laporan (PDF/Excel) petugas -- biar label & format angkanya sama
// persis di semua tempat (dan sama kayak web).

/// 1250000 -> "Rp 1.250.000"
String formatRupiah(int value) {
  final negatif = value < 0;
  final digits = value.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  return '${negatif ? '-' : ''}Rp $buf';
}

/// 1250000 -> "Rp 1,3 jt" / 85000 -> "Rp 85 rb". Buat tempat sempit (grafik).
String formatRupiahRingkas(int value) {
  if (value >= 1000000) {
    final jt = (value / 1000000).toStringAsFixed(1).replaceAll('.', ',');
    return 'Rp ${jt.endsWith(',0') ? jt.substring(0, jt.length - 2) : jt} jt';
  }
  if (value >= 1000) return 'Rp ${(value / 1000).round()} rb';
  return 'Rp $value';
}

/// Sama kayak KATEGORI_EXPORT_LABEL + labelKategori() di web.
String labelKategori(String? kategori) {
  if (kategori == null || kategori.isEmpty) return '-';
  const label = {
    'makanan_minuman': 'Makanan & Minuman',
    'bukan_makanan_minuman': 'Bukan Makanan & Minuman',
    'kuliner': 'Kuliner',
    'kerajinan': 'Kerajinan',
    'ritel': 'Ritel',
  };
  return label[kategori] ?? label[kategori.toLowerCase()] ?? kategori;
}

/// Label status di halaman Laporan & file export (STATUS_STYLE web).
String labelStatusLaporan(String status) {
  switch (status) {
    case 'check-out':
      return 'Check-out';
    case 'check-in':
      return 'Check-in';
    default:
      return 'Belum Hadir';
  }
}

/// Label status di Dashboard -- "Pedagang Hari Ini" (STATUS_KEHADIRAN_STYLE web).
String labelStatusDashboard(String status) {
  switch (status) {
    case 'check-out':
      return 'Sudah Check-out';
    case 'check-in':
      return 'Sedang di Lapak';
    default:
      return 'Belum Hadir';
  }
}

const _namaBulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const _namaHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/// "2026-09-24" / DateTime -> "24 September 2026"
String formatTanggalPanjang(DateTime d) => '${d.day} ${_namaBulan[d.month - 1]} ${d.year}';

/// DateTime -> "Kamis, 24 September 2026"
String formatHariTanggal(DateTime d) => '${_namaHari[d.weekday - 1]}, ${formatTanggalPanjang(d)}';

/// "2026-09-24" (atau ISO) -> "24 September 2026"; balikin apa adanya kalau gagal parse.
String formatTanggalString(String? raw) {
  if (raw == null || raw.isEmpty) return '-';
  final d = DateTime.tryParse(raw);
  return d == null ? raw : formatTanggalPanjang(d);
}

/// DateTime -> "2026-09-24" (format query backend).
String formatTanggalApi(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';