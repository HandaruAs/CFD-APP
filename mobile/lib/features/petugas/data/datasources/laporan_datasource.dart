import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class LaporanDatasource {
  /// [startDate]/[endDate] format "yyyy-MM-dd". Kosongkan keduanya buat
  /// dapetin laporan hari ini (default backend).
  static Future<LaporanResponse> getLaporan({
    String? startDate,
    String? endDate,
    String search = '',
    int page = 1,
    int limit = 20,
  }) async {
    final token = await AuthRemoteDatasource.getToken();
    final query = {
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (search.isNotEmpty) 'search': search,
      'page': '$page',
      'limit': '$limit',
    };
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/petugas/laporan')
        .replace(queryParameters: query);

    final res = await http.get(uri, headers: {'Authorization': 'Bearer $token'});
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mengambil laporan.');
    }
    return LaporanResponse.fromJson(data);
  }
}