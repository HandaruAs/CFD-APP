import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';

/// Endpoint pedagang. Sejak sistem MULTI-EVENT, klaim lapak lama
/// (/api/pedagang/lapak/*, /check-in/status, /checkout) diganti endpoint
/// event -- sama dengan web /pedagang/nomer-stand & /pedagang/CekOut.
class PedagangRemoteDatasource {
  /// GET /api/pedagang/pengajuan
  ///
  /// Backend SELALU balikin HTTP 200. Kalau pedagang belum pernah isi data
  /// usaha, body-nya `{"has_pengajuan": false}`. Return null kalau belum ada.
  static Future<PengajuanStatus?> getStatusPengajuan() async {
    final data = await ApiClient.get('/api/pedagang/pengajuan');
    if (data is! Map<String, dynamic>) {
      throw ApiException('Format respons status pengajuan tidak dikenal.');
    }
    final hasPengajuan = data['has_pengajuan'] as bool? ?? false;
    if (!hasPengajuan) return null;
    return PengajuanStatus.fromJson(data);
  }

  /// POST /api/pedagang/pengajuan -- simpan data usaha.
  /// [tanggalLahir] "YYYY-MM-DD"; [jenisDagangan] "makanan_minuman" /
  /// "bukan_makanan_minuman"; [jenisLapak] "rombong" / "meja".
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

  // ───────────────────────── event ─────────────────────────

  /// GET /api/pedagang/events -- event yang bisa diikuti + sisa tempat.
  static Future<DaftarEventPedagang> getEvents() async {
    final data = await ApiClient.get('/api/pedagang/events');
    final d = data is Map<String, dynamic> ? data['data'] : null;
    if (d is! Map<String, dynamic>) throw ApiException('Format data event tidak dikenal.');
    return DaftarEventPedagang.fromJson(d);
  }

  /// GET /api/pedagang/events/saya -- event yang diikuti (kartu + QR).
  static Future<List<Keikutsertaan>> getEventSaya() async {
    final data = await ApiClient.get('/api/pedagang/events/saya');
    final list = data is Map<String, dynamic> ? data['data'] : null;
    if (list is! List) return const [];
    return list.whereType<Map<String, dynamic>>().map(Keikutsertaan.fromJson).toList();
  }

  /// POST /api/pedagang/events/:id/ikut -- server mengacak lokasi & nomor stan.
  static Future<Keikutsertaan> ikut(String eventId) async {
    final data = await ApiClient.post('/api/pedagang/events/$eventId/ikut');
    final d = data is Map<String, dynamic> ? data['data'] : null;
    if (d is! Map<String, dynamic>) throw ApiException('Format data keikutsertaan tidak dikenal.');
    return Keikutsertaan.fromJson(d);
  }

  /// DELETE /api/pedagang/events/:id/ikut -- batal ikut (sebelum check-in).
  static Future<void> batal(String eventId) async {
    await ApiClient.delete('/api/pedagang/events/$eventId/ikut');
  }

  // ───────────────────────── checkout ─────────────────────────

  /// GET /api/pedagang/events/checkout -- null kalau tidak ada event yang
  /// perlu / pernah di-checkout hari ini (belum check-in di mana pun).
  static Future<CheckoutData?> getCheckoutData() async {
    final data = await ApiClient.get('/api/pedagang/events/checkout');
    final d = data is Map<String, dynamic> ? data['data'] : null;
    if (d is! Map<String, dynamic>) return null;
    return CheckoutData.fromJson(d);
  }

  /// POST /api/pedagang/events/:id/checkout {omset}
  static Future<void> submitCheckout(String eventId, int omset) async {
    await ApiClient.post('/api/pedagang/events/$eventId/checkout', body: {'omset': omset});
  }
}