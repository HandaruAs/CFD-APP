import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/stats_kehadiran.dart';

class PetugasDashboardDatasource {
  /// Tanpa query params -> backend otomatis kasih stats hari ini.
  static Future<StatsKehadiran> getStatsHariIni() async {
    final token = await AuthRemoteDatasource.getToken();
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/laporan/stats'),
      headers: {'Authorization': 'Bearer $token'},
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(
        data['error'] as String? ?? 'Gagal mengambil statistik kehadiran.',
      );
    }
    return StatsKehadiran.fromJson(data);
  }
}