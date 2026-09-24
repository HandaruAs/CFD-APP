import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';

class PetugasDashboardDatasource {
  /// Laporan kehadiran HARI INI (tanpa startDate/endDate -> default
  /// backend = hari ini), limit 100 -- sama persis kayak dashboard web
  /// (`/api/petugas/laporan?limit=100`). Satu request ini udah cukup buat
  /// kartu Kehadiran, grafik Omset Hari Ini, dan daftar Pedagang Hari Ini.
  static Future<LaporanResponse> getLaporanHariIni() {
    return LaporanDatasource.getLaporan(limit: 100);
  }
}