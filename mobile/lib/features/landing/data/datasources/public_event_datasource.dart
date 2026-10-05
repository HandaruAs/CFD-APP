import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/landing/domain/entities/event_publik.dart';

/// Endpoint publik untuk halaman beranda -- TIDAK butuh login, jadi tidak
/// lewat ApiClient (ApiClient selalu minta token).
class PublicEventDatasource {
  PublicEventDatasource._();

  /// GET /api/public/sisa-lapak
  static Future<List<EventPublik>> sisaLapak() async {
    final res = await http
        .get(Uri.parse('${ApiConfig.baseUrl}/api/public/sisa-lapak'))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException('Gagal memuat data sisa lapak.', statusCode: res.statusCode);
    }
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    final data = body is Map<String, dynamic> ? body['data'] : null;
    if (data is! List) return const [];
    return data.whereType<Map<String, dynamic>>().map(EventPublik.fromJson).toList();
  }
}