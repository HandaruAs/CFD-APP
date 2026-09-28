import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/sisa_lapak.dart';
import 'package:mobile/core/network/api_exception.dart';

class SisaLapakDatasource {
  /// PENTING: response endpoint ini array JSON langsung di root
  /// ("[...]"), BUKAN "{ data: [...] }" kayak endpoint petugas lain --
  /// ApiClient tetap aman karena _handle gak asumsiin bentuk body.
  static Future<List<KecamatanData>> getSisaLapak() async {
    final data = await ApiClient.get('/api/petugas/sisa-lapak');
    return (data as List<dynamic>)
        .map((e) => KecamatanData.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<InstansiData>> getInstansi() async {
    final data = await ApiClient.get('/api/petugas/sisa-lapak/instansi');
    return (data as List<dynamic>)
        .map((e) => InstansiData.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<void> createJalan({
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
    required String instansiId,
  }) async {
    await ApiClient.post(
      '/api/petugas/sisa-lapak',
      body: {
        'kode_jalan': kodeJalan,
        'nama_jalan': namaJalan,
        'kapasitas': kapasitas,
        'instansi_id': instansiId,
      },
    );
  }

  static Future<void> updateJalan({
    required String id,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) async {
    await ApiClient.put(
      '/api/petugas/sisa-lapak/$id',
      body: {
        'kode_jalan': kodeJalan,
        'nama_jalan': namaJalan,
        'kapasitas': kapasitas,
      },
    );
  }

  static Future<void> deleteJalan(String id) async {
    await ApiClient.delete('/api/petugas/sisa-lapak/$id');
  }
}