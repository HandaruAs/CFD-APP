import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/scan_result.dart';

class ScanRemoteDatasource {
  static Future<Map<String, String>> _headers() async {
    final token = await AuthRemoteDatasource.getToken();
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  /// POST /api/petugas/scan
  ///
  /// [qrCode] itu ID pedagang polos (backend langsung GetPedagangByID
  /// pakai value ini) -- BUKAN JSON, cuma string ID hasil scan kamera.
  /// Endpoint ini cuma verifikasi + ngecek status, belum nyimpen
  /// kehadiran -- itu baru kejadian di [checkIn].
  static Future<VerifyQRResult> verifyQr(String qrCode) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/scan'),
      headers: await _headers(),
      body: jsonEncode({'qr_code': qrCode}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal memverifikasi QR.');
    }
    return VerifyQRResult.fromJson(data);
  }

  /// POST /api/petugas/check-in
  static Future<CheckInResult> checkIn({
    required String pedagangId,
    String? catatan,
  }) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/check-in'),
      headers: await _headers(),
      body: jsonEncode({
        'pedagang_id': pedagangId,
        if (catatan != null && catatan.isNotEmpty) 'catatan': catatan,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mencatat check-in.');
    }
    return CheckInResult.fromJson(data);
  }

  /// GET /api/petugas/riwayat-scan
  static Future<List<RiwayatScanItem>> getRiwayatScan() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/riwayat-scan'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mengambil riwayat scan.');
    }
    return (data['riwayat'] as List<dynamic>? ?? [])
        .map((e) => RiwayatScanItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}