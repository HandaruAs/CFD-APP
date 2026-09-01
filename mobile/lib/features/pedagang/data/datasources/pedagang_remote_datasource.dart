import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';

class PedagangRemoteDatasource {
  static Future<Map<String, String>> _authHeaders() async {
    final token = await AuthRemoteDatasource.getToken();
    if (token == null) throw Exception('User belum login');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// GET /api/pedagang/pengajuan
  ///
  /// PENTING: backend SELALU balikin HTTP 200, gak pernah 404. Kalau
  /// pedagang belum pernah ajukan usaha, body-nya `{"has_pengajuan":
  /// false}` -- jadi yang jadi penentu itu flag `has_pengajuan`, BUKAN
  /// status code. Return null kalau belum ada pengajuan.
  static Future<PengajuanStatus?> getStatusPengajuan() async {
    final headers = await _authHeaders();
    final url = '${ApiConfig.baseUrl}/api/pedagang/pengajuan';

    final res = await http.get(Uri.parse(url), headers: headers);
    final data = jsonDecode(res.body);

    if (res.statusCode != 200) {
      final errorMsg = (data is Map ? data['error'] : null) as String? ??
          'Gagal mengambil status pengajuan.';
      throw Exception(errorMsg);
    }

    if (data is! Map<String, dynamic>) {
      throw Exception('Format respons status pengajuan tidak dikenal.');
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
    final headers = await _authHeaders();
    final url = '${ApiConfig.baseUrl}/api/pedagang/pengajuan';

    final res = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode({
        'nik': nik,
        'nama_lengkap': namaLengkap,
        'tanggal_lahir': tanggalLahir,
        'nama_usaha': namaUsaha,
        'jenis_dagangan': jenisDagangan,
        'jenis_lapak': jenisLapak,
      }),
    );

    if (res.statusCode != 200 && res.statusCode != 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final errorMsg = data['error'] as String? ?? 'Gagal mengirim pengajuan usaha.';
      throw Exception(errorMsg);
    }
  }

  /// GET /api/pedagang/checkout
  static Future<CheckoutData> getCheckoutData() async {
    final headers = await _authHeaders();
    final url = '${ApiConfig.baseUrl}/api/pedagang/checkout';

    final res = await http.get(Uri.parse(url), headers: headers);
    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Gagal mengambil data checkout.';
      throw Exception(errorMsg);
    }

    return CheckoutData.fromJson(data);
  }

  /// POST /api/pedagang/checkout
  static Future<void> submitCheckout(int omset) async {
    final headers = await _authHeaders();
    final url = '${ApiConfig.baseUrl}/api/pedagang/checkout';

    final res = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode({'omset': omset}),
    );

    if (res.statusCode != 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final errorMsg = data['error'] as String? ?? 'Gagal menyimpan checkout.';
      throw Exception(errorMsg);
    }
  }
}