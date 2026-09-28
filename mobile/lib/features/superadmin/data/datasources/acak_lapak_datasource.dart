import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/superadmin/domain/entities/acak_lapak.dart';

/// Endpoint fitur Acak Lapak (nyiapin pool lokasi/slot lapak SEBELUM
/// pedagang klaim). Dipakai petugas dan superadmin -- yang dijaga
/// permission, bukan role.
class AcakLapakDatasource {
  /// GET /api/petugas/wilayah-saya
  static Future<WilayahSaya> getWilayahSaya() async {
    final data = await ApiClient.get('/api/petugas/wilayah-saya');
    if (data is! Map<String, dynamic>) {
      throw ApiException('Format data wilayah tidak dikenal.');
    }
    return WilayahSaya.fromJson(data);
  }

  /// GET /api/petugas/manajemen-lapak/wilayah -> { data: [kecamatan -> jalan -> ruas] }
  static Future<List<AcakKecamatan>> getWilayah() async {
    final data = await ApiClient.get('/api/petugas/manajemen-lapak/wilayah');
    final list = data is Map<String, dynamic> ? data['data'] : null;
    if (list is! List) {
      throw ApiException('Format data wilayah tidak dikenal.');
    }
    return list.whereType<Map<String, dynamic>>().map(AcakKecamatan.fromJson).toList();
  }

  /// POST /api/petugas/acak-lapak/generate-slot
  ///
  /// Idempotent di backend: klik ulang gak over-provision. Kalau
  /// [gantiPoolLama] true, slot lama yang BELUM diklaim dibuang dulu
  /// (yang sudah diklaim pedagang gak pernah dihapus).
  static Future<GenerateSlotResult> generateSlot({
    required AcakScope scope,
    String? kecamatanId,
    String? jalanId,
    String? ruasId,
    bool gantiPoolLama = false,
  }) async {
    final data = await ApiClient.post(
      '/api/petugas/acak-lapak/generate-slot',
      body: {
        'scope': scope.slug,
        if (scope == AcakScope.kecamatan) 'kecamatanId': kecamatanId,
        if (scope == AcakScope.jalan || scope == AcakScope.ruas) 'jalanId': jalanId,
        if (scope == AcakScope.ruas) 'ruasId': ruasId,
        'gantiPoolLama': gantiPoolLama,
      },
    );
    final hasil = data is Map<String, dynamic> ? data['data'] : null;
    if (hasil is! Map<String, dynamic>) {
      throw ApiException('Format respons acak lapak tidak dikenal.');
    }
    return GenerateSlotResult.fromJson(hasil);
  }
}