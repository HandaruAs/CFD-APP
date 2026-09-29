import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';
import 'package:mobile/core/network/api_exception.dart';  
export 'package:mobile/core/network/api_exception.dart';

class AuthRemoteDatasource {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'cfd_token';
  static const _roleKey = 'cfd_role';

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

    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.write(key: _roleKey, value: user.role);

    return user;
  }

  /// Ambil data user yang lagi login dari backend (GET /api/me), pakai
  /// token yang udah tersimpan. Dipakai buat auto-login (splash screen)
  /// dan buat mastiin role yang dipegang app selalu sesuai data terbaru
  /// dari server (bukan cuma dari response login yang mungkin udah basi).
  static Future<AuthUser> getMe() async {
    final token = await getToken();
    if (token == null) {
      throw ApiException('Belum login.');
    }

    final String url = '${ApiConfig.baseUrl}/api/me';

    final res = await http.get(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Gagal mengambil data user.';
      throw ApiException(errorMsg);
    }

    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.write(key: _roleKey, value: user.role);

    return user;
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /// Role yang tersimpan lokal dari login/getMe terakhir. Berguna buat
  /// keperluan cepat (mis. UI sementara) tanpa nunggu network call --
  /// tapi untuk keputusan navigasi/otorisasi yang penting, tetap pakai
  /// data dari getMe() yang fresh dari server.
  static Future<String?> getStoredRole() async {
    return await _storage.read(key: _roleKey);
  }

  // ============================================================
  // LUPA KATA SANDI (khusus pedagang, dipanggil dari LoginScreen)
  // Alurnya 3 langkah, sama seperti web /auth/forgot-password:
  //   1. forgotPassword -> backend kirim OTP 6 digit ke email
  //   2. verifyOtp      -> OTP ditukar jadi resetToken
  //   3. resetPassword  -> simpan kata sandi baru pakai resetToken
  // Semua ini TIDAK menyimpan apa pun ke secure storage -- user tetap
  // harus login lagi setelah kata sandinya diganti.
  // ============================================================

  /// Langkah 1: minta kode OTP dikirim ke [email].
  static Future<void> forgotPassword({required String email}) async {
    final String url = '${ApiConfig.baseUrl}/api/forgot-password';

    final res = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Gagal mengirim kode OTP.';
      throw ApiException(errorMsg, statusCode: res.statusCode);
    }
  }

  /// Langkah 2: cocokkan [otp]. Kalau benar, backend mengembalikan
  /// reset token yang dipakai di langkah 3.
  static Future<String> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/verify-otp';

    final res = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otp': otp}),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Kode OTP tidak valid.';
      throw ApiException(errorMsg, statusCode: res.statusCode);
    }

    return data['reset_token'] as String;
  }

  /// Langkah 3: simpan [password] baru pakai [resetToken] dari verifyOtp.
  static Future<void> resetPassword({
    required String resetToken,
    required String password,
  }) async {
    final String url = '${ApiConfig.baseUrl}/api/reset-password';

    final res = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'reset_token': resetToken, 'password': password}),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode != 200) {
      final errorMsg = data['error'] as String? ?? 'Gagal mengganti kata sandi.';
      throw ApiException(errorMsg, statusCode: res.statusCode);
    }
  }

  static Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _roleKey);
  }
}