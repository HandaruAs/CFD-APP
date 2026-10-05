import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/superadmin/data/datasources/manajemen_lapak_datasource.dart';
import 'package:mobile/features/superadmin/data/datasources/sesi_datasource.dart';
import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';
import 'package:mobile/features/superadmin/domain/entities/sesi.dart';

/// Semua sesi (aktif & riwayat). Aksi tulis (tambah, ubah jumlah, hapus)
/// cukup memanggil SesiDatasource lalu `ref.invalidate(sesiListProvider)`.
final sesiListProvider = FutureProvider.autoDispose<List<Sesi>>((ref) {
  return SesiDatasource.list();
});

/// Wilayah (kecamatan -> jalan -> ruas) untuk pilihan "Lokasi diundi dari".
final wilayahSesiProvider = FutureProvider.autoDispose<List<KecamatanLengkap>>((ref) {
  return ManajemenLapakDatasource.getWilayah();
});