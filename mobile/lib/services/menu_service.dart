import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/config/api_config.dart';
import 'package:mobile/models/menu_model.dart';
import 'package:mobile/services/auth_service.dart'; // Import untuk ambil token

class MenuService {
  /// Ambil daftar menu dinamis berdasarkan role user yang login.
  /// Ini endpoint /api/menus yang kamu punya di backend.
  static Future<List<MenuModel>> fetchUserMenus() async {
    final String? token = await AuthService.getToken();
    if (token == null) throw Exception('User belum login');

    final String url = '${ApiConfig.baseUrl}/api/menus';
    print("🚀 [MENU] Fetching menus from: $url");

    try {
      final res = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token', // Wajib kirim token!
        },
      );

      print("📬 [MENU] Status Code: ${res.statusCode}");
      print("📥 [MENU] Body: ${res.body}");

      if (res.statusCode != 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        throw Exception(data['error'] ?? 'Gagal mengambil menu.');
      }

      // Backend harus mengembalikan LIST JSON (bukan object)
      final List<dynamic> jsonList = jsonDecode(res.body) as List<dynamic>;
      
      // Ubah JSON List menjadi List<MenuModel>
      return jsonList.map((json) => MenuModel.fromJson(json)).toList();
      
    } catch (e) {
      print("❌ [MENU] ERROR fetching menus: $e");
      rethrow;
    }
  }
}