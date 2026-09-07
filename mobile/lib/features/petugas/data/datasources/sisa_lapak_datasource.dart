import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/sisa_lapak.dart';

class SisaLapakDatasource {
  static Future<Map<String, String>> _headers() async {
    final token = await AuthRemoteDatasource.getToken();
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  /// PENTING: response endpoint ini array JSON langsung di root
  /// ("[...]"), BUKAN "{ data: [...] }" kayak endpoint petugas lain --
  /// jadi gak bisa langsung di-cast ke Map kayak datasource lain.
  static Future<List<KecamatanData>> getSisaLapak() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/sisa-lapak'),
      headers: await _headers(),
    );

    if (res.statusCode != 200) {
      final err = jsonDecode(res.body) as Map<String, dynamic>;
      throw ApiException(err['error'] as String? ?? 'Gagal mengambil data sisa lapak.');
    }

    final data = jsonDecode(res.body) as List<dynamic>;
    return data.map((e) => KecamatanData.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<List<InstansiData>> getInstansi() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/sisa-lapak/instansi'),
      headers: await _headers(),
    );

    if (res.statusCode != 200) {
      final err = jsonDecode(res.body) as Map<String, dynamic>;
      throw ApiException(err['error'] as String? ?? 'Gagal mengambil data instansi.');
    }

    final data = jsonDecode(res.body) as List<dynamic>;
    return data.map((e) => InstansiData.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> createJalan({
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
    required String instansiId,
  }) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/sisa-lapak'),
      headers: await _headers(),
      body: jsonEncode({
        'kode_jalan': kodeJalan,
        'nama_jalan': namaJalan,
        'kapasitas': kapasitas,
        'instansi_id': instansiId,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal menambah jalan.');
    }
  }

  static Future<void> updateJalan({
    required String id,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) async {
    final res = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/sisa-lapak/$id'),
      headers: await _headers(),
      body: jsonEncode({
        'kode_jalan': kodeJalan,
        'nama_jalan': namaJalan,
        'kapasitas': kapasitas,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mengubah jalan.');
    }
  }

  static Future<void> deleteJalan(String id) async {
    final res = await http.delete(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/sisa-lapak/$id'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal menghapus jalan.');
    }
  }
}