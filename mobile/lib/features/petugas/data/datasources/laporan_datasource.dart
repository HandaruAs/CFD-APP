import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class LaporanDatasource {
  /// [startDate]/[endDate] format "yyyy-MM-dd". Kosongkan keduanya buat
  /// dapetin laporan hari ini (default backend).
  static Future<LaporanResponse> getLaporan({
    String? startDate,
    String? endDate,
    String search = '',
    int page = 1,
    int limit = 20,
  }) async {
    final data = await ApiClient.get(
      '/api/petugas/laporan',
      query: {
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
        if (search.isNotEmpty) 'search': search,
        'page': '$page',
        'limit': '$limit',
      },
    );
    return LaporanResponse.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/petugas/laporan/:id -- detail satu kehadiran (modal detail).
  static Future<DetailKehadiran> getDetail(String kehadiranId) async {
    final data = await ApiClient.get('/api/petugas/laporan/$kehadiranId');
    return DetailKehadiran.fromJson(data as Map<String, dynamic>);
  }

  /// SEMUA baris sesuai filter tanggal & pencarian (bukan cuma halaman
  /// yang lagi tampil) -- buat export PDF/Excel, sama kayak
  /// fetchSemuaUntukExport() di web (limit 10000).
  static Future<LaporanResponse> getSemuaUntukExport({
    String? startDate,
    String? endDate,
    String search = '',
  }) {
    return getLaporan(
      startDate: startDate,
      endDate: endDate,
      search: search,
      page: 1,
      limit: 10000,
    );
  }
}