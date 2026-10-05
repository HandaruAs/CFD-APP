import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/event_hari_ini.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class PetugasDashboardDatasource {
  /// Laporan kehadiran HARI INI (tanpa startDate/endDate -> default
  /// backend = hari ini), limit 100 -- sama kayak dashboard web
  /// (`/api/petugas/laporan?limit=100`). Sumber kartu Kehadiran, grafik
  /// Omset Hari Ini, dan daftar Pedagang Hari Ini.
  static Future<LaporanResponse> getLaporanHariIni() {
    return LaporanDatasource.getLaporan(limit: 100);
  }

  /// GET /api/petugas/events/hari-ini -- semua event hari ini (sama dengan
  /// dashboard petugas di web). Menggantikan /api/petugas/jam-operasional
  /// (sistem sesi harian lama).
  static Future<List<EventHariIni>> getEventHariIni() async {
    final data = await ApiClient.get('/api/petugas/events/hari-ini');
    final list = data is Map<String, dynamic> ? data['data'] : null;
    if (list is! List) return const [];
    return list.whereType<Map<String, dynamic>>().map(EventHariIni.fromJson).toList();
  }
}