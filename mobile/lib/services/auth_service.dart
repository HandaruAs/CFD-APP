import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/config/api_config.dart';

// --- PERHATIKAN: Baris ini saya hapus karena dobel import ---
// import '../config/api_config.dart'; 
// ------------------------------------------------------------

/// Data user yang tersimpan setelah login/register berhasil.
/// Field-nya sengaja sama persis kayak LoginResponse.User di backend
/// (internal/models/auth.go) -- termasuk 'role' yang dipakai buat
/// nentuin layar mana yang ditampilkan setelah login.
class AuthUser {
  final String id;
  final String name;
  final String email;
  final String role;

  AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
    );
  }
}

/// Dilempar kalau backend balikin status non-2xx, isinya pesan error
/// dari field "error" di response JSON backend (lihat auth_handler.go).
class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'cfd_token';

  /// Register akun BARU
  static Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/register';
    print("🚀 [REGISTER] Mencoba request ke: $url");

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'password': password,
        }),
      );

      print("📬 [REGISTER] Status Code: ${res.statusCode}");
      print("📥 [REGISTER] Body Response: ${res.body}");

      final data = jsonDecode(res.body) as Map<String, dynamic>;

      if (res.statusCode != 201) {
        final errorMsg = data['error'] as String? ?? 'Pendaftaran gagal.';
        print("❌ [REGISTER] Error dari server: $errorMsg");
        throw ApiException(errorMsg);
      }
      print("✅ [REGISTER] Sukses!");
      
    } catch (e) {
      print("❌ [REGISTER] ERROR TIDAK TERDUGA (Koneksi/CORS dll):");
      print(e.toString());
      // Lempar kembali error agar UI tahu ada masalah
      rethrow; 
    }
  }

  /// Login
  static Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/login';
    print("🚀 [LOGIN] Mencoba request ke: $url");

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      print("📬 [LOGIN] Status Code: ${res.statusCode}");
      print("📥 [LOGIN] Body Response: ${res.body}");

      final data = jsonDecode(res.body) as Map<String, dynamic>;

      if (res.statusCode != 200) {
        final errorMsg = data['error'] as String? ?? 'Login gagal.';
        print("❌ [LOGIN] Error dari server: $errorMsg");
        throw ApiException(errorMsg);
      }

      final token = data['token'] as String;
      await _storage.write(key: _tokenKey, value: token);
      print("✅ [LOGIN] Sukses! Token tersimpan.");

      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);

    } catch (e) {
      print("❌ [LOGIN] ERROR TIDAK TERDUGA (Koneksi/CORS dll):");
      print(e.toString());
      // Lempar kembali error agar UI tahu ada masalah
      rethrow;
    }
  }

  /// Ambil token yang tersimpan
  static Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  static Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
  }
}