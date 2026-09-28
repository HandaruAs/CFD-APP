import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';
import 'package:mobile/features/pedagang/domain/entities/lapak_data.dart';
import 'package:mobile/core/network/api_exception.dart';

class PedagangRemoteDatasource {
  /// GET /api/pedagang/pengajuan
  ///
  /// PENTING: backend SELALU balikin HTTP 200, gak pernah 404. Kalau
  /// pedagang belum pernah ajukan usaha, body-nya `{"has_pengajuan":
  /// false}` -- jadi yang jadi penentu itu flag `has_pengajuan`, BUKAN
  /// status code. Return null kalau belum ada pengajuan.
  static Future<PengajuanStatus?> getStatusPengajuan() async {
    final data = await ApiClient.get('/api/pedagang/pengajuan');

    if (data is! Map<String, dynamic>) {
      throw ApiException('Format respons status pengajuan tidak dikenal.');
    }

    final hasPengajuan = data['has_pengajuan'] as bool? ?? false;
    if (!hasPengajuan) return null;

    return PengajuanStatus.fromJson(data);
  }

  /// POST /api/pedagang/pengajuan
  ///
  /// [tanggalLahir] wajib format "YYYY-MM-DD" (samain sama validasi
  /// backend `datetime=2006-01-02`). [jenisDagangan] cuma boleh
  /// "makanan_minuman" atau "bukan_makanan_minuman". [jenisLapak] cuma
  /// boleh "rombong" atau "meja".
  static Future<void> submitPengajuan({
    required String nik,
    required String namaLengkap,
    required String tanggalLahir,
    required String namaUsaha,
    required String jenisDagangan,
    required String jenisLapak,
  }) async {
    await ApiClient.post(
      '/api/pedagang/pengajuan',
      body: {
        'nik': nik,
        'nama_lengkap': namaLengkap,
        'tanggal_lahir': tanggalLahir,
        'nama_usaha': namaUsaha,
        'jenis_dagangan': jenisDagangan,
        'jenis_lapak': jenisLapak,
      },
    );
  }

  /// GET /api/pedagang/checkout
  static Future<CheckoutData> getCheckoutData() async {
    final data = await ApiClient.get('/api/pedagang/checkout');
    return CheckoutData.fromJson(data as Map<String, dynamic>);
  }

  /// POST /api/pedagang/checkout
  static Future<void> submitCheckout(int omset) async {
    await ApiClient.post('/api/pedagang/checkout', body: {'omset': omset});
  }

  /// GET /api/pedagang/lapak/status
  static Future<LapakStatus> getLapakStatus() async {
    final data = await ApiClient.get('/api/pedagang/lapak/status');
    return LapakStatus.fromJson(data as Map<String, dynamic>);
  }

  /// POST /api/pedagang/lapak/klaim -- TANPA body. Backend yang milih
  /// lokasi (jalan/ruas) + nomor lapak secara acak dari slot yang udah
  /// disiapkan admin lewat Acak Lapak. Sama persis kayak web.
  static Future<HasilKlaim> klaimLapak() async {
    final data = await ApiClient.post('/api/pedagang/lapak/klaim');

    return HasilKlaim(
      nomorStand: data['nomor_lapak'] as String? ?? '-',
      kecamatan: data['nama_kecamatan'] as String? ?? '-',
      namaJalan: data['nama_jalan'] as String? ?? '-',
      namaRuas: data['nama_ruas'] as String? ?? '',
    );
  }

  /// GET /api/pedagang/check-in/status
  ///
  /// Dipakai buat polling di halaman Lapak: begitu petugas scan QR
  /// pedagang, `sudah_check_in` jadi true dan halaman auto-pindah ke
  /// Checkout. Sengaja fail-silent (return false) kalau network gagal
  /// ATAU request-nya ditolak -- biar polling coba lagi di tick
  /// berikutnya tanpa nge-flash error.
  static Future<bool> getCheckInStatus() async {
    try {
      final data = await ApiClient.get('/api/pedagang/check-in/status');
      if (data is! Map<String, dynamic>) return false;
      return data['sudah_check_in'] as bool? ?? false;
    } catch (_) {
      return false;
    }
  }
}
