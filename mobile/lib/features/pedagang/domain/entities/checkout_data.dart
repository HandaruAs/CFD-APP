/// Mirror dari DataCheckout di web (MerchantCheckoutPage.tsx),
/// biar kontrak datanya konsisten antara web dan mobile.
class CheckoutData {
  final String kecamatan;
  final String namaJalan;
  final String nomorStan;
  final String nik;
  final String namaLengkap;
  final String tanggalLahir;
  final String namaUsaha;
  final String kategoriUsaha;
  final String jenisLapak;
  final bool sudahCheckIn;
  final bool sudahCheckOut;
  final int? omset;
  // Timestamp ISO lengkap (tanggal hari ini + jam selesai sesi),
  // dipakai cuma buat nampilin hitung mundur di layar.
  final String? jamSelesaiSesi;
  // Sumber kebenaran boleh/tidaknya submit checkout. Ini yang
  // dipakai buat nyalain tombol, bukan hasil hitungan
  // `now >= jamSelesaiSesi` di client.
  final bool sesiSudahSelesai;

  CheckoutData({
    required this.kecamatan,
    required this.namaJalan,
    required this.nomorStan,
    required this.nik,
    required this.namaLengkap,
    required this.tanggalLahir,
    required this.namaUsaha,
    required this.kategoriUsaha,
    required this.jenisLapak,
    required this.sudahCheckIn,
    required this.sudahCheckOut,
    this.omset,
    this.jamSelesaiSesi,
    required this.sesiSudahSelesai,
  });

  factory CheckoutData.fromJson(Map<String, dynamic> json) {
    return CheckoutData(
      kecamatan: json['kecamatan'] as String? ?? '',
      namaJalan: json['namaJalan'] as String? ?? '',
      nomorStan: json['nomorStan'] as String? ?? '',
      nik: json['nik'] as String? ?? '',
      namaLengkap: json['namaLengkap'] as String? ?? '',
      tanggalLahir: json['tanggalLahir'] as String? ?? '',
      namaUsaha: json['namaUsaha'] as String? ?? '',
      kategoriUsaha: json['kategoriUsaha'] as String? ?? '',
      jenisLapak: json['jenisLapak'] as String? ?? '',
      sudahCheckIn: json['sudahCheckIn'] as bool? ?? false,
      sudahCheckOut: json['sudahCheckOut'] as bool? ?? false,
      omset: json['omset'] as int?,
      jamSelesaiSesi: json['jamSelesaiSesi'] as String?,
      sesiSudahSelesai: json['sesiSudahSelesai'] as bool? ?? false,
    );
  }
}