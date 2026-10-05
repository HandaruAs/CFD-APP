import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/petugas/domain/entities/scan_result.dart';

/// Check-in pedagang PER EVENT (sama dengan web /petugas/scan-qr).
/// Menggantikan endpoint lama /api/petugas/scan, /check-in, /riwayat-scan.
class ScanRemoteDatasource {
  static Map<String, dynamic> _data(dynamic res) {
    final d = res is Map<String, dynamic> ? res['data'] : null;
    if (d is! Map<String, dynamic>) throw ApiException('Format data scan tidak dikenal.');
    return d;
  }

  /// POST /api/petugas/event-checkin/periksa
  /// Hanya membaca: siapa pedagangnya, event & lokasinya, dan boleh
  /// di-check-in atau tidak. Belum mencatat apa-apa.
  static Future<PesertaScan> periksa(String qrCode) async {
    final res = await ApiClient.post('/api/petugas/event-checkin/periksa', body: {'qrCode': qrCode.trim()});
    return PesertaScan.fromJson(_data(res));
  }

  /// POST /api/petugas/event-checkin -- mencatat check-in.
  static Future<PesertaScan> checkIn(String pesertaId) async {
    final res = await ApiClient.post('/api/petugas/event-checkin', body: {'pesertaId': pesertaId});
    return PesertaScan.fromJson(_data(res));
  }

  /// GET /api/petugas/event-checkin/riwayat -- check-in petugas ini hari ini.
  static Future<List<RiwayatCheckIn>> riwayat() async {
    final res = await ApiClient.get('/api/petugas/event-checkin/riwayat');
    final list = res is Map<String, dynamic> ? res['data'] : null;
    if (list is! List) return const [];
    return list.whereType<Map<String, dynamic>>().map(RiwayatCheckIn.fromJson).toList();
  }
}