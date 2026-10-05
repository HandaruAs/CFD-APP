/// Data halaman Cek-out pedagang PER EVENT (GET /api/pedagang/events/checkout),
/// sama dengan web /pedagang/CekOut. Backend memilih satu event: yang
/// WAJIB di-checkout (event sudah selesai) didahulukan, lalu yang sedang
/// berjalan, lalu checkout terakhir hari ini.
class CheckoutData {
  final String eventId;
  final String namaEvent;
  final String tanggal;
  final String jamMulai;
  final String jamSelesai;

  /// Check-in di event yang SUDAH selesai tapi omset belum diisi. Selama
  /// true, pedagang tidak bisa ikut / check-in event lain.
  final bool wajibCheckout;

  final String kecamatan;
  final String namaJalan;
  final String namaRuas;

  /// Nomor stan, mis. "CFD-012361".
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

  /// Tanggal + jam selesai event (ISO), cuma untuk hitung mundur di layar.
  final String? jamSelesaiSesi;

  /// Sumber kebenaran boleh/tidaknya submit checkout.
  final bool sesiSudahSelesai;

  CheckoutData({
    required this.eventId,
    required this.namaEvent,
    required this.tanggal,
    required this.jamMulai,
    required this.jamSelesai,
    required this.wajibCheckout,
    required this.kecamatan,
    required this.namaJalan,
    this.namaRuas = '',
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
      eventId: json['eventId']?.toString() ?? '',
      namaEvent: json['namaEvent'] as String? ?? '',
      tanggal: json['tanggal'] as String? ?? '',
      jamMulai: json['jamMulai'] as String? ?? '',
      jamSelesai: json['jamSelesai'] as String? ?? '',
      wajibCheckout: json['wajibCheckout'] as bool? ?? false,
      kecamatan: json['namaKecamatan'] as String? ?? '',
      namaJalan: json['namaJalan'] as String? ?? '',
      namaRuas: json['namaRuas'] as String? ?? '',
      nomorStan: json['kodeStan'] as String? ?? '',
      nik: json['nik'] as String? ?? '',
      namaLengkap: json['namaLengkap'] as String? ?? '',
      tanggalLahir: json['tanggalLahir'] as String? ?? '',
      namaUsaha: json['namaUsaha'] as String? ?? '',
      kategoriUsaha: json['kategoriUsaha'] as String? ?? '',
      jenisLapak: json['jenisLapak'] as String? ?? '',
      sudahCheckIn: json['sudahCheckIn'] as bool? ?? false,
      sudahCheckOut: json['sudahCheckOut'] as bool? ?? false,
      omset: (json['omset'] as num?)?.toInt(),
      jamSelesaiSesi: json['jamSelesaiSesi'] as String?,
      sesiSudahSelesai: json['sesiSudahSelesai'] as bool? ?? false,
    );
  }
}