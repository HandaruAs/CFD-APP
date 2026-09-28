import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/core/network/api_exception.dart';

/// Satu pintu buat semua request ke backend yang butuh login (Bearer
/// token). Semua datasource (menu, pedagang, petugas: operasional,
/// laporan, scan, sisa-lapak, dashboard) pakai ini -- gak ada lagi yang
/// manual ambil token & attach header sendiri-sendiri.
class ApiClient {
  static Future<Map<String, String>> _authHeaders() async {
    final token = await AuthRemoteDatasource.getToken();
    if (token == null) throw ApiException('User belum login');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  static Uri _uri(String path, [Map<String, String>? query]) {
    final full = Uri.parse('${ApiConfig.baseUrl}$path');
    return query == null ? full : full.replace(queryParameters: query);
  }

  /// Terima response yang body root-nya Map ATAU List (beberapa endpoint
  /// petugas -- sisa-lapak, instansi -- balikin array langsung di root,
  /// bukan dibungkus `{ data: [...] }`).
  static dynamic _handle(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final map = body is Map<String, dynamic> ? body : null;
      throw ApiException(
        map?['error'] as String? ?? 'Terjadi kesalahan (${res.statusCode}).',
        statusCode: res.statusCode,
        code: map?['code'] as String?,
      );
    }
    return body;
  }

  static Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await http.get(_uri(path, query), headers: await _authHeaders());
    return _handle(res);
  }

  static Future<dynamic> post(String path, {Object? body}) async {
    final res = await http.post(
      _uri(path),
      headers: await _authHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  static Future<dynamic> patch(String path, {Object? body}) async {
    final res = await http.patch(
      _uri(path),
      headers: await _authHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  static Future<dynamic> put(String path, {Object? body}) async {
    final res = await http.put(
      _uri(path),
      headers: await _authHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http.delete(_uri(path), headers: await _authHeaders());
    return _handle(res);
  }
}