import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/jadwal_mingguan.dart';

class OperasionalDatasource {
  static Future<Map<String, String>> _headers() async {
    final token = await AuthRemoteDatasource.getToken();
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  static Future<StatusOperasional> getStatusOperasional() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(
        data['error'] as String? ?? 'Gagal mengambil status operasional.',
      );
    }
    return StatusOperasional.fromJson(data);
  }

  /// Set jam sesi hari ini (bikin baru kalau belum ada, update kalau
  /// udah -- backend yang nentuin insert vs update).
  static Future<SesiAktif> simpanSesi({
    required String jamMulai,
    required String jamSelesaiRencana,
  }) async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/sesi'),
      headers: await _headers(),
      body: jsonEncode({
        'jamMulai': jamMulai,
        'jamSelesaiRencana': jamSelesaiRencana,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal menyimpan sesi.');
    }
    return SesiAktif.fromJson(data['sesi'] as Map<String, dynamic>);
  }

  /// Buka sesi langsung sekarang tanpa isi jam manual (jam mulai =
  /// waktu sekarang, jam selesai default 23:59:59 -- lihat
  /// operasional_usecase.go BukaSesiManual).
  static Future<SesiAktif> bukaSesiManual() async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/sesi/buka'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal membuka sesi.');
    }
    return SesiAktif.fromJson(data['sesi'] as Map<String, dynamic>);
  }

  static Future<SesiAktif> akhiriSesiLebihAwal() async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/sesi/akhiri'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mengakhiri sesi.');
    }
    return SesiAktif.fromJson(data['sesi'] as Map<String, dynamic>);
  }

  /// Catatan bisnis dari backend: kalau hari ini Jumat, pengaturan
  /// pendaftaran cuma boleh diubah SEKALI (lihat ErrPendaftaranSudahDiubah
  /// di operasional_usecase.go). Di luar Jumat, bebas diubah kapan saja.
  static Future<void> updatePendaftaran({
    required bool isOpen,
    String? jamBuka,
    String? jamTutup,
    String? linkPendaftaran,
  }) async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/pendaftaran'),
      headers: await _headers(),
      body: jsonEncode({
        'isOpen': isOpen,
        'jamBuka': jamBuka,
        'jamTutup': jamTutup,
        'linkPendaftaran': linkPendaftaran,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(
        data['error'] as String? ?? 'Gagal memperbarui pengaturan pendaftaran.',
      );
    }
  }

  static Future<List<JadwalMingguan>> getJadwalMingguan() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/jadwal-mingguan'),
      headers: await _headers(),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(data['error'] as String? ?? 'Gagal mengambil jadwal mingguan.');
    }
    return (data['jadwal'] as List<dynamic>)
        .map((e) => JadwalMingguan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<JadwalMingguan> updateJadwalMingguan({
    required String hari,
    required String jamMulai,
    required String jamSelesaiRencana,
    required bool isActive,
  }) async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/api/petugas/jam-operasional/jadwal-mingguan'),
      headers: await _headers(),
      body: jsonEncode({
        'hari': hari,
        'jamMulai': jamMulai,
        'jamSelesaiRencana': jamSelesaiRencana,
        'isActive': isActive,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(
        data['error'] as String? ?? 'Gagal menyimpan jadwal mingguan.',
      );
    }
    return JadwalMingguan.fromJson(data['jadwal'] as Map<String, dynamic>);
  }
}