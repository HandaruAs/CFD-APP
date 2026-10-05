import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/superadmin/domain/entities/sesi.dart';

/// Endpoint Jam Operasional superadmin (sesi/event CFD) -- sama persis
/// dengan yang dipakai web /admin/jam-operasional.
class SesiDatasource {
  static List<dynamic> _list(dynamic data, String pesan) {
    final list = data is Map<String, dynamic> ? data['data'] : null;
    if (list is! List) throw ApiException(pesan);
    return list;
  }

  /// GET /api/admin/events -> semua sesi (aktif & riwayat).
  static Future<List<Sesi>> list() async {
    final data = await ApiClient.get('/api/admin/events');
    return _list(data, 'Format data sesi tidak dikenal.')
        .whereType<Map<String, dynamic>>()
        .map(Sesi.fromJson)
        .toList();
  }

  /// POST /api/admin/events -> sesi baru (status draft). Mengembalikan id.
  static Future<String> buat({
    required String nama,
    required String tanggal,
    required String jamMulai,
    required String jamSelesai,
    required int kuotaTotal,
    required int kuotaLama,
  }) async {
    final data = await ApiClient.post('/api/admin/events', body: {
      'nama': nama,
      'tanggal': tanggal,
      'jamMulai': jamMulai,
      'jamSelesai': jamSelesai,
      'kuotaTotal': kuotaTotal,
      'kuotaLama': kuotaLama,
    });
    final d = data is Map<String, dynamic> ? data['data'] : null;
    final id = d is Map<String, dynamic> ? d['id'] : null;
    if (id == null) throw ApiException('Sesi tersimpan tapi id-nya tidak terbaca.');
    return id.toString();
  }

  /// POST /api/admin/events/:id/acak-lokasi -> server mengundi SATU ruas
  /// dari cakupan yang dipilih.
  static Future<LokasiSesi?> acakLokasi(
    String id, {
    required CakupanUndian cakupan,
    List<String> pilihan = const [],
  }) async {
    final body = <String, dynamic>{'scope': cakupan.apiValue};
    if (cakupan == CakupanUndian.kecamatan) body['kecamatanIds'] = pilihan;
    if (cakupan == CakupanUndian.jalan) body['jalanIds'] = pilihan;
    if (cakupan == CakupanUndian.ruas) body['ruasIds'] = pilihan;

    final data = await ApiClient.post('/api/admin/events/$id/acak-lokasi', body: body);
    final d = data is Map<String, dynamic> ? data['data'] : null;
    final ditambahkan = d is Map<String, dynamic> ? d['ditambahkan'] : null;
    if (ditambahkan is List && ditambahkan.isNotEmpty && ditambahkan.first is Map<String, dynamic>) {
      return LokasiSesi.fromJson(ditambahkan.first as Map<String, dynamic>);
    }
    return null;
  }

  /// PATCH /api/admin/events/:id/status {aksi: terbitkan}
  static Future<void> terbitkan(String id) async {
    await ApiClient.patch('/api/admin/events/$id/status', body: {'aksi': 'terbitkan'});
  }

  /// PATCH /api/admin/events/:id/status {aksi: batalkan}
  static Future<void> batalkan(String id) async {
    await ApiClient.patch('/api/admin/events/$id/status', body: {'aksi': 'batalkan'});
  }

  /// DELETE /api/admin/events/:id (hanya untuk sesi tanpa pedagang).
  static Future<void> hapus(String id) async {
    await ApiClient.delete('/api/admin/events/$id');
  }

  /// PUT /api/admin/events/:id -- data lain dikirim apa adanya, yang
  /// berubah cuma jumlah pedagang & jatah pedagang lama.
  static Future<void> ubahJumlah(Sesi s, {required int kuotaTotal, required int kuotaLama}) async {
    await ApiClient.put('/api/admin/events/${s.id}', body: {
      'nama': s.nama,
      'tanggal': s.tanggalPendek,
      'jamMulai': s.jamMulai,
      'jamSelesai': s.jamSelesai,
      'pendaftaranBukaAt': s.pendaftaranBukaAt,
      'pendaftaranTutupAt': s.pendaftaranTutupAt,
      'lepasKuotaAt': s.lepasKuotaAt,
      'keterangan': s.keterangan,
      'kuotaTotal': kuotaTotal,
      'kuotaLama': kuotaLama,
    });
  }

  /// GET /api/admin/events/:id/peserta
  static Future<List<PesertaSesi>> peserta(String id) async {
    final data = await ApiClient.get('/api/admin/events/$id/peserta');
    return _list(data, 'Format data peserta tidak dikenal.')
        .whereType<Map<String, dynamic>>()
        .map(PesertaSesi.fromJson)
        .toList();
  }
}