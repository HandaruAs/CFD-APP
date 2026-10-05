import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class LaporanDatasource {
  /// [startDate]/[endDate] format "yyyy-MM-dd". Kosongkan keduanya buat
  /// dapetin laporan hari ini (default backend). [eventId] kosong = semua event.
  static Future<LaporanResponse> getLaporan({
    String? startDate,
    String? endDate,
    String? eventId,
    String search = '',
    int page = 1,
    int limit = 20,
  }) async {
    final data = await ApiClient.get(
      '/api/petugas/laporan',
      query: {
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
        if (eventId != null && eventId.isNotEmpty) 'eventId': eventId,
        if (search.isNotEmpty) 'search': search,
        'page': '$page',
        'limit': '$limit',
      },
    );
    return LaporanResponse.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/petugas/laporan/stats -- angka kartu ringkasan (termasuk
  /// lapakTerisi yang akurat, bukan dihitung dari halaman yang tampil).
  static Future<StatsLaporan> getStats({
    String? startDate,
    String? endDate,
    String? eventId,
  }) async {
    final data = await ApiClient.get(
      '/api/petugas/laporan/stats',
      query: {
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
        if (eventId != null && eventId.isNotEmpty) 'eventId': eventId,
      },
    );
    return StatsLaporan.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/petugas/events -- pilihan event buat dropdown filter,
  /// mengikuti rentang tanggal.
  static Future<List<EventPilihan>> getEvents({
    required String startDate,
    required String endDate,
  }) async {
    final data = await ApiClient.get(
      '/api/petugas/events',
      query: {'startDate': startDate, 'endDate': endDate},
    );
    final list = (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
    return list.map((e) => EventPilihan.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// GET /api/petugas/laporan/:id -- detail satu kehadiran (modal detail).
  static Future<DetailKehadiran> getDetail(String kehadiranId) async {
    final data = await ApiClient.get('/api/petugas/laporan/$kehadiranId');
    return DetailKehadiran.fromJson(data as Map<String, dynamic>);
  }

  /// SEMUA baris sesuai filter (bukan cuma halaman yang lagi tampil) --
  /// buat export PDF/Excel, sama kayak fetchSemuaUntukExport() di web.
  static Future<LaporanResponse> getSemuaUntukExport({
    String? startDate,
    String? endDate,
    String? eventId,
    String search = '',
  }) {
    return getLaporan(
      startDate: startDate,
      endDate: endDate,
      eventId: eventId,
      search: search,
      page: 1,
      limit: 10000,
    );
  }
}