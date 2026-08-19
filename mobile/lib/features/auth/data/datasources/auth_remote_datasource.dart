import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class AuthRemoteDatasource {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'cfd_token';

  static Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/register';

    final res = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 201) {
      final errorMsg = data['error'] as String? ?? 'Pendaftaran gagal.';
      throw ApiException(errorMsg);
    }
  }

  static Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/login';

    final res = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Login gagal.';
      throw ApiException(errorMsg);
    }

    final token = data['token'] as String;
    await _storage.write(key: _tokenKey, value: token);

    return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  static Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
  }
}