import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/scan_result.dart';
import 'package:mobile/core/network/api_exception.dart';

class ScanRemoteDatasource {
  /// POST /api/petugas/scan
  ///
  /// [qrCode] itu ID pedagang polos (backend langsung GetPedagangByID
  /// pakai value ini) -- BUKAN JSON, cuma string ID hasil scan kamera.
  /// Endpoint ini cuma verifikasi + ngecek status, belum nyimpen
  /// kehadiran -- itu baru kejadian di [checkIn].
  static Future<VerifyQRResult> verifyQr(String qrCode) async {
    final data = await ApiClient.post(
      '/api/petugas/scan',
      body: {'qr_code': qrCode},
    );
    return VerifyQRResult.fromJson(data as Map<String, dynamic>);
  }

  /// POST /api/petugas/check-in
  static Future<CheckInResult> checkIn({
    required String pedagangId,
    String? catatan,
  }) async {
    final data = await ApiClient.post(
      '/api/petugas/check-in',
      body: {
        'pedagang_id': pedagangId,
        if (catatan != null && catatan.isNotEmpty) 'catatan': catatan,
      },
    );
    return CheckInResult.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/petugas/riwayat-scan
  static Future<List<RiwayatScanItem>> getRiwayatScan() async {
    final data = await ApiClient.get('/api/petugas/riwayat-scan');
    return ((data as Map<String, dynamic>)['riwayat'] as List<dynamic>? ?? [])
        .map((e) => RiwayatScanItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}