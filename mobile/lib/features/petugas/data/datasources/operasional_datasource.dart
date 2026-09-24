import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/jadwal_mingguan.dart';
import 'package:mobile/core/network/api_exception.dart';

class OperasionalDatasource {
  static Future<StatusOperasional> getStatusOperasional() async {
    final data = await ApiClient.get('/api/petugas/jam-operasional');
    return StatusOperasional.fromJson(data as Map<String, dynamic>);
  }

  /// Set jam sesi hari ini (bikin baru kalau belum ada, update kalau
  /// udah -- backend yang nentuin insert vs update).
  static Future<SesiAktif> simpanSesi({
    required String jamMulai,
    required String jamSelesaiRencana,
  }) async {
    final data = await ApiClient.patch(
      '/api/petugas/jam-operasional/sesi',
      body: {
        'jamMulai': jamMulai,
        'jamSelesaiRencana': jamSelesaiRencana,
      },
    );
    return SesiAktif.fromJson(data['sesi'] as Map<String, dynamic>);
  }

  /// Buka sesi langsung sekarang tanpa isi jam manual (jam mulai =
  /// waktu sekarang, jam selesai default 23:59:59 -- lihat
  /// operasional_usecase.go BukaSesiManual).
  static Future<SesiAktif> bukaSesiManual() async {
    final data = await ApiClient.patch('/api/petugas/jam-operasional/sesi/buka');
    return SesiAktif.fromJson(data['sesi'] as Map<String, dynamic>);
  }

  static Future<SesiAktif> akhiriSesiLebihAwal() async {
    final data = await ApiClient.patch('/api/petugas/jam-operasional/sesi/akhiri');
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
    await ApiClient.patch(
      '/api/petugas/jam-operasional/pendaftaran',
      body: {
        'isOpen': isOpen,
        'jamBuka': jamBuka,
        'jamTutup': jamTutup,
        'linkPendaftaran': linkPendaftaran,
      },
    );
  }

  static Future<List<JadwalMingguan>> getJadwalMingguan() async {
    final data = await ApiClient.get('/api/petugas/jam-operasional/jadwal-mingguan');
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
    final data = await ApiClient.patch(
      '/api/petugas/jam-operasional/jadwal-mingguan',
      body: {
        'hari': hari,
        'jamMulai': jamMulai,
        'jamSelesaiRencana': jamSelesaiRencana,
        'isActive': isActive,
      },
    );
    return JadwalMingguan.fromJson(data['jadwal'] as Map<String, dynamic>);
  }
}