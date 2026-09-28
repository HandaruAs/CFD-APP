import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';

/// Endpoint fitur Manajemen Lapak: Kecamatan, Jalan, Ruas & Kuota jadi
/// satu layar (sama kayak grup permission "penataan.manage" di backend).
/// Event/Laporan sengaja gak masuk sini -- beda konteks (permission
/// "jadwal.manage" & read-only), tetap jadi menu terpisah.
class ManajemenLapakDatasource {
  /// GET /api/admin/wilayah -> { data: [kecamatan -> jalan -> ruas] }
  /// (khusus role superadmin -- endpoint yang sama isinya kayak
  /// /api/petugas/manajemen-lapak/wilayah, cuma beda middleware akses).
  static Future<List<KecamatanLengkap>> getWilayah() async {
    final data = await ApiClient.get('/api/admin/wilayah');
    final list = data is Map<String, dynamic> ? data['data'] : null;
    if (list is! List) {
      throw ApiException('Format data wilayah tidak dikenal.');
    }
    return list.whereType<Map<String, dynamic>>().map(KecamatanLengkap.fromJson).toList();
  }

  /// POST /api/petugas/manajemen-lapak/ruas
  /// Urutan ruas ditentukan otomatis backend (urutan terakhir + 1 di
  /// jalan itu), jadi gak diinput dari sini.
  static Future<String> createRuas({
    required String jalanId,
    required String namaRuas,
    required int kuota,
  }) async {
    final data = await ApiClient.post(
      '/api/petugas/manajemen-lapak/ruas',
      body: {'jalanId': jalanId, 'namaRuas': namaRuas, 'kuota': kuota},
    );
    final id = data is Map<String, dynamic> ? data['id'] : null;
    return id?.toString() ?? '';
  }

  /// PUT /api/petugas/manajemen-lapak/ruas/:id
  static Future<void> updateRuas({
    required String id,
    required String namaRuas,
    required int kuota,
  }) async {
    await ApiClient.put(
      '/api/petugas/manajemen-lapak/ruas/$id',
      body: {'namaRuas': namaRuas, 'kuota': kuota},
    );
  }

  /// DELETE /api/petugas/manajemen-lapak/ruas/:id
  static Future<void> deleteRuas(String id) async {
    await ApiClient.delete('/api/petugas/manajemen-lapak/ruas/$id');
  }

  // -------------------------------------------------------- Kecamatan
  // CATATAN: backend cuma sediain Create & Delete buat kecamatan, gak
  // ada Update (rename) -- jadi gak ditambahin di UI.

  /// POST /api/petugas/manajemen-lapak/kecamatan
  static Future<String> createKecamatan(String namaKecamatan) async {
    final data = await ApiClient.post(
      '/api/petugas/manajemen-lapak/kecamatan',
      body: {'namaKecamatan': namaKecamatan},
    );
    final id = data is Map<String, dynamic> ? data['id'] : null;
    return id?.toString() ?? '';
  }

  /// DELETE /api/petugas/manajemen-lapak/kecamatan/:id
  static Future<void> deleteKecamatan(String id) async {
    await ApiClient.delete('/api/petugas/manajemen-lapak/kecamatan/$id');
  }

  // ------------------------------------------------------------ Jalan

  /// POST /api/petugas/manajemen-lapak/jalan
  static Future<String> createJalan({
    required String kecamatanId,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) async {
    final data = await ApiClient.post(
      '/api/petugas/manajemen-lapak/jalan',
      body: {
        'kecamatanId': kecamatanId,
        'kodeJalan': kodeJalan,
        'namaJalan': namaJalan,
        'kapasitas': kapasitas,
      },
    );
    final id = data is Map<String, dynamic> ? data['id'] : null;
    return id?.toString() ?? '';
  }

  /// PUT /api/petugas/manajemen-lapak/jalan/:id
  /// Kecamatan sengaja gak ikut diedit -- pindah kecamatan bukan bagian
  /// dari update ini (ngikutin desain backend), jalan tetap di
  /// kecamatan yang sama.
  static Future<void> updateJalan({
    required String id,
    required String kodeJalan,
    required String namaJalan,
    required int kapasitas,
  }) async {
    await ApiClient.put(
      '/api/petugas/manajemen-lapak/jalan/$id',
      body: {'kodeJalan': kodeJalan, 'namaJalan': namaJalan, 'kapasitas': kapasitas},
    );
  }

  /// DELETE /api/petugas/manajemen-lapak/jalan/:id
  static Future<void> deleteJalan(String id) async {
    await ApiClient.delete('/api/petugas/manajemen-lapak/jalan/$id');
  }
}