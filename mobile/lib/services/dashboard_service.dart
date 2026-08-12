// lib/services/dashboard_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/config/api_config.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:mobile/models/dashboard_model.dart';

class DashboardService {
  /// Ambil data dashboard untuk pedagang
  static Future<PedagangDashboardData> fetchPedagangDashboard() async {
    final String? token = await AuthService.getToken();
    if (token == null) throw Exception('User belum login');

    // Sesuaikan URL ini dengan endpoint backend kamu
    final String url = '${ApiConfig.baseUrl}/api/pedagang/dashboard';
    print("🚀 [DASHBOARD] Fetching data from: $url");

    try {
      final res = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token', // Wajib!
        },
      );

      print("📬 [DASHBOARD] Status Code: ${res.statusCode}");
      print("📥 [DASHBOARD] Body: ${res.body}");

      if (res.statusCode != 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        throw Exception(data['error'] ?? 'Gagal mengambil data dashboard.');
      }

      final Map<String, dynamic> jsonData = jsonDecode(res.body);
      return PedagangDashboardData.fromJson(jsonData);

    } catch (e) {
      print("❌ [DASHBOARD] ERROR fetching data: $e");
      rethrow;
    }
  }
}