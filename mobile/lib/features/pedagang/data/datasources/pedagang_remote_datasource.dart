import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart'; 
import 'package:mobile/features/pedagang/data/models/dashboard_model.dart';

class PedagangRemoteDatasource {
  /// Ambil data dashboard untuk pedagang
  static Future<PedagangDashboardData> fetchPedagangDashboard() async {
    final String? token = await AuthRemoteDatasource.getToken(); 
    if (token == null) throw Exception('User belum login');

    final String url = '${ApiConfig.baseUrl}/api/pedagang/dashboard';

    try {
      final res = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (res.statusCode != 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        throw Exception(data['error'] ?? 'Gagal mengambil data dashboard.');
      }

      final Map<String, dynamic> jsonData = jsonDecode(res.body);
      return PedagangDashboardData.fromJson(jsonData);

    } catch (e) {
      rethrow;
    }
  }
}