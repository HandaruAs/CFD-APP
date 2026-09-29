/// Role yang bisa dikelola superadmin dari menu Manajemen User.
/// [slug] dipakai buat path endpoint (/api/admin/users/{slug}) dan
/// query `?role=` di endpoint generik petugas/superadmin.
enum UserRole {
  pedagang('pedagang', 'Pedagang'),
  petugas('petugas', 'Petugas'),
  superadmin('superadmin', 'Superadmin');

  const UserRole(this.slug, this.label);

  final String slug;
  final String label;
}

String? _kosongJadiNull(dynamic v) {
  if (v is! String) return null;
  final s = v.trim();
  return s.isEmpty ? null : s;
}

/// Satu baris user di tabel Manajemen User. Bentuknya ngikutin
/// UserManagementDTO (petugas/superadmin) dan PedagangUserDTO (pedagang)
/// dari backend -- field bisnis (nik, namaUsaha, dst) cuma keisi buat
/// pedagang.
class ManagedUser {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String joinedAt;
  final bool active;
  final String initial;

  // Khusus pedagang
  final String? nik;
  final String? namaUsaha;
  final String? jenisDagangan;
  final String? jenisLapak;

  /// "lama" (ditambahkan admin/import) | "baru" (daftar sendiri). Null kalau
  /// backend belum ngirim field-nya.
  final String? statusPedagang;

  const ManagedUser({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.joinedAt,
    required this.active,
    required this.initial,
    this.nik,
    this.namaUsaha,
    this.jenisDagangan,
    this.jenisLapak,
    this.statusPedagang,
  });

  factory ManagedUser.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] as String?) ?? '';
    final initial = _kosongJadiNull(json['initial']) ??
        (name.isEmpty ? '?' : name.substring(0, 1).toUpperCase());

    return ManagedUser(
      id: json['id']?.toString() ?? '',
      name: name,
      email: (json['email'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      joinedAt: (json['joinedAt'] as String?) ?? '',
      active: json['active'] == true,
      initial: initial,
      nik: _kosongJadiNull(json['nik']),
      namaUsaha: _kosongJadiNull(json['namaUsaha']),
      jenisDagangan: _kosongJadiNull(json['jenisDagangan']),
      jenisLapak: _kosongJadiNull(json['jenisLapak']),
      statusPedagang: _kosongJadiNull(json['statusPedagang']),
    );
  }
}

/// Ringkasan jumlah user per status. Backend pedagang ngirim `pending`,
/// backend generik ngirim `banned` -- dua-duanya diabaikan di UI, yang
/// ditampilin cuma total / aktif / ditangguhkan.
class UserStats {
  final int total;
  final int active;
  final int suspended;

  const UserStats({
    required this.total,
    required this.active,
    required this.suspended,
  });

  factory UserStats.fromJson(Map<String, dynamic> json) => UserStats(
        total: (json['total'] as num?)?.toInt() ?? 0,
        active: (json['active'] as num?)?.toInt() ?? 0,
        suspended: (json['suspended'] as num?)?.toInt() ?? 0,
      );
}

class UserListResult {
  final List<ManagedUser> users;
  final int total;

  const UserListResult({required this.users, required this.total});

  factory UserListResult.fromJson(Map<String, dynamic> json) {
    final raw = json['users'];
    final users = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(ManagedUser.fromJson)
            .toList()
        : <ManagedUser>[];
    return UserListResult(
      users: users,
      total: (json['total'] as num?)?.toInt() ?? users.length,
    );
  }
}

/// Isi form tambah/edit user. Field yang gak relevan buat role tertentu
/// dibiarin kosong (mis. password cuma dipakai pas tambah).
class UserFormData {
  final String name;
  final String email;
  final String phone;
  final String password;
  final String nik;

  /// Format yyyy-mm-dd (sesuai validasi backend).
  final String tanggalLahir;
  final String namaUsaha;
  final String jenisDagangan;
  final String jenisLapak;

  const UserFormData({
    this.name = '',
    this.email = '',
    this.phone = '',
    this.password = '',
    this.nik = '',
    this.tanggalLahir = '',
    this.namaUsaha = '',
    this.jenisDagangan = '',
    this.jenisLapak = '',
  });
}