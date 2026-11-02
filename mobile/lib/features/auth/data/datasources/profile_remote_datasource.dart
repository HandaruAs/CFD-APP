import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';

class ProfileRemoteDatasource {
  /// Upload foto profil ke backend POST /api/me/foto
  /// [file] adalah file gambar yang dipilih dari gallery/camera
  /// Mengembalikan URL foto yang sudah tersimpan di server
  static Future<String> uploadProfilePhoto(File file) async {
    final token = await AuthRemoteDatasource.getToken();
    if (token == null) {
      throw ApiException('Belum login.');
    }

    final String url = '${ApiConfig.baseUrl}/api/me/foto';
    final request = http.MultipartRequest('POST', Uri.parse(url))
      ..headers['Authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath('foto', file.path));

    try {
      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw ApiException('Upload timeout setelah 30 detik'),
      );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode != 200) {
        throw ApiException(
          'Gagal upload foto: ${response.body}',
          statusCode: response.statusCode,
        );
      }

      // Parse response JSON dan extract avatar_url
      try {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final avatarUrl = json['avatar_url'] as String?;

        if (avatarUrl == null || avatarUrl.isEmpty) {
          throw ApiException('Response tidak memiliki avatar_url');
        }

        return avatarUrl;
      } catch (e) {
        throw ApiException('Error parse response: $e');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error upload foto: $e');
    }
  }
}
