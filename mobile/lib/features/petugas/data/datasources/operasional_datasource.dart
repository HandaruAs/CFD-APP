import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';

/// Endpoint Jam Operasional -- disamakan dengan yang dipanggil web
/// (web/app/admin/jam-operasional/page.tsx). Jadwal Mingguan & toggle
/// buka/tutup pendaftaran sudah gak dipakai lagi di web, jadi di sini
/// juga dihapus.
class OperasionalDatasource {
  static Future<StatusOperasional> getStatusOperasional() async {
    final data = await ApiClient.get('/api/petugas/jam-operasional');
    return StatusOperasional.fromJson(data as Map<String, dynamic>);
  }

  /// Atur jam sesi hari ini (bikin baru kalau belum ada, update kalau
  /// sudah -- backend yang nentuin insert vs update).
  static Future<void> simpanSesi({
    required String jamMulai,
    required String jamSelesaiRencana,
  }) async {
    await ApiClient.patch(
      '/api/petugas/jam-operasional/sesi',
      body: {
        'jamMulai': jamMulai,
        'jamSelesaiRencana': jamSelesaiRencana,
      },
    );
  }

  /// Buka sesi langsung sekarang (jam mulai = sekarang, selesai 23:59:59).
  static Future<void> bukaSesiManual() async {
    await ApiClient.patch('/api/petugas/jam-operasional/sesi/buka');
  }

  static Future<void> akhiriSesiLebihAwal() async {
    await ApiClient.patch('/api/petugas/jam-operasional/sesi/akhiri');
  }

  /// Simpan Kode Event. Endpoint-nya masih "pendaftaran" (kontrak lama),
  /// jadi isOpen/jamBuka/jamTutup/link dikirim balik APA ADANYA supaya
  /// gak ada yang ikut berubah -- cuma kodeEvent yang diganti.
  static Future<void> simpanKodeEvent({
    required PendaftaranStatus sekarang,
    required String kodeEvent,
  }) async {
    await ApiClient.patch(
      '/api/petugas/jam-operasional/pendaftaran',
      body: {
        'isOpen': sekarang.isOpen,
        'jamBuka': sekarang.jamBuka,
        'jamTutup': sekarang.jamTutup,
        'linkPendaftaran': sekarang.linkPendaftaran,
        'kodeEvent': kodeEvent,
      },
    );
  }
}