import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/user/domain/entities/managed_user.dart';

/// Endpoint Manajemen User (khusus superadmin).
///
/// Petugas & superadmin pakai endpoint generik (`?role=` wajib di list,
/// stats, dan create). Pedagang beda: controller sendiri, list-nya
/// balikin SEMUA pedagang tanpa search/page/status (jadi difilter di
/// sisi klien oleh notifier), dan update-nya ikut ngubah data usaha.
class UserRemoteDatasource {
  static String _base(UserRole role) => '/api/admin/users/${role.slug}';

  static Map<String, dynamic> _asMap(dynamic data, String pesan) {
    if (data is Map<String, dynamic>) return data;
    throw ApiException(pesan);
  }

  static Future<UserListResult> list(
    UserRole role, {
    String search = '',
    String status = '',
    int page = 1,
    int limit = 10,
  }) async {
    if (role == UserRole.pedagang) {
      final data = await ApiClient.get(_base(role));
      return UserListResult.fromJson(_asMap(data, 'Format data pedagang tidak dikenal.'));
    }

    final q = search.trim();
    final data = await ApiClient.get(
      _base(role),
      query: {
        'role': role.slug,
        'page': '$page',
        'limit': '$limit',
        if (q.isNotEmpty) 'search': q,
        if (status.isNotEmpty) 'status': status,
      },
    );
    return UserListResult.fromJson(_asMap(data, 'Format data user tidak dikenal.'));
  }

  static Future<UserStats> stats(UserRole role) async {
    final data = role == UserRole.pedagang
        ? await ApiClient.get('${_base(role)}/stats')
        : await ApiClient.get('/api/admin/users/stats', query: {'role': role.slug});
    return UserStats.fromJson(_asMap(data, 'Format statistik tidak dikenal.'));
  }

  /// Tambah user. Petugas & superadmin cukup 4 field (endpoint generik,
  /// `?role=` wajib). Pedagang lewat endpoint sendiri dan nuntut data
  /// usaha lengkap: NIK (16 digit), tanggal lahir (yyyy-mm-dd), nama
  /// usaha, jenis dagangan, jenis lapak.
  static Future<void> create(UserRole role, UserFormData f) async {
    final body = <String, dynamic>{
      'name': f.name.trim(),
      'email': f.email.trim(),
      'phone': f.phone.trim(),
      'password': f.password,
    };

    if (role == UserRole.pedagang) {
      await ApiClient.post(
        _base(role),
        body: {
          ...body,
          'nik': f.nik.trim(),
          'tanggal_lahir': f.tanggalLahir,
          'nama_usaha': f.namaUsaha.trim(),
          'jenis_dagangan': f.jenisDagangan,
          'jenis_lapak': f.jenisLapak,
        },
      );
      return;
    }

    await ApiClient.post('${_base(role)}?role=${role.slug}', body: body);
  }

  static Future<void> update(UserRole role, String id, UserFormData f) async {
    await ApiClient.put(
      '${_base(role)}/$id',
      body: {
        'name': f.name.trim(),
        'phone': f.phone.trim(),
        if (role == UserRole.pedagang) ...{
          'nama_usaha': f.namaUsaha.trim(),
          'jenis_dagangan': f.jenisDagangan,
          'jenis_lapak': f.jenisLapak,
        },
      },
    );
  }

  static Future<void> delete(UserRole role, String id) async {
    await ApiClient.delete('${_base(role)}/$id');
  }
}