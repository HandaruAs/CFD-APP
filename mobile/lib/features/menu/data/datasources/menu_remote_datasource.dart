import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart'; // ✅ PERBAIKAN: Import yang benar

class MenuRemoteDatasource {
  /// Ambil daftar menu dinamis berdasarkan role user yang login.
  static Future<List<MenuModel>> fetchUserMenus() async {
    final String? token = await AuthRemoteDatasource.getToken(); // ✅ PERBAIKAN: AuthRemoteDatasource
    if (token == null) throw Exception('User belum login');

    final String url = '${ApiConfig.baseUrl}/api/menus';

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
        throw Exception(data['error'] ?? 'Gagal mengambil menu.');
      }

      final List<dynamic> jsonList = jsonDecode(res.body) as List<dynamic>;
      return jsonList.map((json) => MenuModel.fromJson(json)).toList();

    } catch (e) {
      rethrow;
    }
  }
}